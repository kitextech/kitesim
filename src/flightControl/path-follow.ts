import { Vector2, Vector3, Quaternion, Mesh, BoxGeometry, MeshLambertMaterial, Scene, Euler, Object3D, ArrowHelper } from 'three'
import * as THREE from 'three'
import { PointOnSphere, limit } from '../other/util'
import { Airplane } from '../aero/airplane'

export interface PathFollowState {
    index: number
}

export class PathFollow {
    index: number
    points: Vector2[] = []
    on: boolean = false
    quaternion: Quaternion
    qConjugate: Quaternion
    angleError?: number
    box = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshLambertMaterial({ color: 0xffff00 })
    )

    constructor(tc: PointOnSphere, readonly radius: number, readonly N: number, readonly tehterDistance: number, readonly lookAheadRatio: number, readonly startAngle: number) {
        this.index = Math.floor(startAngle * N / (2*Math.PI))
        this.points = []
        this.N = N

        for (var i = 0; i < this.N; i++) {
            this.points.push(new Vector2(radius * Math.cos(-i / N * 2 * Math.PI), radius * Math.sin(-i / N * 2 * Math.PI)))
        }

        this.quaternion = tc.getQauternion()
        this.qConjugate = this.quaternion.clone().conjugate()
    }

    updateGetRotationRate(position: Vector3, velocity: Vector3) {

        let posLocal2D = this.positionLocal2D(position)
        let velLocal: Vector3 = velocity.applyQuaternion(this.qConjugate).setX(0) // ignore x

        while (posLocal2D.distanceTo(this.points[this.index]) < this.lookAheadRatio * this.radius) {
            this.index = (this.index + 1) % this.N
        }

        let currentHeading = Math.atan2(velLocal.z, velLocal.y)
        let vectorToTarget = this.points[this.index].clone().sub(posLocal2D)
        let angleToPoint = Math.atan2(vectorToTarget.x, vectorToTarget.y)

        let y = new Vector2(velLocal.z, velLocal.y).normalize().dot(vectorToTarget)
        let l2 = vectorToTarget.lengthSq()
        let x = Math.sqrt(l2 - y*y)
        let r = l2/(2*x)

        let rotationRate = velocity.length() / r  // m/s / m  (rad/s)

        this.angleError = ((currentHeading - angleToPoint) * 180 / Math.PI) % 360
        if (this.angleError < -180) this.angleError += 360
        if (this.angleError > 180) this.angleError -= 360

        return Math.sign(this.angleError) * rotationRate * -1 // rotate opposite direction to the error
    }

    updateUI(){
        let target = this.points[this.index]
        this.box.position.copy(new Vector3(this.tehterDistance, target.y, target.x).applyQuaternion(this.quaternion))
    }

    // move position in to local coordinate system
    positionLocal2D(position: Vector3): Vector2 {
        let posLocal3D = position.clone().applyQuaternion(this.qConjugate)
        return new Vector2(posLocal3D.z, posLocal3D.y) // Consider changing coordinate system?
    }

    distanceToPath(position: Vector3): number {
        let pos2d = this.positionLocal2D(position)
        return pos2d.length() - this.radius
    }

    loopProgressAngle(position: Vector3): number {
        let pos2d = this.positionLocal2D(position)
        return Math.PI - Math.atan2(pos2d.y, pos2d.x) // pos 2 coordinate system  is unlogical
    }

    toggle(): void {
        this.on = !this.on
    }

    start(): void {
        this.on = true
    }

    stop(): void {
        this.on = false
    }

    getAngleError(): number {
        return (this.angleError) ? this.angleError : 0
    }

    getState(): PathFollowState {
        return {
            index: this.index
        }
    }

    setState(state: PathFollowState) {
        this.index = state.index
    }

    getCost(position: Vector3): number {
        let dist = this.distanceToPath(position.clone())
        return dist*dist
    }

    getUIObjects(): THREE.Object3D[] {
        var segments = 64,
        material = new THREE.LineBasicMaterial( { color: 0x000000 } ),
        geometry = new THREE.CircleGeometry( this.radius, segments )

        // Remove center vertex
        geometry.vertices.shift()
        let line = new THREE.LineLoop( geometry, material )
        line.setRotationFromQuaternion(this.quaternion)
        line.rotateY(Math.PI/2)
        line.position.copy(new Vector3(this.tehterDistance, 0, 0).applyQuaternion(this.quaternion))

        return [this.box, line]
    }
}