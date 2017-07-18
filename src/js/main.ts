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

import { FlightModeController } from './flightModeController'

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbiting controls in using mouse/trackpad
let controls:THREE.OrbitControls = new OrbitControls(camera)
controls.enableKeys = false
camera.position.x = -5;
camera.position.y = 5;
camera.position.z = 2;
controls.update()

// Scene light
setupLights()

// Kite 
let kite = new Kite(kiteProp)
kite.obj.add(new THREE.AxisHelper(2))
kite.obj.rotateX(Math.PI / 2 )
positionKiteAtTheEndOfTether(tetherProperties)
scene.add(kite.obj)

// Tether 
let tether = new Tether(tetherProperties, kite.getAttachmentPointsState())
tether.renderObjects.forEach(mesh => { scene.add( mesh ) })
scene.add( tether.lineMain )
scene.add( tether.lineKite )

var flightModeController = new FlightModeController(kite, scene)
setUpListener(81, flightModeController.toggleMode, flightModeController)


// Visual helpers
let helper = new THREE.GridHelper(25, 25)
helper.setColors(0x0000ff, 0x808080)
scene.add(new THREE.AxisHelper(1))
scene.add(helper)

// Pause
let pause = new Pause()

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
    if (pause.on) return

    dt = dt // can be used for adjusting the animation speed
    dt = Math.min(dt, 0.03) // max timestep of 0.03 seconds

    detectUserInput(dt) // detect any keypresses and update accordinly

    // increase the amount of numerical integrations for each frame. 
    // Especially increase the stability of the tether calculations
    var subFrameIterations = 20 
    let dtSub = dt/subFrameIterations

    for (var k = 0; k < subFrameIterations; k++) {
        tether.updateTetherPositionAndForces(dtSub)

        flightModeController.update(dtSub)
        let moment = flightModeController.getMoment(dtSub)
                    
        kite.updateKitePositionAndForces(dtSub, tether.kiteTetherForces(), tether.getKiteTetherMass(), moment)
        tether.updateKiteTetherState(kite.getAttachmentPointsState())
    }

    flightModeController.adjustThrust(dt)

    // Set the position of the boxes showing the tether.
    tether.renderObjects.forEach( (mesh, i) => {
        mesh.position.set(tether.pos[i].x, tether.pos[i].y, tether.pos[i].z)
    })
    tether.updateLinePosition()

    updateDescriptionUI(kite, flightModeController.pf)
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

function setUpListener(keyCode: number, action: () => void, caller: Object) {
    document.addEventListener('keydown', function (e) {
        var key = e.keyCode || e.which;
        if (key === keyCode) { // 81 q
            action.call(caller)
        }
    }, false);
}

