// three.js
import * as THREE from 'three'
import { Vector3 } from 'three'
import { Kite, kiteProp, AttachmentPointState} from "./kite"
import { Key } from './util'
import { Tether, tetherProperties, TetherProperties } from './tether'

import * as OrbitControlsLibrary from 'three-orbit-controls'
let OrbitControls = OrbitControlsLibrary(THREE)

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let controls:THREE.OrbitControls = new OrbitControls(camera)
controls.enableKeys = false
camera.position.x = -20;
camera.position.y = 5;
camera.position.z = 2;
controls.update()

setupLights()

var kite = new Kite(kiteProp)

kite.obj.add(new THREE.AxisHelper(5))
kite.obj.rotateX(Math.PI / 2 )
positionKiteAtTheEndOfTether(tetherProperties)

scene.add(kite.obj)

var tether = new Tether(tetherProperties, kite.getAttachmentPointsState())
tether.renderObjects.forEach(mesh => {
    scene.add( mesh )
})

// Helpers
let helper = new THREE.GridHelper(25, 25)
// helper.geometry.rotateX( Math.PI / 2 );
helper.setColors(0x0000ff, 0x808080)
scene.add(new THREE.AxisHelper(10))
scene.add(helper)
    
let lastTime
render(null) // start 

function update(dt) {

    dt = dt // realtime
    dt = Math.min(dt, 0.03) // max timestep of 0.05 seconds

    detectUserInput(dt)

    var subFrameIterations = 20
    let dtSub = dt/subFrameIterations

    for (var k = 0; k < subFrameIterations; k++) {

        tether.updateTetherPositionAndForces(dtSub)

        // .add( kiteTF.spring1 )
        // .add( kiteTF.spring2 )
        // .add( kiteTF.drag1 )
        // .add( kiteTF.drag2 )
        // .add( thrustWorld )

        // mTether.mass[mTether.KIndex1] + mTether.mass[mTether.KIndex2]

        kite.updateKitePositionAndForces(dtSub, [], 0)

        tether.updateKiteTetherState(kite.getAttachmentPointsState())
    }

    // pf.update(kite.obj.position.clone(), kite.velocity.clone())

    // UPDATE UI
    // Set the position of the boxes showing the tether.
    tether.renderObjects.forEach( (mesh, i) => {
        mesh.position.set(tether.pos[i].x, tether.pos[i].y, tether.pos[i].z)
    });
}

function render(ms) {
    // we get passed a timestamp in milliseconds
    // we use it to determine how much time has passed since the last call
    if (lastTime) {
        update((ms-lastTime)/1000) // call update and pass delta time in seconds
    }

    lastTime = ms
    requestAnimationFrame(render)
    renderer.render( scene, camera );

}

function setupLights() {
    // LIGHTS
    var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
    hemiLight.color.setHSL(0.6, 1, 0.6)
    hemiLight.groundColor.setHSL(0.095, 1, 0.75)
    hemiLight.position.set(0, 500, 0)
    scene.add(hemiLight)
    //
    var dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.color.setHSL(0.1, 1, 0.95)
    dirLight.position.set(20, 100, 0)
    dirLight.position.multiplyScalar(50)
    scene.add(dirLight)
}

function detectUserInput(dt) {
    // var a = THREE.Vector3(0, 0, -thrustRate * dt)
    // user input

    var rotationRate = Math.PI // rad / s
    var thrustRate = 20 // N / s
    var thrustMax = new THREE.Vector3( 0, 0, -35) // N
    var thrustMin = new THREE.Vector3( 0, 0, 0) // N
    var thrust = new THREE.Vector3( 0, 0, -25) // in the frame of the kite

    if (Key.isDown(Key.UP)) kite.elevator.mesh.rotateZ(-rotationRate * dt)
    if (Key.isDown(Key.LEFT)) kite.rudder.mesh.rotateZ(-rotationRate * dt)
    // if (Key.isDown(Key.DOWN)) kite.obj.rotateY(rotationRate * dt)
    if (Key.isDown(Key.DOWN)) kite.elevator.mesh.rotateZ(rotationRate * dt)
    if (Key.isDown(Key.RIGHT)) kite.rudder.mesh.rotateZ(rotationRate * dt)
    if (Key.isDown(Key.S)) kite.obj.rotateZ(-rotationRate / 4 * dt)
    if (Key.isDown(Key.X)) kite.obj.rotateZ(rotationRate / 4 * dt)
    if (Key.isDown(Key.A)) thrust.add(new THREE.Vector3(0, 0, -thrustRate * dt)).max(thrustMax).min(thrustMin)
    if (Key.isDown(Key.Z)) thrust.add(new THREE.Vector3(0, 0, thrustRate * dt)).max(thrustMax).min(thrustMin)
}

// kite
function positionKiteAtTheEndOfTether(tp: TetherProperties) {
    let dx = Math.sqrt(tp.kiteTLength*tp.kiteTLength - kite.tetherAttachmentPoint1.y*kite.tetherAttachmentPoint1.y)
    kite.obj.position.add( new THREE.Vector3(tp.totalLength + dx, 0, 0) )
}
