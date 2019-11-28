import { PID } from '../other/util'
import { Quaternion, Vector3 } from 'three'


var anglesPIDS = [
    new PID(1,0.1,0.0,100),
    new PID(1,0.1,0.0,100),
    new PID(1,0.1,0.0,100)
]

var ratesPIDS = [
    new PID(1, 0.01, 0.0, 10),
    new PID(1, 0.01, 0.0, 10),
    new PID(1, 0.01, 0.0, 10)
]

export class MCAttitude {
    constructor(readonly angles: PID[], readonly rates: PID[]) {
    }

    getMomentsRates(rates: Vector3, ratesSP: Vector3, dt: number): Vector3 {
        let ratesError = ratesSP.clone().sub(rates)
        let moment = ratesError.toArray().map( (rateError, index) => {
                return this.rates[index].update(rateError, dt) //                 return this.rates[index].update(rateError, dt)

            } )
        return new Vector3().fromArray(moment)
    }

    getRatesSP(attitude:Quaternion, attitudeSP: Quaternion, dt: number): Vector3 {
        let errorG = attitudeSP.clone().multiply( attitude.clone().conjugate() ) // Full Quaternion Based Attitude Control for a Quadrotor

        let errorBody = attitude.clone().conjugate().multiply(errorG).multiply(attitude.clone())

        if (errorBody.w < 0) { // If q0 < 0 then the desired orientation is more than π radians away and the closest rotation is the conjugate of qerr
            errorBody.conjugate()
        }
        let angle = 2 * Math.acos(errorBody.w)
        let modifier = angle / Math.sqrt(1 - errorBody.w*errorBody.w) // http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/
        var errorAngles = [errorBody.x, errorBody.y, errorBody.z].map( e => e*modifier ) // error.w

        let ratesSP = errorAngles.map((angleError, index) => {
                return this.angles[index].update(angleError, dt) //                 return this.angles[index].update(angleError, dt)
            } )

        return new Vector3().fromArray(ratesSP)
    }
}

export var mcAttitude = new MCAttitude(anglesPIDS, ratesPIDS)
