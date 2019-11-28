// three.js
import * as THREE from 'three'
import { Vector3, Mesh, BoxGeometry, MeshLambertMaterial, Quaternion, Euler } from 'three'
import { Airplane } from "../aero/airplane"
import { PID, PointOnSphere, getPointOnSphere, degToRad, Logger, Loggable, limit } from '../other/util'
import { PathFollow, PathFollowState } from './path-follow'

import { mcAttitude, MCAttitude } from './mc-attitude'
import { mcPosition, MCPosition } from './mc-position'
import { FWAttitude } from './fw-attitude'
import { VTOL, VTOL_StraightUp, VTOL_TransitionAlgo } from './vtol'
import { TetherOptions } from '../other/tether'

export enum FlightControlellerType {
    Default
}

export interface ControllerOptions {
    velocitySp: number,
    velocityP?: number,
    angleOfAttackP?: number,
    type: FlightControlellerType,
    radius?: number
    angle?: number
    lookAhead?: number
    headingOffset?: number,
    VTOLalgo?: VTOL_TransitionAlgo
}

// Pathfollowing 
export enum FlightMode {
    Position,
    TransitionForward,
    PathFollow,
    TransitionBackward
}

interface FlightModeControllerState {
    pf: PathFollowState
}

export interface FlightModeControllerInterface extends Loggable {
    updateUI(): void
    getUIObjects(): THREE.Object3D[]
    update(dt: number): void
    getMoment(dt: number): Vector3
    adjustThrust(dt: number): void
    autoAdjustMode(): void
    upDownLeftRight(updown: number, leftRight: number): void 
    setTarget(pos: Vector3): void
}

export function getFlightController(controllerOptions: ControllerOptions, aircraft: Airplane, tp: TetherOptions): FlightModeControllerInterface {
    switch (controllerOptions.type) {
        case FlightControlellerType.Default:
            return new FlightModeController(controllerOptions, aircraft, tp.totalLength)
        default:
            throw "Controller type doesn't exist";
    }
}

export class FlightModeController implements FlightModeControllerInterface {
    pf: PathFollow
    mcAttitude: MCAttitude = mcAttitude
    mcPosition: MCPosition = mcPosition
    fwAttitude: FWAttitude = new FWAttitude()
    vtol: VTOL
    velocityPID = new PID(0.05, 0.01, 0.00, 100)
    angleOfAttackPID =  new  PID(3.6,0,0, 10)
    velocitySp = 20
    hoverTarget = new PointOnSphere(degToRad(30), degToRad(10))
    moment: Vector3
    angle = 30
    radius = 20
    lookAhead = 0.9

    attitudeSPHelper = new THREE.AxesHelper( 5 )
    momentArrow = new THREE.ArrowHelper( new Vector3(1,0,0), new Vector3(0,0,0), 1, 0xff00ff)

    mode: FlightMode = FlightMode.Position 

    constructor(controllerOptions: ControllerOptions, readonly aircraft: Airplane, readonly tetherLength: number) {
        this.velocitySp = controllerOptions.velocitySp
        if (controllerOptions.velocityP != undefined) { this.velocityPID.p = controllerOptions.velocityP}
        if (controllerOptions.angleOfAttackP != undefined) { this.angleOfAttackPID.p = controllerOptions.angleOfAttackP}        
        if (controllerOptions.radius != undefined) { this.radius = controllerOptions.radius}
        if (controllerOptions.angle != undefined) { this.angle = controllerOptions.angle}
        if (controllerOptions.lookAhead != undefined) { this.lookAhead = controllerOptions.lookAhead}
        let headingOffset = controllerOptions.headingOffset != undefined ? controllerOptions.headingOffset : 0
        let vtolAlgo = controllerOptions.VTOLalgo != undefined ? controllerOptions.VTOLalgo : VTOL_TransitionAlgo.default

        this.vtol = new VTOL(5, headingOffset, vtolAlgo)
        this.pf = new PathFollow( new PointOnSphere(degToRad(0), degToRad(this.angle)), this.radius, 40, this.tetherLength, this.lookAhead, 0) // this.aircraft.aeroSurfaces['rudder']

        aircraft.add(this.momentArrow)  // visual helper on kite
        Logger.getInstance().addLoggable(this, "pf.pathError", "pf.loopProgressAngle")
        this.attitudeSPHelper.visible = false // debug
    }

    upDownLeftRight(updown: number, leftRight: number) {}
    setTarget(pos: Vector3) {}

    updateUI() {
        this.pf.updateUI()

        if (this.moment.x != 0) {
            // temporary for logging
            this.momentArrow.setDirection(this.moment.clone().normalize())
            this.momentArrow.setLength(this.moment.length())
            this.momentArrow.visible = true
        } else {
            this.momentArrow.visible = false
        }
    }

    getValues(): number[] {
        return [this.pf.distanceToPath(this.aircraft.position), this.pf.loopProgressAngle(this.aircraft.position)]
    }

