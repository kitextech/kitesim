import { PID, PointOnSphere } from '../other/util'
import { Euler, Quaternion, Vector3 } from 'three'

var posYPID = new PID(1, 0.0, 0.0, 500)
var velYPID = new PID(0.1, 0.0, 0.0, 500)

var posHeadingPID = new PID(20, 0.0, 0.0, 500)
var velHeadingPID = new PID(0.2, 0.0, 0.0, 500)

export class MCPosition {

    pitchGoal_hover = -15/180*Math.PI; 
    constructor() { }

    getThrust(ps: PointOnSphere, vel: Vector3, pos: Vector3, dt: number): number {
        
        let distR = Math.sqrt(pos.x*pos.x + pos.y*pos.y)
        let posZError = -Math.tan( ps.altitude ) * distR - pos.z
        let velSP = posYPID.update(posZError, dt)
        let velYError = velSP - vel.z

        let baseThrust = 0.5
        return baseThrust - velYPID.update(velYError, dt)
    }

    getAttiude(psSP: PointOnSphere, vel: Vector3, pos: Vector3, dt: number): Quaternion  {

        let currentHeading = Math.atan2(pos.y, pos.x)

        let posHeadingError = psSP.heading - currentHeading
        if (posHeadingError < - Math.PI) {
            posHeadingError += 2* Math.PI
        }

        if (posHeadingError > Math.PI) {
            posHeadingError -= 2* Math.PI
        }

        let velSP = posHeadingPID.update(posHeadingError, dt)  // radians to m/s along ground plane // posive around Z

        let posNE = pos.clone().setZ(0)
        let velNE = vel.clone().setZ(0)
        let velNETangential3D = posNE.clone().normalize().cross(velNE)
        let velNETangentertial = velNETangential3D.z
        let velHeadingError = velSP - velNETangentertial

        let euler = new Euler( velHeadingPID.update(velHeadingError, dt), this.pitchGoal_hover, currentHeading, 'ZYX')

        return new Quaternion().setFromEuler(euler)
    }
}

export var mcPosition = new MCPosition()
