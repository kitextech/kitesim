// three.js
import * as THREE from 'three'

import { Vector3 } from 'three'

import { sayHello } from "./greet";

var x = new THREE.Vector3(0,1,0)
x.add( new Vector3(20,301,1))



function showHello(divName: string, name: string) {
    const elt = document.getElementById(divName);
    elt.innerText = sayHello(name);
}

showHello("greeting", "TypeScript");