    getUIObjects(): THREE.Object3D[]  {
        let box = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshLambertMaterial({ color: 0xffff00 })
        )
        box.position.copy(new Vector3(75, 0, 0).applyQuaternion(this.hoverTarget.getQauternion()))        
        return [<THREE.Object3D>this.attitudeSPHelper, box].concat(this.pf.getUIObjects())
    }

    update(dt: number) {
        this.vtol.updateRatio(dt)
    }

    getMoment(dt: number): Vector3 {
        switch (this.mode) {
            case FlightMode.Position:
                var attitudeSP = this.mcPosition.getAttiude( this.hoverTarget, this.aircraft.velocity_NED, this.aircraft.position, dt)
                var ratesSP = this.mcAttitude.getRatesSP( this.aircraft.quaternion, attitudeSP, dt )
                this.moment = mcAttitude.getMomentsRates(this.aircraft.rotationRate_FRD, ratesSP, dt)
                this.aircraft.aeroSurfaces["elevator"].setDelta( Math.PI/2 ) // - 8

                //visualisation
                this.attitudeSPHelper.setRotationFromQuaternion(attitudeSP)
                this.attitudeSPHelper.position.copy(this.aircraft.position)

                break;

            case FlightMode.TransitionForward:
                var attitudeSP = this.vtol.getAttitudeForward(this.aircraft.quaternion, this.aircraft.position, this.aircraft.velocity_NED)
                var ratesSP = this.mcAttitude.getRatesSP( this.aircraft.quaternion, attitudeSP, dt )
                this.moment = mcAttitude.getMomentsRates(this.aircraft.rotationRate_FRD, ratesSP, dt).multiplyScalar(1-this.vtol.getAirspeedRadio(this.aircraft.velocity_NED))    
                
                var angle = this.fwAttitude.getRudderAngle(ratesSP.x, this.aircraft.rotationRate_FRD.x, dt)
                var angle = Math.max(-16, Math.min(16, angle))/2

                this.aircraft.aeroSurfaces["rudder"].setDelta(angle / 180 * Math.PI ) // 
                let elevatorAngle = Math.PI/2 * (1-this.vtol.getAirspeedRadio(this.aircraft.velocity_NED))
                this.aircraft.aeroSurfaces["elevator"].setDelta( elevatorAngle ) // - 8

                //visualisation
                this.attitudeSPHelper.setRotationFromQuaternion(attitudeSP)
                this.attitudeSPHelper.position.copy(this.aircraft.position)
                break;

            case FlightMode.PathFollow:
                // the pathfllowing algorithm will adjust the rudder give the input. It's currently turned on by toggleing 'q'
                var rotationRate = this.pf.updateGetRotationRate(this.aircraft.position.clone(), this.aircraft.velocity_NED.clone()) // internally mofified the rudder angle
                var angle = this.fwAttitude.getRudderAngle(rotationRate, this.aircraft.rotationRate_FRD.x, dt)
                var angle = Math.max(-16, Math.min(16, angle))

                this.aircraft.aeroSurfaces["rudder"].setDelta(angle / 180 * Math.PI ) // - 8
                this.aircraft.aeroSurfaces["elevator"].setDelta( - this.angleOfAttackPID.update( this.aircraft.aeroSurfaces["left"].alfa - 8 / 180 * Math.PI , dt ))
                break;
            case FlightMode.TransitionBackward:
                this.mode = FlightMode.Position
                this.aircraft.aeroSurfaces["elevator"].setDelta(Math.PI)
                break;

            default:
                break;
        }
        this.moment = this.moment.max(new Vector3(-1,-1, -0.1)).min( new Vector3(1, 1, 0.1)).multiplyScalar(this.aircraft.maxMoment)
        return this.moment
    }

    adjustThrust(dt: number) {
        switch (this.mode) {
            case FlightMode.Position:
                this.aircraft.setThrust( 
                    this.mcPosition.getThrust( 
                        this.hoverTarget, 
                        this.aircraft.velocity_NED, 
                        this.aircraft.position, 
                        dt ) 
                    ) 
                break;

            case FlightMode.TransitionForward:
                this.aircraft.setThrust( this.vtol.getThrust() )
                break;

            case FlightMode.PathFollow:
                let pidresult = this.velocityPID.update( this.velocitySp - this.aircraft.velocity_NED.length() , dt)
                // this.aircraft.adjustThrustBy( pidresult )
                this.aircraft.setThrust(pidresult)

                break;
            case FlightMode.TransitionBackward:
                this.mode = FlightMode.Position
                break;

            default:
                break;
        }

    }

    autoAdjustMode() {
        switch (this.mode) {
            case FlightMode.Position:
                if (getPointOnSphere(this.aircraft.position).distanceSimplifed( this.hoverTarget) < 0.2 ) { // rad
                    this.mode = FlightMode.TransitionForward
                    this.vtol.start(this.aircraft.quaternion, this.aircraft.thrust)
                }                     
                break;
            case FlightMode.TransitionForward:
                if (this.vtol.getAirspeedRadio(this.aircraft.velocity_NED) >= 1) {
                    this.mode = FlightMode.PathFollow
                    this.pf.start()
                } 
                break;
            default:
                break;
        }
    }
}