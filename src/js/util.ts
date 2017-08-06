import { Euler, Quaternion, Vector3 } from 'three'
import { Kite } from './kite'
import { PathFollow } from './pathFollow'
import * as C from './constants'

export var Key = {
  _pressed: {},

  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  S: 83,
  X: 88,
  Z: 90,
  
  isDown: function(keyCode: number): boolean {
    return this._pressed[keyCode];
  },

  onKeydown: function(event: KeyboardEvent) {
    this._pressed[event.keyCode] = true;
  },

  onKeyup: function(event: KeyboardEvent) {
    delete this._pressed[event.keyCode];
  }
};

window.addEventListener('keydown', function(e) { Key.onKeydown(e) })
window.addEventListener('keyup', function(e) { Key.onKeyup(e) })


export function updateDescriptionUI(kite: Kite, pf: PathFollow ) {
      let newDescription = ''
      newDescription += "apparent wind speed : " + C.WIND.clone().sub(kite.velocity).length().toFixed(1) + "<br />"
      newDescription += "velocity: " + kite.velocity.length().toFixed(1) + "<br />"

      newDescription += "alfa wing: " + (kite.wing.alfa * 180 / Math.PI).toFixed(1) + "<br />"
      newDescription += "alfa vertical wing : " + (kite.vWing.alfa * 180 / Math.PI).toFixed(1) + "<br />"
      newDescription += "thrust: " + kite.getThrustVector().z.toFixed(1) + "<br />"

      var euler = new Euler(0,0,0, 'ZYX')
      euler.setFromQuaternion(kite.obj.quaternion, 'ZYX', false)

      newDescription += "x: " + euler.x.toFixed(2) + "<br />"
      newDescription += "y: " + euler.y.toFixed(2) + "<br />"
      newDescription += "z: " + euler.z.toFixed(2) + "<br />"

      var px = kite.obj.position.x, pz = kite.obj.position.y
      var b = Math.atan2(kite.obj.position.z, px) * 180 / Math.PI
      var z = Math.atan2(kite.obj.position.y, Math.sqrt(px*px + pz+pz) ) * 180 / Math.PI

      newDescription += "<br />"
      newDescription += "b: " + b.toFixed(2) + "<br />"
      newDescription += "z: " + z.toFixed(2) + "<br />"

      newDescription += "<br />"
      newDescription += "rudder: " + (new Euler().setFromQuaternion(kite.rudder.mesh.quaternion, 'XYZ').x * 180/Math.PI).toFixed(1) + "<br />"
      newDescription += "angleError: " + pf.getAngleError().toFixed(1) + "<br />"
      // newDescription += "angleToPoint: " + Math.floor(angleToPoint*180/Math.PI) + "<br />"
      // newDescription += "currentHeading: " + Math.floor(currentHeading*180/Math.PI) + "<br />"

      document.getElementById('info').innerHTML = newDescription
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
      this.d * (this.lastError - error) / dt + this.ff

    this.lastError = error

    return adjustment
  }

  reset() {
    this.lastError = 0
    this.integrator = 0
  }
}

export class PointOnSphere {
    constructor(readonly heading: number, readonly altitude: number) { }

    getEuler(): Euler {
      return new Euler(0,  -this.heading, this.altitude, 'YZX')
    }

    getQauternion(): Quaternion {
      return new Quaternion().setFromEuler(this.getEuler())
    }

    distanceSimplifed(poS: PointOnSphere) {
      let hdiff = this.heading-poS.heading
      let adiff = this.altitude-poS.altitude
      return Math.sqrt( hdiff*hdiff + adiff*adiff )
    }
}

export function getPointOnSphere(pos: Vector3): PointOnSphere {
  let heading = Math.atan2(pos.z, pos.x)
  let altitude = Math.atan2(pos.y, Math.sqrt(pos.x*pos.x + pos.z+pos.z) )
  return new PointOnSphere(heading, altitude)
}

export function degToRad(deg: number): number {
  return deg/180*Math.PI
}

export class Cost {
  N: number = 0
  totalCost: number = 0

  add(cost: number): void {
    this.totalCost += cost
    this.N += 1
  }

  mean(): number {
    return this.totalCost/this.N
  }

  reset(): void {
    this.N = 0
    this.totalCost = 0
  }
}