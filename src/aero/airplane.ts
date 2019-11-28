
import { Group, Quaternion, Vector3, Euler, Matrix3, AxesHelper, ArrowHelper, Mesh, MeshLambertMaterial, ExtrudeGeometry, Shape} from "three";
import { Airfoil } from "./aeroData";
import { AeroSurface, AeroSurfaceOptions } from "./aeroSurface"
import { GRAVITY } from "../other/constants";
import { ForceMoment, Loggable, Logger } from "../other/util";
import * as THREE from 'three'


export interface AttachmentPointForces {
    point1: Vector3
    point2: Vector3
  }

export class AttachmentPointState {
    constructor(readonly pos: Vector3, readonly vel: Vector3) { }
  }

export interface AirplaneOptions {
	aeroSurfaces: { [s:string]: AeroSurfaceOptions}
    mass?: number
    J?: number[]
    maxThrust?: number,
    maxMoment?: number,
    AP1?: Vector3,
    AP2?: Vector3
}

function rad(deg: number) {
    return deg*Math.PI/180
}

function airplaneOptionsTypeCheck(obj: any): obj is AirplaneOptions {
    if ((obj as AirplaneOptions).aeroSurfaces) {
        return true
    } else {
        return false
    }
}

export function reciever(key: string, v: any) {
    if (v instanceof Object && "x" in v && "y" in v && "z" in v) {
        return new Vector3(v.x, v.y, v.z)
    }
    if (v instanceof Object && "_x" in v && "_y" in v && "_z" in v && "_w" in v) {
        return new Quaternion(v._x, v._y, v._z, v._w)
    }
    if (v instanceof Object && "_x" in v && "_y" in v && "_z" in v && "_order" in v) {
        return new Quaternion().setFromEuler(new Euler(rad(v._x), rad(v._y), rad(v._z), v._order))
    }
    if (key == "airfoil" && "symmetric" in v) {
        return v.symmetric ? new Airfoil(true) : new Airfoil(false) 
    }
    return v
}

export function airplaneOptionsFromJSON(json: string): AirplaneOptions {
    
    let obj = JSON.parse(json, reciever)

    if (!airplaneOptionsTypeCheck(obj)) {
        throw "airplaneOptions Doesn't conform";
    }

    return obj
}


export let KX40: AirplaneOptions = {
    aeroSurfaces: {
        right: {
            airfoil: new Airfoil(false),
            cord: 0.8,
            thickness: 0.1,
            span: 4,
            position: new Vector3(0,2,0),
            orientation: new Quaternion().setFromEuler(new Euler(0, rad(100), rad(180), "ZYX")),
            vis: {
                mesh: true, 
            }
        },
        left: {
            airfoil: new Airfoil(false),
            cord: 0.8,
            thickness: 0.1,
            span: 4,
            position: new Vector3(0,-2,0),
            orientation: new Quaternion().setFromEuler(new Euler(0, rad(100), rad(180), "ZYX")),
            vis: {
                mesh: true, 
            }
        },
        verticalR: {
            airfoil: new Airfoil(true),
            cord: 0.8,
            thickness: 0.04,
            span: 4.2,
            position: new Vector3(0,2,0),
            orientation: new Quaternion().setFromEuler(new Euler(rad(-90), 0, rad(90))),
            vis: {
                mesh: true, 
            }
        },
        verticalL: {
            airfoil: new Airfoil(true),
            cord: 0.8,
            thickness: 0.04,
            span: 4.2,
            position: new Vector3(0,-2,0),
            orientation: new Quaternion().setFromEuler(new Euler(rad(-90), 0, rad(90))),
            vis: {
                mesh: true, 
            }
        },
        elevator: {
            airfoil: new Airfoil(true),
            cord: 0.6, // real value 0.22 
            thickness: 0.08,
            span: 3.2,
            position: new Vector3(0,0,3.4),   
            orientation: new Quaternion().setFromEuler(new Euler(0, rad(90), 0)),
            rotationVector: new Vector3(0,1,0),
            vis: {
                mesh: true, 
            }
        },
        rudder: {
            airfoil: new Airfoil(true),
            cord: 0.4,
            thickness: 0.08,
            span: 2.20,
            position: new Vector3(0,0,3.2),
            orientation: new Quaternion().setFromEuler(new Euler(rad(-90), 0, rad(90))), // -103
            rotationVector: new Vector3(1,0,0),
            vis: {
                mesh: true, 
                coord: true
            }
        }
    },
    mass: 50.0,
    J: [300.564, 0, 0,
        0, 100.625, 0, 
        0, 0, 200.614],
    AP1: new Vector3(0,3,0),
    AP2: new Vector3(0,-3,0),    
    maxThrust: 1200,
    maxMoment: 600
}
 
 
export class Airplane extends Group implements Loggable {

    
    rotationRate_FRD: Vector3 = new Vector3()
    velocity_NED: Vector3 = new Vector3(0,0,0)
    mass: number = 1
    maxThrust: number = 30 // N  default value
    maxMoment: number = 6 // Nm default  value
    Jinv: Matrix3
    thrust: number  = 0.3 // normalized starting value
    attachmentPoint1 = new Vector3(0,1,0);
    attachmentPoint2 = new Vector3( 0,-1,0); 
    external_mass = 0 // 

    aeroSurfaces: { [s:string]: AeroSurface} = {}

    arrowHelperX = new ArrowHelper( new Vector3())

