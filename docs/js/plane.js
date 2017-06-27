// KITE

var kiProp = {

  wing: {
    cord: 0.1,
    thickness: 0.02,
    span: 1.4
  },

  vWing : {
    cord: 0.1,
    thickness: 0.02,
    span: 0.8
  },

  fuselarge: {
    diameter : 0.01,
    frontLenght : 0.4,
    rearLenght : 0.7
  },

  rudder: {
    thickness : 0.01,
    cord : 0.06,
    span : 0.6
  },

  elevator: {
    thickness : 0.01,
    cord : 0.06,
    span : 0.6
  }
}

function addAreaCalculation(obj, NWings) {
  obj.area = obj.cord * obj.span * NWings
}
addAreaCalculation(kiProp.wing, 1)
addAreaCalculation(kiProp.vWing, 2)
addAreaCalculation(kiProp.rudder, 1)
addAreaCalculation(kiProp.elevator, 1)


class Kite {
  constructor(prop) {
    this.obj = new THREE.Object3D(); //create an empty container
    this.wing = this.createWing(prop.wing)
    this.vWing = this.createVerticalWings(prop.vWing)
    this.elevator = this.createElevator(prop.elevator, prop.fuselarge)
    this.rudder = this.createRudder(prop.rudder, prop.fuselarge)
    this.createFuselarge(prop.fuselarge)

    this.tetherAttachmentPoint1 = new THREE.Vector3(0, prop.wing.span/2, 0)
    this.tetherAttachmentPoint2 = new THREE.Vector3(0, -prop.wing.span/2, 0)
    this.elevatorPosition = new THREE.Vector3(0, 0, prop.fuselarge.rearLenght-prop.elevator.cord)
    this.rudderPosition = new THREE.Vector3(0, 0, prop.fuselarge.rearLenght)
  }

  createWing(prop) {
    var shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo( 0, prop.thickness );
    shape.lineTo( prop.cord, 0 );
    shape.lineTo( 0, 0 );

    var geometry = new THREE.ExtrudeGeometry( shape, this.extrudeSettings(prop.span) );
    var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    var wing = new THREE.Mesh( geometry, material );
    wing.rotateZ( - Math.PI / 2 );
    wing.rotateY( - Math.PI / 2 );
    wing.rotateZ( - 5 / 180 * Math.PI);

    wing.position.set(-prop.thickness/2, -prop.span/2, - prop.cord/3)
    this.obj.add( wing );//add a mesh with geometry to it
    return wing
  }

  createVerticalWings(prop) {
    var shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo( 0, prop.thickness );
    shape.lineTo( prop.cord, 0 );
    shape.lineTo( 0, 0 );

    var geometry = new THREE.ExtrudeGeometry( shape, this.extrudeSettings(prop.span) );
    var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    var VWing = new THREE.Mesh( geometry, material );
    VWing.rotateY( - Math.PI / 2 );
    VWing.rotateZ( - 8 / 180 * Math.PI);

    VWing.position.set(prop.span/2, -prop.span/2, -prop.cord/3)
    var VWing2 = VWing.clone()
    VWing2.position.set(prop.span/2, prop.span/2, -prop.cord/3)

    this.obj.add( VWing );//add a mesh with geometry to it
    this.obj.add( VWing2 );//add a mesh with geometry to it
    return VWing
  }

  createElevator(prop, fuselarge) {
    var shape = new THREE.Shape();
    shape.moveTo( 0, 0 );
    shape.lineTo( 0, prop.thickness );
    shape.lineTo( prop.cord, prop.thickness/2 );
    shape.lineTo( 0, 0 );

    var geometry = new THREE.ExtrudeGeometry( shape, this.extrudeSettings(prop.span) );
    var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    var elevator = new THREE.Mesh( geometry, material );
    elevator.position.set(-prop.thickness/2+0.04, -prop.span/2 , fuselarge.rearLenght-prop.cord )
    elevator.rotateZ( - Math.PI / 2 );
    elevator.rotateY( - Math.PI / 2 );
    this.obj.add( elevator );//add a mesh with geometry to it
    return elevator
  }

  createRudder(prop, fuselarge) {
    var shape = new THREE.Shape();
    shape.moveTo( 0,0 );
    shape.lineTo( 0, prop.thickness );
    shape.lineTo( prop.cord, prop.thickness/2 );
    shape.lineTo( 0, 0 );

    var geometry = new THREE.ExtrudeGeometry( shape, this.extrudeSettings(prop.span) );
    var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
    var rudder = new THREE.Mesh( geometry, material );
    rudder.position.set(prop.span/2, -prop.thickness/2 , fuselarge.rearLenght)
    rudder.rotateY( - Math.PI / 2 );
    this.obj.add( rudder );//add a mesh with geometry to it
    return rudder
  }

  createFuselarge(prop) {
    var geometry = new THREE.CylinderGeometry( prop.diameter, prop.diameter, prop.frontLenght + prop.rearLenght, 32 );
    var material = new THREE.MeshLambertMaterial( {color: 0xffff00} );
    var cylinder = new THREE.Mesh( geometry, material );
    cylinder.position.set(0,0,(prop.rearLenght-prop.frontLenght)/2)
    cylinder.rotateX( Math.PI / 2 );
    this.obj.add( cylinder );
  }

  extrudeSettings(span) {
    return {
      steps: 1,
      amount: span,
      bevelEnabled: false
    }
  }

}
