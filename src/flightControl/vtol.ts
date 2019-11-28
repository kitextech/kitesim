import { Euler, Quaternion, Vector3 } from 'three'

export enum VTOL_TransitionAlgo {
    default
}

export class VTOL {
    rollStart: number = 0
    pitchStart: number = 0
    rollForward: number = -80/180 * Math.PI
    ratio: number = 0
    thrustStart: number = 0
    thrustForward: number = 0.85
    transitionTime: number = 2 // seconds
    airspeedTransition: number = 16 // m/s
    attitudeStart: Quaternion
    
    constructor(readonly windspeed: number, readonly headingOffset: number, readonly algorithm: VTOL_TransitionAlgo) {
    }

    start(attiude: Quaternion, thrust: number): void {
        this.attitudeStart = attiude
        let attiudeEuler = new Euler().setFromQuaternion(attiude, 'ZYX')
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

    getAirspeedRadio(vel: Vector3): number {
        return Math.max(0, Math.min(1, vel.length()/this.airspeedTransition))
    }

    getThrust(): number {
        return (1-this.ratio) * this.thrustStart + this.ratio * this.thrustForward
    }

    getAttitudeForward(attiude: Quaternion, pos: Vector3, vel: Vector3): Quaternion {
        
        switch (this.algorithm) {
            case VTOL_TransitionAlgo.default: {
                let heading = Math.atan2( pos.y, pos.x )  - this.getAirspeedRadio(vel) * Math.atan2(this.windspeed,vel.length()) 

                let pitchGoal = 0

                let pitch = (1-this.ratio) * this.pitchStart + this.ratio * pitchGoal
                let roll = (1-this.ratio) * this.rollStart + this.ratio * this.rollForward

                let attitudeTarget = new Euler(roll, pitch, heading, 'ZYX')

                return new Quaternion().setFromEuler(attitudeTarget)
            }
                break;
        }
    }
}

export class VTOL_StraightUp { // straight up
    rollStart: number = 0
    pitchStart: number = 0
    rollForward: number = -80/180 * Math.PI
    ratio: number = 0
    transitionTime: number = 8 // seconds
    airspeedTransition: number = 14 // m/s

    constructor(readonly windspeed: number) {}

    start(attiude: Quaternion, thrust: number): void {
        this.ratio = 0
    }

    updateRatio(dt: number): void {
        this.ratio = Math.max(0, Math.min(1, this.ratio + dt / this.transitionTime))
    }

    getRatio(): number {
        return this.ratio
    }

    getAirspeedRadio(vel: Vector3): number {
        return Math.max(0, Math.min(1, vel.length()/this.airspeedTransition))
    }

    getThrust(): number {
        return 1 
    }

    getAttitudeForward(attiude: Quaternion, pos: Vector3, vel: Vector3): Quaternion {
        
        let heading = Math.atan2( pos.y, pos.x )  
        let pitch = Math.atan2( -pos.z, Math.sqrt( pos.x*pos.x + pos.y*pos.y ) ) - 0 /180 * Math.PI 
        let roll = 0

        let attitudeTarget = new Euler(roll, pitch, heading, 'ZYX')

        return new Quaternion().setFromEuler(attitudeTarget)
    }
}