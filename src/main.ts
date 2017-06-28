// three.js
import * as THREE from 'three'

import { Vector3 } from 'three'

import { Kite, kiteProp } from "./kite"


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


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
setupLights()

var kite = new Kite(kiteProp)

scene.add(kite.obj)

camera.position.z = 5;

var animate = function () {
    requestAnimationFrame(animate);

    kite.obj.rotation.x += 0.02;
    kite.obj.rotation.y += 0.02;

    renderer.render(scene, camera);
};

animate();
