import * as THREE from 'three'
import { Vector3, AxesHelper } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pause, KeyAxis } from "../other/util-browser"
import { Simulation, defaultConfig40 } from "../other/simulation"

let camera: THREE.PerspectiveCamera, renderer: THREE.Renderer;
let lastTimestamp: number
let scene = new THREE.Scene()
let pause = new Pause()
let simTime = 0

let sim = new Simulation(defaultConfig40)
let keyAxis = new KeyAxis(1)

init();
animate();


function init() {
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 1000 );

	camera.up.copy(new Vector3(0,0,-1))
	let controls = new OrbitControls(camera)
	controls.enableKeys = false
	controls.target.add(new Vector3(70, 10, -30))
	camera.position.set(-50,30,-30)
	controls.update()

	
	scene.add(new THREE.GridHelper(100,10).rotateX(Math.PI/2))
	// scene.add(goundplane)
	scene.add(new AxesHelper(10))
	scene.add( ...sim.getUIObjects() );
	
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	setupLights()
	setupWorld()
}

function animate(timestamp?: number) {
	// we get passed a timestamp in milliseconds
	if (lastTimestamp) { 
			update((timestamp-lastTimestamp)/1000) // call update and pass delta time in seconds	} // call update and pass delta time in seconds
	}
	lastTimestamp = timestamp

	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

function update(dt: number){

	if (pause.on) return

	simTime += dt

	if (simTime % 1 < 1/50) { console.log(keyAxis.upDown, keyAxis.leftRight) }
	keyAxis.update(dt)
	sim.update(dt, simTime)
	sim.flightModeController.upDownLeftRight(keyAxis.upDown, keyAxis.leftRight)
	sim.updateUI()
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

function setupWorld() {
	let goundplane = new THREE.Mesh(new THREE.PlaneBufferGeometry(600, 600, 2, 2),  // consider making an inside out circle
	new THREE.MeshBasicMaterial( {
		color: 0x177531, alphaTest: 0, visible: true
	})).rotateX(Math.PI);
	
	scene.add(goundplane)
		
	let sphereMaterialx = new THREE.MeshBasicMaterial( {
		color: 0x819ABF, alphaTest: 0, visible: true
	})
	sphereMaterialx.side = THREE.BackSide
	
	var sphere = new THREE.Mesh(
		new THREE.SphereGeometry(300, 16, 16),
		sphereMaterialx
	  )
	scene.add(sphere)
	
	let r1 = 0.4
	let r2 = 0.8

	let height = 10
	var geometry = new THREE.CylinderGeometry( r2, r1, height, 12 );
	var material = new THREE.MeshBasicMaterial( {color: 0xEEEEEE} );
	var cylinder = new THREE.Mesh( geometry, material );
	cylinder.rotateX(Math.PI/2)
	cylinder.position.setZ(-height/2)
	scene.add( cylinder );
}