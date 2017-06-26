// KITE
kite = new THREE.Object3D(); //create an empty container





// Wing
var wingCord = 0.1, wingTickness = 0.02, wingSpan = 1.4
var wingArea = wingCord * wingSpan

var shape = new THREE.Shape();
shape.moveTo( 0,0 );
shape.lineTo( 0, wingTickness );
// shape.lineTo( wingCord, wingTickness );
shape.lineTo( wingCord, 0 );
shape.lineTo( 0, 0 );

var extrudeSettings = {
  steps: 1,
  amount: wingSpan,
  bevelEnabled: false
};

var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
var wing = new THREE.Mesh( geometry, material );
wing.rotateZ( - Math.PI / 2 );
wing.rotateY( - Math.PI / 2 );
wing.rotateZ( - 5 / 180 * Math.PI);

wing.position.set(-wingTickness/2, -wingSpan/2, - wingCord/3)
kite.add( wing );//add a mesh with geometry to it


// VerticalWings
var VWingCord = 0.1, VWingTickness = 0.02, VWingSpan = 0.8;
var VWingArea = VWingCord * VWingSpan * 2

var shape = new THREE.Shape();
shape.moveTo( 0,0 );
shape.lineTo( 0, VWingTickness );
shape.lineTo( VWingCord, 0 );
shape.lineTo( 0, 0 );

var extrudeSettings = {
  steps: 1,
  amount: VWingSpan,
  bevelEnabled: false
};

var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
var VWing = new THREE.Mesh( geometry, material );
VWing.rotateY( - Math.PI / 2 );
VWing.rotateZ( - 8 / 180 * Math.PI);


VWing.position.set(VWingSpan/2, -wingSpan/4, - VWingCord/3)
var VWing2 = VWing.clone()
VWing2.position.set(VWingSpan/2, wingSpan/4, - VWingCord/3)

kite.add( VWing );//add a mesh with geometry to it
kite.add( VWing2 );//add a mesh with geometry to it



// Fuselarge
var fuselargeDiameter = 0.01, fuselargeFront = 0.4, fuselargeRear = 0.7;

var geometry = new THREE.CylinderGeometry( fuselargeDiameter, fuselargeDiameter, fuselargeFront + fuselargeRear, 32 );
var material = new THREE.MeshLambertMaterial( {color: 0xffff00} );
var cylinder = new THREE.Mesh( geometry, material );
cylinder.position.set(0,0,(fuselargeRear-fuselargeFront)/2)
cylinder.rotateX( Math.PI / 2 );
kite.add( cylinder );


// elevator
var elevatorThickness = 0.01, elevatorCord = 0.06, elevatorSpan = 0.6
var elevatorArea = elevatorCord * elevatorSpan
var shape = new THREE.Shape();
shape.moveTo( 0, 0 );
shape.lineTo( 0, elevatorThickness );
shape.lineTo( elevatorCord, elevatorThickness/2 );
shape.lineTo( 0, 0 );

var extrudeSettings = {
  steps: 1,
  amount: elevatorSpan,
  bevelEnabled: false
};

var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
var elevator = new THREE.Mesh( geometry, material );
elevator.position.set(-elevatorThickness/2+0.04, -elevatorSpan/2 , fuselargeRear-elevatorCord )
elevator.rotateZ( - Math.PI / 2 );
elevator.rotateY( - Math.PI / 2 );
kite.add( elevator );//add a mesh with geometry to it

// rudder
var rudderThickness = 0.01, rudderCord = 0.06, rudderSpan = 0.6
var rudderArea = rudderCord * rudderSpan
var shape = new THREE.Shape();
shape.moveTo( 0,0 );
shape.lineTo( 0, rudderThickness );
shape.lineTo( rudderCord, rudderThickness/2 );
shape.lineTo( 0, 0 );

var extrudeSettings = {
  steps: 1,
  amount: elevatorSpan,
  bevelEnabled: false
};

var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
var rudder = new THREE.Mesh( geometry, material );
rudder.position.set(rudderSpan/2, -elevatorThickness/2 , fuselargeRear)
rudder.rotateY( - Math.PI / 2 );
kite.add( rudder );//add a mesh with geometry to it
