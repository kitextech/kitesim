// three.js
import * as THREE from 'three'
import { Vector3, Quaternion, Euler } from 'three'
import { Kite, kiteProp, AttachmentPointState} from "./kite"
import { Key, updateDescriptionUI, Pause, PID, PointOnSphere } from './util'
import { Tether, tetherProperties, TetherProperties } from './tether'
import { PathFollow } from './pathFollow'

import * as OrbitControlsLibrary from 'three-orbit-controls'
let OrbitControls = OrbitControlsLibrary(THREE)

import { mcAttitude, MCAttitude } from './mcAttitude'
import { mcPosition, MCPosition } from './mcPosition'
import { FWAttitude } from './fwAttitude'
import { VTOL } from './vtol'


// Pathfollowing 
enum FlightMode {
    Position,
    TransitionForward,
    PathFollow,
    TransitionBackward
}

export class FlightModeController {
    pf: PathFollow
    mcAttitude: MCAttitude = mcAttitude
    mcPosition: MCPosition = mcPosition
    fwAttitude: FWAttitude = new FWAttitude()
    vtol: VTOL = new VTOL()
    // velocity PID
    velocityPID = new PID(0.5, 0, 0.00, 100)
    velocitySp = 25
    
    attitudeSPHelper = new THREE.AxisHelper( 10 )
    momentArrow = new THREE.ArrowHelper( new Vector3(1,0,0), new Vector3(0,0,0), 1, 0xffff00)

    mode: FlightMode = FlightMode.Position 

    constructor(readonly kite: Kite, readonly scene: THREE.Scene) {
        this.pf = new PathFollow( new PointOnSphere(0, 30), 20, 40, this.kite.rudder, scene)

        scene.add(this.attitudeSPHelper)

        // visual helper on kite
        kite.obj.add(this.momentArrow)

    }

    update(dt: number) {
        this.vtol.updateRatio(dt)
    }

    getMoment(dt: number) {
        var moment = new Vector3()

        switch (this.mode) {
            case FlightMode.Position:
                var attitudeSP = this.mcPosition.getAttiude( new PointOnSphere(40,10), this.kite.velocity, this.kite.obj.position, dt)
                var ratesSP = this.mcAttitude.getRatesSP( this.kite.obj.quaternion, attitudeSP, this.kite.angularVelocity, dt )
                moment = mcAttitude.getMomentsRates(this.kite.angularVelocity, ratesSP, dt)

                //visualisation
                this.attitudeSPHelper.setRotationFromQuaternion(attitudeSP)
                var kp = this.kite.obj.position
                this.attitudeSPHelper.position.set(kp.x, kp.y, kp.z)

                break;

            case FlightMode.TransitionForward:
                var attitudeSP = this.vtol.getAttitudeForward(this.kite.obj.quaternion, this.kite.obj.position)
                var ratesSP = this.mcAttitude.getRatesSP( this.kite.obj.quaternion, attitudeSP, this.kite.angularVelocity, dt )
                moment = mcAttitude.getMomentsRates(this.kite.angularVelocity, ratesSP, dt).multiplyScalar(1-this.vtol.getRatio())    
                
                var angle = this.fwAttitude.getRudderAngle(ratesSP.x, this.kite.angularVelocity.x, dt)
                var angle = Math.max(-16, Math.min(16, angle))

                this.kite.rudder.mesh.setRotationFromEuler( new Euler(0, - Math.PI / 2, (-angle - 8) / 180 * Math.PI, 'XYZ') )

                                //visualisation
                this.attitudeSPHelper.setRotationFromQuaternion(attitudeSP)
                var kp = this.kite.obj.position
                this.attitudeSPHelper.position.set(kp.x, kp.y, kp.z)
                break;

            case FlightMode.PathFollow:
                // the pathfllowing algorithm will adjust the rudder give the input. It's currently turned on by toggleing 'q'
                var rotationRate = this.pf.updateGetRotationRate(this.kite.obj.position.clone(), this.kite.velocity.clone()) // internally mofified the rudder angle
                var angle = this.fwAttitude.getRudderAngle(rotationRate, this.kite.angularVelocity.x, dt)
                var angle = Math.max(-16, Math.min(16, angle))

                this.kite.rudder.mesh.setRotationFromEuler( new Euler(0, - Math.PI / 2, (-angle - 8) / 180 * Math.PI, 'XYZ') )

                break;
            case FlightMode.TransitionBackward:
                this.mode = FlightMode.Position
                break;

            default:
                break;
        }
        
        // temporary for logging
        this.momentArrow.setDirection(moment.clone().normalize())
        this.momentArrow.setLength(moment.length()*10)
   
        return moment.max(new Vector3(-6,-6, -1)).min( new Vector3(6, 6, 1))
    }

    adjustThrust(dt: number) {
        switch (this.mode) {
            case FlightMode.Position:
                this.kite.setThrust( 
                    this.mcPosition.getThrust( 
                        new PointOnSphere(30, 10), 
                        this.kite.velocity, 
                        this.kite.obj.position, 
                        dt ) 
                    ) 
                break;

            case FlightMode.TransitionForward:
                this.kite.setThrust( this.vtol.getThrust() )
                break;

            case FlightMode.PathFollow:
                let pidresult = this.velocityPID.update( this.velocitySp - this.kite.velocity.length() , dt)
                this.kite.adjustThrustBy( pidresult )

                break;
            case FlightMode.TransitionBackward:
                this.mode = FlightMode.Position
                break;

            default:
                break;
        }

    }

    toggleMode() {
        switch (this.mode) {
            case FlightMode.Position:
                this.mode = FlightMode.TransitionForward
                this.vtol.start(this.kite.obj.quaternion, this.kite.thrust)
                break;
            case FlightMode.TransitionForward:
                this.mode = FlightMode.PathFollow
                this.pf.start()
                break;
            case FlightMode.PathFollow:
                this.pf.stop()
                this.mode = FlightMode.TransitionBackward
                break;
            case FlightMode.TransitionBackward:
                this.mode = FlightMode.Position
                break;
            default:
                break;
        }
    }
}