import { PID } from '../other/util'


export class FWAttitude {
    rollPID = new PID(1.0, 0.0, 0.0, 100)

    constructor() {
    }

    getRudderAngle(rollRate: number, rollRateSP: number, dt: number): number {
        return 30 * (this.rollPID.update(rollRateSP - rollRate, dt)) // 30 degree of deflection
    }

    reset() { this.rollPID.reset() }
}