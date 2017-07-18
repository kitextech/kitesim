import { Euler, Quaternion, Vector2, Vector3 } from 'three'

export class VTOL {
    rollStart: number = 0
    pitchStart: number = 0
    rollForward: number = 0
    ratio: number = 0
    thrustStart: number = 0
    thrustForward: number = 0.5
    transitionTime: number = 2 // seconds

    constructor() {}

    start(attiude: Quaternion, thrust: number): void {
        let attiudeEuler = new Euler().setFromQuaternion(attiude, 'YZX')
        this.rollStart = attiudeEuler.x
        this.pitchStart = attiudeEuler.z
        this.ratio = 0
        this.thrustStart = thrust
    }

    updateRatio(dt: number): void {
        this.ratio = Math.max(0, Math.min(1, this.ratio + dt / this.transitionTime))
    }

    getRatio(): number {
        return this.ratio
    }

    getThrust(): number {
        return (1-this.ratio) * this.thrustStart + this.ratio * this.thrustForward
    }

    getAttitudeForward(attiude: Quaternion, pos: Vector3): Quaternion {
        
        let heading = Math.atan2( pos.z, pos.x )
        let pitchGoal = Math.atan2( pos.y, Math.sqrt( pos.x*pos.x + pos.y*pos.y ) )
        let pitch = (1-this.ratio) * this.pitchStart + this.ratio * pitchGoal
        let roll = (1-this.ratio) * this.rollStart + this.ratio * this.rollForward

        let attitudeTarget = new Euler(roll, -heading, pitch, 'YZX')

        return new Quaternion().setFromEuler(attitudeTarget)
    }
}

// export var vtol = new VTOL()