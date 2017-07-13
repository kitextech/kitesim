import { PID, PointOnSphere } from './util'
import { Euler, Quaternion, Vector2, Vector3 } from 'three'

var posYPID = new PID(1, 0.0, 0.0, 500)
var velYPID = new PID(0.1, 0.0, 0.0, 500)

var posHeadingPID = new PID(0.3, 0.0, 0.0, 500)
var velHeadingPID = new PID(0.1, 0.0, 0.0, 500)


export class MCPosition {
    constructor() {

    }

    getThrust(ps: PointOnSphere, vel: Vector3, pos: Vector3, dt): number {
        let posYError = Math.sin( ps.altitude/180 * Math.PI ) * 100 - pos.y
        let velSP = posYPID.update(posYError, dt)
        let velYError = velSP - vel.y
        let baseThrust = 0.5
        return baseThrust + velYPID.update(velYError, dt)
    }

    getAttiude(psSP: PointOnSphere, vel: Vector3, pos: Vector3, dt): Quaternion  {

        let currentHeading = Math.atan2(pos.z, pos.x)
        let posHeadingError = psSP.heading/180 * Math.PI - currentHeading
        if (posHeadingError < - Math.PI) {
            posHeadingError += 2* Math.PI
        }

        if (posHeadingError > Math.PI) {
            posHeadingError -= 2* Math.PI
        }

        let velSP = posHeadingPID.update(posHeadingError * 100, dt)  // radians to m/s
        
        let posXZ = pos.clone().setComponent(1,0)
        let velXZ = vel.clone().setComponent(1,0)
        let velXZTangential3D = posXZ.clone().normalize().cross(velXZ)
        let velXZTangential = -velXZTangential3D.y

        let velHeadingError = velSP - velXZTangential

        let euler = new Euler( Math.PI/2 + velHeadingPID.update(velHeadingError, dt), 0, 0, 'XYZ')

        return new Quaternion().setFromEuler(euler)
    }
}

export var mcPosition = new MCPosition()
