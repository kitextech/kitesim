// three.js
import * as THREE from 'three'
import { Vector3 } from 'three'
import { Kite, kiteProp } from "./kite"
import { Key } from './util'

import * as OrbitControlsLibrary from 'three-orbit-controls'
let OrbitControls = OrbitControlsLibrary(THREE)

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let controls:THREE.OrbitControls = new OrbitControls(camera)
controls.enableKeys = false

setupLights()

var kite = new Kite(kiteProp)
scene.add(kite.obj)

camera.position.z = 5;



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



function update(dt) {

    dt = dt // realtime
    dt = Math.min(dt, 0.03) // max timestep of 0.05 seconds

    detectUserInput(dt)

    var subFrameIterations = 20
    let dtSub = dt/subFrameIterations

    for (var k = 0; k < subFrameIterations; k++) {

    // mTether.updateTetherPositionAndForces(dt/subFrameIterations)

        // .add( kiteTF.spring1 )
        // .add( kiteTF.spring2 )
        // .add( kiteTF.drag1 )
        // .add( kiteTF.drag2 )
        // .add( thrustWorld )

        // mTether.mass[mTether.KIndex1] + mTether.mass[mTether.KIndex2]

        kite.updateKitePositionAndForces(dtSub, [], 0)

        // mTether.updateKiteTetherPosAndVelocity(kite)
    }

    // pf.update(kite.obj.position.clone(), kite.velocity.clone())

    // // UPDATE UI
    // // Set the position of the boxes showing the tether.
    // for (var i = 0; i <= mTether.indexEnd; i++) {
    // mTether.renderObjects[i].position.set(mTether.pos[i].x, mTether.pos[i].y, mTether.pos[i].z)
    // }

}



var lastTime, animFrame

function render(ms) {
    // we get passed a timestamp in milliseconds
    // we use it to determine how much time has passed since the last call
    if (lastTime) {
        update((ms-lastTime)/1000) // call update and pass delta time in seconds
    }

    lastTime = ms
    animFrame = requestAnimationFrame(render)
    renderer.render( scene, camera );

}

render(null)


// var animate = function() {
//     requestAnimationFrame(animate);

//     kite.obj.rotation.x += 0.02;
//     kite.obj.rotation.y += 0.02;

//     renderer.render(scene, camera);
// };

// animate();


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