    constructor(config: AirplaneOptions) {
        super()

        Logger.getInstance().addLoggable(this, "plane.p.x", "plane.p.y", "plane.p.z", "plane.power", "plane.velocity")

        let coord = new AxesHelper(3)
        this.add(coord)

        for (const [name, aeroSurfaceOption] of Object.entries(config.aeroSurfaces)) {
            this.aeroSurfaces[name] = new AeroSurface(aeroSurfaceOption, name)
            this.add(this.aeroSurfaces[name]) // for visualisation
        }

        if (config.mass != undefined) { this.mass = config.mass}
        if (config.maxThrust != undefined)  { this.maxThrust = config.maxThrust }
        if (config.maxMoment != undefined)  { this.maxMoment = config.maxMoment }
        if (config.AP1 != undefined)  { this.attachmentPoint1 = config.AP1 }
        if (config.AP2 != undefined)  { this.attachmentPoint2 = config.AP2 }

        var J = new Matrix3()
        let Jarray = (config.J !== undefined) ? config.J : [0.15, 0, 0, 0, 0.05, 0, 0, 0, 1.15]
        J.set.apply(J, Jarray);
        this.Jinv = new Matrix3().getInverse(J, true)

        this.arrowHelperX.setColor( 0xffffff )
        this.add(this.arrowHelperX)

        let r = 0.5, height = 0.1
        let geometry = new THREE.CylinderGeometry( r, r, height, 12 );
        let material = new THREE.MeshBasicMaterial( {color: 0xEEEEEE, opacity: 0.3, transparent: true} );
        let posY = [-3,-1,1,3]
        posY.forEach( y =>  {
            let rotorDisk = new THREE.Mesh( geometry, material ).rotateX(Math.PI/2)
            rotorDisk.position.setY(y)
            rotorDisk.position.setZ(-0.5)

            
            this.add( rotorDisk )
        })

        r = 0.1, height = 4.2
        geometry = new THREE.CylinderGeometry( r, r, height, 6 );
        material = new THREE.MeshBasicMaterial( {color: 0xEE0000} );
        
        posY = [0]
        posY.forEach( y =>  {
            let fuselarge = new THREE.Mesh( geometry, material ).rotateX(Math.PI/2)
            // rotorDisk.position.setY(y)
            fuselarge.position.setZ(1)

            
            this.add( fuselarge )
        })
        
    }

    // temporary
    setThrust(thrust: number) {
        this.thrust = thrust
    }

    adjustThrustBy(adjustment: number) {
        this.thrust += adjustment
    }

    getAttachmentPointsState(): AttachmentPointState[] {
        function attactmentPointState(attactmentPoint: Vector3) {
          return new AttachmentPointState(
            this.position.clone().add(attactmentPoint.clone().applyQuaternion(this.quaternion)),
            this.velocity_NED.clone().add(attactmentPoint.clone().cross(this.rotationRate_FRD).multiplyScalar(-1).applyQuaternion(this.quaternion))
          ) 
        }
        return [ attactmentPointState.call(this, this.attachmentPoint1), attactmentPointState.call(this, this.attachmentPoint2) ]
    }


    getForceMomentAttachment(apf_NED: AttachmentPointForces) : ForceMoment {
        let q_NED_FRD = this.quaternion.clone().conjugate()

        let f1 = apf_NED.point1.clone().applyQuaternion(q_NED_FRD)
        let f2 = apf_NED.point2.clone().applyQuaternion(q_NED_FRD)

        let m1 = this.attachmentPoint1.clone().cross(f1)
        let m2 = this.attachmentPoint2.clone().cross(f2)

        return new ForceMoment( f1.add(f2), m1.add(m2))
    }

    update(dt: number, freeStreamWind_NED: Vector3, efm_FRD: ForceMoment) {
        
        let q_NED_FRD = this.quaternion.clone().conjugate()
        
       
        let apparentWind_NED = freeStreamWind_NED.clone().sub(this.velocity_NED)
        let apparentWind_FRD = apparentWind_NED.applyQuaternion(q_NED_FRD)

        if (true) {
            this.arrowHelperX.setDirection( new Vector3(0,0, -1*Math.sign(this.thrust) ) )
            this.arrowHelperX.setLength( Math.abs( this.maxThrust * this.thrust ))
        }
 

        let forceMoment_FRD = Object.values(this.aeroSurfaces).map( surf => {
            return surf.forceMoment(apparentWind_FRD, this.rotationRate_FRD)
        }).reduce( (prev, cur) => {
            return prev.add(cur)
        }, new ForceMoment(
            new Vector3(0,0, -this.maxThrust * this.thrust)
                .add( efm_FRD.force ),
                efm_FRD.moment
            )
        )

        // Aircraft AERODYNAMICS

        // Total aero forces
        var angularAcceleration = forceMoment_FRD.moment.clone().applyMatrix3(this.Jinv)
        this.rotationRate_FRD.add(angularAcceleration.multiplyScalar(dt))
        this.rotateOnAxis( this.rotationRate_FRD.clone().normalize(), this.rotationRate_FRD.length() * dt )

        // update Aircraft position
        let F_NED = forceMoment_FRD.force.clone().applyQuaternion(this.quaternion)
        let acceleration = F_NED.divideScalar(this.mass + this.external_mass) .add(GRAVITY)
        this.velocity_NED.add(acceleration.multiplyScalar(dt))
        this.position.add(this.velocity_NED.clone().multiplyScalar(dt))
    }

    getValues(): number[]  {
        let  power  = this.velocity_NED.length() * (-this.maxThrust) * this.thrust
        return this.position.toArray().concat([power, this.velocity_NED.length()])
    }

}