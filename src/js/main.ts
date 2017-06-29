// three.js
import * as THREE from 'three'
import { Vector3 } from 'three'
import { Kite, kiteProp, AttachmentPointState} from "./kite"
import { Key } from './util'
import { Tether, tetherProperties, TetherProperties } from './tether'
import { PathFollow, PointOnSphere } from './pathFollow'

import * as OrbitControlsLibrary from 'three-orbit-controls'
let OrbitControls = OrbitControlsLibrary(THREE)

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbiting controls in using mouse/trackpad
let controls:THREE.OrbitControls = new OrbitControls(camera)
controls.enableKeys = false
camera.position.x = -20;
camera.position.y = 5;
camera.position.z = 2;
controls.update()

// Scene light
setupLights()

// Kite 
let kite = new Kite(kiteProp)
kite.obj.add(new THREE.AxisHelper(5))
kite.obj.rotateX(Math.PI / 2 )
positionKiteAtTheEndOfTether(tetherProperties)
scene.add(kite.obj)

// Tether 
let tether = new Tether(tetherProperties, kite.getAttachmentPointsState())
tether.renderObjects.forEach(mesh => { scene.add( mesh ) })

// Pathfollowing 
let pathFollow = new PathFollow( new PointOnSphere(0, 20), 20, 40, kite.rudder, scene)

// Visual helpers
let helper = new THREE.GridHelper(25, 25)
helper.setColors(0x0000ff, 0x808080)
scene.add(new THREE.AxisHelper(10))
scene.add(helper)
    
// start rendering scene and setup callback for each frame
let lastTime
render(null) // start 

function render(ms) {
    // we get passed a timestamp in milliseconds
    if (lastTime) {
        update((ms-lastTime)/1000) // call update and pass delta time in seconds
    }

    lastTime = ms
    requestAnimationFrame(render)
    renderer.render( scene, camera )
}

// Main update loop which is run on every frame 
function update(dt) {

    dt = dt // can be used for adjusting the animation speed
    dt = Math.min(dt, 0.03) // max timestep of 0.03 seconds

    detectUserInput(dt) // detect any keypresses and update accordinly

    // increase the amount of numerical integrations for each frame. 
    // Especially increase the stability of the tether calculations
    var subFrameIterations = 20 
    let dtSub = dt/subFrameIterations

    for (var k = 0; k < subFrameIterations; k++) {
        tether.updateTetherPositionAndForces(dtSub)
        kite.updateKitePositionAndForces(dtSub, tether.kiteTetherForces(), tether.getKiteTetherMass())
        tether.updateKiteTetherState(kite.getAttachmentPointsState())
    }

    // the pathfllowing algorithm will adjust the rudder give the input. It's currently turned on by toggleing 'q'
    pathFollow.update(kite.obj.position.clone(), kite.velocity.clone())

    // Set the position of the boxes showing the tether.
    tether.renderObjects.forEach( (mesh, i) => {
        mesh.position.set(tether.pos[i].x, tether.pos[i].y, tether.pos[i].z)
    })
}

function setupLights() {
    var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
    hemiLight.color.setHSL(0.6, 1, 0.6)
    hemiLight.groundColor.setHSL(0.095, 1, 0.75)
    hemiLight.position.set(0, 500, 0)
    scene.add(hemiLight)
    
    var dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.color.setHSL(0.1, 1, 0.95)
    dirLight.position.set(20, 100, 0)
    dirLight.position.multiplyScalar(50)
    scene.add(dirLight)
}

function detectUserInput(dt) {
    var rotationRate = Math.PI // rad / s
    var thrustRate = 20 // N / s

    if (Key.isDown(Key.UP)) kite.elevator.mesh.rotateZ(-rotationRate * dt)
    if (Key.isDown(Key.LEFT)) kite.rudder.mesh.rotateZ(-rotationRate * dt)
    if (Key.isDown(Key.DOWN)) kite.elevator.mesh.rotateZ(rotationRate * dt)
    if (Key.isDown(Key.RIGHT)) kite.rudder.mesh.rotateZ(rotationRate * dt)
    if (Key.isDown(Key.S)) kite.obj.rotateZ(-rotationRate / 4 * dt)
    if (Key.isDown(Key.X)) kite.obj.rotateZ(rotationRate / 4 * dt)
    if (Key.isDown(Key.A)) kite.adjustThrustBy(-thrustRate * dt)
    if (Key.isDown(Key.Z)) kite.adjustThrustBy( thrustRate * dt)
}

function positionKiteAtTheEndOfTether(tp: TetherProperties) {
    let dx = Math.sqrt(tp.kiteTLength*tp.kiteTLength - kite.tetherAttachmentPoint1.y*kite.tetherAttachmentPoint1.y)
    kite.obj.position.add( new THREE.Vector3(tp.totalLength + dx, 0, 0) )
}
