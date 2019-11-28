import { Euler, Quaternion, Vector3 } from 'three'
import { Airplane } from '../aero/airplane'
import { PathFollow } from '../flightControl/path-follow'
import { Simulation } from './simulation';

export var Key = {
  _pressed: {},
  _listeners: {},

  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  S: 83,
  X: 88,
  Z: 90,
  L: 76,
  
  isDown: function(keyCode: number): boolean {
    return this._pressed[keyCode];
  },

  onKeydown: function(event: KeyboardEvent) {
    this._pressed[event.keyCode] = true;

    for (const key in this._listeners) {
      if (this._listeners.hasOwnProperty(key)) {
        if (event.keyCode.toString() == key) {
          this._listeners[key]()
        }
      }
    }
  },

  onKeyup: function(event: KeyboardEvent) {
    delete this._pressed[event.keyCode];
  },

  addListener: function(keyCode: number, func: () => void ) {
    this._listeners[keyCode] = func
  }
};

console.log("i'm called")

window.addEventListener('keydown', function(e) { Key.onKeydown(e) })
window.addEventListener('keyup', function(e) { Key.onKeyup(e) })

export class KeyAxis {
  upDown: number = 0
  leftRight: number = 0

  constructor(readonly speed: number) {}

  update(dt: number) {
    if (Key.isDown(Key.UP)) { this.upDown += this.speed * dt }
    if (Key.isDown(Key.DOWN)) { this.upDown -= this.speed * dt }
    if (Key.isDown(Key.LEFT)) { this.leftRight -= this.speed * dt }
    if (Key.isDown(Key.RIGHT)) { this.leftRight += this.speed * dt }
    this.leftRight -= 0.3 * this.leftRight * dt
  }
}


export class Pause {
  on: boolean = false
  constructor() { this.setUpListener() }

  toggle() {
      this.on = !this.on
  }

  setUpListener() {
      var self = this
      document.addEventListener('keydown', function (e) {
          var key = e.keyCode || e.which;
          if (key === 80) {
              self.toggle()
          }
      }, false);
  }
}

export function setUpListener(keyCode: number, action: () => void, caller: Object) {
  document.addEventListener('keydown', function (e) {
      var key = e.keyCode || e.which;
      if (key === keyCode) { // 81 q
          action.call(caller)
      }
  }, false);
}

export function updateDescriptionUI(airplane: Airplane, pf: PathFollow, sim: Simulation, time: number) {
      let newDescription = ''
      newDescription += "apparent wind speed : " + sim.wind.getWind(time).clone().sub(airplane.velocity_NED).length().toFixed(1) + "<br />"
      newDescription += "velocity: " + airplane.velocity_NED.length().toFixed(1) + "<br />"

      // newDescription += "alfa wing: " + (airplane.wing.alfa * 180 / Math.PI).toFixed(1) + "<br />"
      // newDescription += "alfa vertical wing : " + (airplane.vWing.alfa * 180 / Math.PI).toFixed(1) + "<br />"
      newDescription += "thrust: " + airplane.thrust.toFixed(1) + "<br />"

      var euler = new Euler(0,0,0, 'ZYX')
      euler.setFromQuaternion(airplane.quaternion, 'ZYX')

      newDescription += "x: " + euler.x.toFixed(2) + "<br />"
      newDescription += "y: " + euler.y.toFixed(2) + "<br />"
      newDescription += "z: " + euler.z.toFixed(2) + "<br />"

      var px = airplane.position.x, pz = airplane.position.y
      var b = Math.atan2(airplane.position.z, px) * 180 / Math.PI
      var z = Math.atan2(airplane.position.y, Math.sqrt(px*px + pz+pz) ) * 180 / Math.PI

      newDescription += "<br />"
      newDescription += "b: " + b.toFixed(2) + "<br />"
      newDescription += "z: " + z.toFixed(2) + "<br />"

      newDescription += "<br />"
      // newDescription += "rudder: " + (new Euler().setFromQuaternion(airplane.rudder.mesh.quaternion, 'XYZ').x * 180/Math.PI).toFixed(1) + "<br />"
      newDescription += "angleError: " + pf.getAngleError().toFixed(1) + "<br />"
      // newDescription += "angleToPoint: " + Math.floor(angleToPoint*180/Math.PI) + "<br />"
      // newDescription += "currentHeading: " + Math.floor(currentHeading*180/Math.PI) + "<br />"

      document.getElementById('info').innerHTML = newDescription
}

export class PID {

  lastError: number = 0
  integrator: number = 0
  p: number
  i: number
  d: number
  ff: number = 0

  constructor(p: number, i: number, d: number, readonly iAbsMax: number){
    this.p = p
    this.i = i
    this.d = d
  }

  update(error: number, dt: number): number {
    
    this.integrator += error * dt
    this.integrator = Math.min( Math.max( this.integrator, -this.iAbsMax ), this.iAbsMax)

    let adjustment = this.p * error + 
      this.i * this.integrator +
      this.d * (error - this.lastError) / dt + this.ff

    this.lastError = error

    return adjustment
  }

  reset() {
    this.lastError = 0
    this.integrator = 0
  }
}