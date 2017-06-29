// KITE
import { Object3D, Mesh, Vector3, Matrix3, CylinderGeometry, MeshLambertMaterial, ExtrudeGeometry, Shape } from 'three'
import { AeroSurface, AeroSurfaceRotating } from "./AeroSurface"
import * as C from "./Constants" 

export class AttachmentPointState {
  constructor(readonly pos: Vector3, readonly vel: Vector3) { }
}

export interface KiteTetherForces {
  spring1: Vector3
  spring2: Vector3
  drag1: Vector3
  drag2: Vector3
}

export interface WingProperties {
    cord: number
    thickness: number
    span: number
    sym: boolean
    area?: number
    position?: Vector3 
}

interface FuselargeProp {
  diameter: number
  frontLength: number
  rearLength: number
}

export interface KiteProperties {
  wing: WingProperties
  vWing: WingProperties
  rudder: WingProperties
  elevator: WingProperties
  fuselarge: FuselargeProp
  mass: number
  J: Matrix3
}

export var kiteProp: KiteProperties = {
  wing: {
    cord: 0.1,
    thickness: 0.02,
    span: 1.4,
    sym: false,
  },

  vWing : {
    cord: 0.1,
    thickness: 0.02,
    span: 0.8,
    sym: false
  },

  rudder: {
    thickness : 0.01,
    cord : 0.06,
    span : 0.6,
    sym : true
  },

  elevator: {
    thickness : 0.01,
    cord : 0.06,
    span : 0.6,
    sym : true
  },

  fuselarge: {
    diameter : 0.01,
    frontLength : 0.4,
    rearLength : 0.7
  },

  mass: 1.5,
  J: generateJ(),
}

function generateJ() {
   // Moment of Inertia kite
    var JkiteX = 0.15
    var JkiteY = 0.05
    var JkiteZ = 0.15

    var J = new Matrix3()
    // J.set( 11, 12, 13,
    //        21, 22, 23,
    //        31, 32, 33 );
    return J.set( JkiteX, 0, 0,
          0, JkiteY, 0,
          0, 0, JkiteZ );
}

function addAreaCalculation(obj: WingProperties, NWings: number) {
  obj.area = obj.cord * obj.span * NWings
}
addAreaCalculation(kiteProp.wing, 1)
addAreaCalculation(kiteProp.vWing, 2)
addAreaCalculation(kiteProp.rudder, 1)
addAreaCalculation(kiteProp.elevator, 1)

export class Force {
  readonly positionLocal?: Vector3 = null
  constructor(readonly force: Vector3, positionLocal: Vector3 = null) {
    this.positionLocal = positionLocal
  }
}

export class Kite {
  obj: Object3D
  wing: AeroSurface
  vWing: AeroSurface
  elevator: AeroSurfaceRotating
  rudder: AeroSurfaceRotating
  fuselarge: Mesh

  tetherAttachmentPoint1: Vector3
  tetherAttachmentPoint2: Vector3

  Jinv: Matrix3
  angularVelocity: Vector3
  velocity: Vector3
  mass: number
  
  thrust = new Vector3(0, 0, -25) // N
  thrustMax = new Vector3( 0, 0, -35) // N
  thrustMin = new Vector3( 0, 0, 0) // N

  constructor(prop: KiteProperties) {
    this.obj = new Object3D(); //create an empty container

    this.wing = new AeroSurface(this.createWing(prop.wing), prop.wing,
        function(v) { return new Vector3(v.z, 0, -v.x) },
        function(v) { return new Vector3(v.x, 0, v.z) }
    )

    this.vWing = new AeroSurface(this.createVerticalWings(prop.vWing), prop.vWing,
        function(v) { return new Vector3(0, v.z, -v.y) },
        function(v) { return new Vector3(0, v.y, v.z) }
    ) 
    
    prop.elevator.position = new Vector3(0, 0, prop.fuselarge.rearLength-prop.elevator.cord)
    this.elevator = new AeroSurfaceRotating( this.createElevator(prop.elevator, prop.fuselarge), prop.elevator,
        function(v) { return new Vector3(v.z, 0, -v.x) },
        function(v) { return new Vector3(v.x, 0, v.z) }
    )

    prop.rudder.position = new Vector3(0, 0, prop.fuselarge.rearLength)
    this.rudder = new AeroSurfaceRotating(this.createRudder(prop.rudder, prop.fuselarge), prop.rudder,
        function(v) { return new Vector3(0, v.z, -v.y) },
        function(v) { return new Vector3(0, v.y, v.z) }
    )
    
    this.createFuselarge(prop.fuselarge)

    this.tetherAttachmentPoint1 = new Vector3(0, prop.wing.span/2, 0)
    this.tetherAttachmentPoint2 = new Vector3(0, -prop.wing.span/2, 0)


    this.Jinv = new Matrix3().getInverse(prop.J, function() {
      alert('No Inverse')
    } )

    this.mass = prop.mass
    this.angularVelocity = new Vector3( 0, 0, 0 )
    this.velocity = new Vector3( 0, 0, 0)
  }

  updateKitePositionAndForces(dt, ktf: KiteTetherForces, externalMass: number) {
    let forces = [
      new Force(ktf.spring1, this.tetherAttachmentPoint1),
      new Force(ktf.spring2, this.tetherAttachmentPoint2),
      new Force(ktf.drag1),
      new Force(ktf.drag2)
    ]
    this.updateKitePositionAndForcesGeneral(dt, forces, externalMass)
  }

