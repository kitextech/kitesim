import { PID } from './util'
import { Euler, Quaternion, Vector3 } from 'three'


var anglesPIDS = [
    new PID(6,0.0,0.0,100),
    new PID(6,0.0,0.0,100),
    new PID(6,0.0,0.0,100)
]

var ratesPIDS = [
    new PID(20, 0.0, 0.0, 100),
    new PID(20, 0.0, 0.0, 100),
    new PID(20, 0.0, 0.0, 100)
]

class MCAttitude {
    constructor(readonly angles: PID[], readonly rates: PID[]) {

    }

    getMomentsRates(rates: Vector3, ratesSP: Vector3, dt: number): Vector3 {
        let ratesError = rates.clone().sub(ratesSP)
        let moment = ratesError.toArray().map( (rateError, index) => {
                return this.rates[index].update(rateError, dt)
            } )

        // return new (Function.bind.apply(Vector3, moment)) // missing a argument 
        return new Vector3().fromArray(moment)
    }

    getMomentAttitude(attitude:Quaternion, attitudeSP: Quaternion, rates: Vector3, dt: number) {

        let error = attitude.clone().multiply( attitudeSP.clone().conjugate() ) // Full Quaternion Based Attitude Control for a Quadrotor

        if (error.w < 0) { // If q0 < 0 then the desired orientation is more than π radians away and the closest rotation is the conjugate of qerr
            error.conjugate()
        }

        var errorAngles = [error.x, error.y, error.z].map( e => e*-1 ) // error.w

        let ratesSP = errorAngles.map((angleError, index) => {
                return this.angles[index].update(angleError, dt)
            } )

        return this.getMomentsRates(rates, new Vector3().fromArray(ratesSP), dt)
    }
}

export var mcAttitude = new MCAttitude(anglesPIDS, ratesPIDS)
