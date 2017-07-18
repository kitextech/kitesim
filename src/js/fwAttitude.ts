import { PID } from './util'
import { Euler, Quaternion, Vector3 } from 'three'


export class FWAttitude {
    rollPID = new PID(100, 0.0, 0.0, 100)

    constructor() {
    }

    getRudderAngle(rollRate: number, rollRateSP: number, dt: number): number {
        return this.rollPID.update(rollRateSP - rollRate, dt)
    }
}