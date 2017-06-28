// KITE
import { Object3D, Mesh, Vector3, Matrix3, CylinderGeometry, MeshLambertMaterial, ExtrudeGeometry, Shape } from 'three'

export interface WingProperties {
    cord: number
    thickness: number
    span: number
    sym: boolean
    area?: number
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


export class Kite {
  obj: Object3D
  wing: Mesh
  vWing: Mesh
  elevator: Mesh
  rudder: Mesh
  fuselarge: Mesh

  tetherAttachmentPoint1: Vector3
  tetherAttachmentPoint2: Vector3
  elevatorPosition: Vector3
  rudderPosition: Vector3

  Jinv: Matrix3
  angularVelocity: Vector3
  velocity: Vector3
  mass: number

  constructor(prop: KiteProperties) {
    this.obj = new Object3D(); //create an empty container
    this.wing = this.createWing(prop.wing)
    this.vWing = this.createVerticalWings(prop.vWing)
    this.elevator = this.createElevator(prop.elevator, prop.fuselarge)
    this.rudder = this.createRudder(prop.rudder, prop.fuselarge)
    this.createFuselarge(prop.fuselarge)

    this.tetherAttachmentPoint1 = new Vector3(0, prop.wing.span/2, 0)
    this.tetherAttachmentPoint2 = new Vector3(0, -prop.wing.span/2, 0)
    this.elevatorPosition = new Vector3(0, 0, prop.fuselarge.rearLength-prop.elevator.cord)
    this.rudderPosition = new Vector3(0, 0, prop.fuselarge.rearLength)

    this.Jinv = new Matrix3().getInverse(prop.J, function() {
      alert('No Inverse')
    } )

    this.mass = prop.mass
    this.angularVelocity = new Vector3( 0, 0, 0 )
    this.velocity = new Vector3( 0, 0, 0)
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

  extrudeSettings(prop: WingProperties) {
    return {
      steps: 1,
      amount: prop.span,
      bevelEnabled: false
    }
  }

  extrudeShape(prop: WingProperties) {
    var shape = new Shape();
    shape.moveTo( 0,0 );
    shape.lineTo( 0, prop.thickness );
    if (prop.sym) { shape.lineTo( prop.cord, prop.thickness/2 ) }
    else { shape.lineTo( prop.cord, 0 ) }
    shape.lineTo( 0, 0 );
    return shape
  }

  generateMesh(prop: WingProperties) {
    var geometry = new ExtrudeGeometry( this.extrudeShape(prop), this.extrudeSettings(prop) );
    var material = new MeshLambertMaterial( { color: 0x00ff00 } );
    var mesh = new Mesh( geometry, material );
    return mesh
  }
}