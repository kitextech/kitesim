import { Euler, Quaternion, Vector3 } from 'three'

export interface Loggable {
  getValues(): number[]
}

import fs = require('fs')
 
export class Logger {
    private static instance: Logger | null;
    private headers = ["time"]
    f: (arg: string) => void

    private constructor() {
    }
    private logables: Loggable[] = []

    static getInstance() {
        if (!this.instance) {
        this.instance = new Logger();
        }
        return this.instance;
    }

    addLoggable(loggable: Loggable, ...headers: string[])  {
        this.logables.push(loggable)
        this.headers.push(...headers)
    }

    start() {
      this.f(this.headers.join("\t"))
      this.f("\n")
    }

    update(time: number) {
        this.f(
        [time.toString()].concat(...this.logables.map( loggable => {
            return loggable.getValues().map( value => value.toExponential(4) )
        }))
        .join("\t")
        )
        this.f("\n")
    }
}

export class ForceMoment {
	constructor(readonly force: Vector3, readonly moment: Vector3) { }

	add(fm: ForceMoment): ForceMoment {
		this.force.add(fm.force)
		this.moment.add(fm.moment)
		return this
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
      this.d * (error - this.lastError) / dt + this.ff

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
      return new Euler(0, this.altitude, this.heading , 'ZYX')
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
  let heading = Math.atan2(pos.y, pos.x)
  let altitude = Math.atan2(-pos.z, Math.sqrt(pos.x*pos.x + pos.y+pos.y) )
  return new PointOnSphere(heading, altitude)
}

export function degToRad(deg: number): number {
  return deg/180*Math.PI
}

export interface Wind {
  getWind(time: number) : Vector3 
}

export class WindStatic implements Wind {
  constructor(readonly wind: Vector3) {}
  
  getWind(time: number): Vector3 {
    return this.wind
  }
}

export class WindTimeseries implements Wind {

  constructor( readonly wind: Vector3[], readonly timeStep: number) {  } // Not implemented yet

  getWind(time: number): Vector3 { 
    return this.wind[ Math.floor(time/this.timeStep) % this.wind.length ]
  }

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

export function linspace(a: number, b: number, n: number) {
  if(typeof n === "undefined") n = Math.max(Math.round(b-a)+1,1);
  if(n<2) { return n===1?[a]:[]; }
  var i,ret = Array(n);
  n--;
  for(i=n;i>=0;i--) { ret[i] = (i*b+(n-i)*a)/n; }
  return ret;
}

export function limit(val: number, min = -1, max = +1) {
  return  Math.max(Math.min(val, max), min)
}