  updateKitePositionAndForcesGeneral(dt, externalForces: Force[], externalMass: number) {
    //
    // KITE AERODYNAMICS
    //
    let apKiteWorld = C.WIND.clone().sub(this.velocity)
    let apKiteKite = apKiteWorld.clone().applyQuaternion(this.obj.getWorldQuaternion().conjugate())

    this.wing.update(apKiteWorld, apKiteKite)
    this.vWing.update(apKiteWorld, apKiteKite)
    this.elevator.update(apKiteWorld, apKiteKite, this)
    this.rudder.update(apKiteWorld, apKiteKite, this)

    // Total aero forces
    let aeroForcesKite = new Vector3() 
      .add(this.wing.lift)
      .add(this.wing.drag)
      .add(this.vWing.lift)
      .add(this.vWing.drag)
      .add(this.elevator.totalAero)
      .add(this.rudder.totalAero)

    // moments and rotation of kite
    var momentsKite = this.elevator.prop.position.clone().cross(this.elevator.totalAero)
      .add(this.rudder.prop.position.clone().cross(this.rudder.totalAero))

    for (let force of externalForces) {
      if (force.positionLocal) {
        let forceLocal = force.force.clone().applyQuaternion( this.obj.quaternion.clone().conjugate() )
        momentsKite.add( force.positionLocal.clone().cross(forceLocal) )
      }
    }
    
    var angularAcceleration = momentsKite.clone().applyMatrix3(this.Jinv)//.setComponent(0, 0).setComponent(1, 0)
    this.angularVelocity.add(angularAcceleration.multiplyScalar(dt))

    this.obj.rotateOnAxis( this.angularVelocity.clone().normalize(), this.angularVelocity.length() * dt )

    // update kite tether and position
    let FKite = aeroForcesKite.clone().applyQuaternion(this.obj.quaternion)
      .add(this.thrust.clone().applyQuaternion(this.obj.quaternion))
    
    for (let force of externalForces) {
      FKite.add(force.force)
    }   

    let accelerationKite = FKite.divideScalar(this.mass + externalMass).add(C.GRAVITY)
    this.velocity.add(accelerationKite.multiplyScalar(dt))
    this.obj.position.add(this.velocity.clone().multiplyScalar(dt))
  }

  adjustThrustBy(delta: number) {
    this.thrust.add( new Vector3(0, 0, delta) ).max(this.thrustMax).min(this.thrustMin)
  }

  getAttachmentPointsState(): AttachmentPointState[] {
    function attactmentPointState(attactmentPoint: Vector3) {
      return new AttachmentPointState(
        this.obj.position.clone().add(attactmentPoint.clone().applyQuaternion(this.obj.quaternion)),
        this.velocity.clone().add(attactmentPoint.clone().cross(this.angularVelocity).multiplyScalar(-1).applyQuaternion(this.obj.quaternion))
      ) 
    }
    return [ attactmentPointState.call(this, this.tetherAttachmentPoint1), attactmentPointState.call(this, this.tetherAttachmentPoint2) ]
  }

  createWing(prop: WingProperties) {
    var wing = this.generateMesh(prop)
    wing.rotateZ( - Math.PI / 2 );
    wing.rotateY( - Math.PI / 2 );
    wing.rotateZ( - 5 / 180 * Math.PI);

    wing.position.set(-prop.thickness/2, -prop.span/2, - prop.cord/3)
    this.obj.add( wing )
    return wing
  }

  createVerticalWings(prop: WingProperties) {
    var VWing = this.generateMesh(prop)
    VWing.rotateY( - Math.PI / 2 );
    VWing.rotateZ( - 8 / 180 * Math.PI);
    var VWing2 = VWing.clone()

    VWing.position.set(prop.span/2, -prop.span/2, -prop.cord/3)
    VWing2.position.set(prop.span/2, prop.span/2, -prop.cord/3)

    this.obj.add( VWing )
    this.obj.add( VWing2 )
    return VWing
  }

  createElevator(prop: WingProperties, fuselarge: FuselargeProp) {
    var elevator = this.generateMesh(prop)
    elevator.position.set(-prop.thickness/2+0.04, -prop.span/2 , fuselarge.rearLength-prop.cord )
    elevator.rotateZ( - Math.PI / 2 );
    elevator.rotateY( - Math.PI / 2 );
    this.obj.add( elevator )
    return elevator
  }

  createRudder(prop: WingProperties, fuselarge: FuselargeProp) {
    var rudder = this.generateMesh(prop)
    rudder.position.set(prop.span/2, -prop.thickness/2 , fuselarge.rearLength)
    rudder.rotateY( - Math.PI / 2 );
    this.obj.add( rudder );
    return rudder
  }

  createFuselarge(prop: FuselargeProp) {
    var geometry = new CylinderGeometry( prop.diameter, prop.diameter, prop.frontLength + prop.rearLength, 32 );
    var material = new MeshLambertMaterial( {color: 0xffff00} );
    var cylinder = new Mesh( geometry, material );
    cylinder.position.set(0,0,(prop.rearLength-prop.frontLength)/2)
    cylinder.rotateX( Math.PI / 2 );
    this.obj.add( cylinder );
  }

  generateMesh(prop: WingProperties) {
    function extrudeSettings(prop: WingProperties) {
      return {
        steps: 1,
        amount: prop.span,
        bevelEnabled: false
      }
    }

    function extrudeShape(prop: WingProperties) {
      var shape = new Shape();
      shape.moveTo( 0,0 );
      shape.lineTo( 0, prop.thickness );
      if (prop.sym) { shape.lineTo( prop.cord, prop.thickness/2 ) }
      else { shape.lineTo( prop.cord, 0 ) }
      shape.lineTo( 0, 0 );
      return shape
    }

    var geometry = new ExtrudeGeometry( extrudeShape(prop), extrudeSettings(prop) );
    var material = new MeshLambertMaterial( { color: 0x00ff00 } );
    var mesh = new Mesh( geometry, material );
    return mesh
  }
}