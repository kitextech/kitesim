import { Vector2, Vector3, Quaternion, Euler, ArrowHelper, Mesh, BoxGeometry, MeshLambertMaterial, Scene } from 'three'
import * as THREE from 'three'
import { AeroSurfaceRotating } from './aeroSurface'
import { PointOnSphere } from './util'

export interface PathFollowState {
    index: number
}

export class PathFollow {
    index: number
    lookAheadRatio: number = 0.9
    points: Vector2[] = []
    on: boolean = false
    quaternion: Quaternion
    qConjugate: Quaternion
    box: Mesh
    angleError?: number

    constructor(tc: PointOnSphere, readonly radius: number, readonly N: number, readonly rudder: AeroSurfaceRotating, readonly scene: Scene) {
        this.index = Math.floor(N / 2)
        this.points = []
        this.N = N
        this.rudder = rudder

        for (var i = 0; i < this.N; i++) {
            this.points.push(new Vector2(radius * Math.cos(-i / N * 2 * Math.PI), radius * Math.sin(-i / N * 2 * Math.PI)))
        }

        this.quaternion = new Quaternion().setFromEuler(
            new Euler(0, -tc.heading, tc.altitude, 'YZX')
        )
        this.qConjugate = this.quaternion.clone().conjugate()

        this.box = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshLambertMaterial({ color: 0x326B34 })
        )
        //scene.add(this.box)

        var segments = 64,
        material = new THREE.LineBasicMaterial( { color: 0xFFFFFF } ),
        geometry = new THREE.CircleGeometry( radius, segments )

        // Remove center vertex
        geometry.vertices.shift()
        var line = new THREE.LineLoop( geometry, material )
        line.setRotationFromQuaternion(this.quaternion)
        line.rotateY(Math.PI/2)
        let rc = new Vector3(75, 0, 0).applyQuaternion(this.quaternion)
        line.position.set(rc.x, rc.y, rc.z)
        // line.quaternion.set(this.quaternion.x, this)


        // line.applyQuaternion
        scene.add( line )
    }

    updateGetRotationRate(position: Vector3, velocity: Vector3) {

        let posLocal2D = this.positionLocal2D(position)
        let velLocal: Vector3 = velocity.applyQuaternion(this.qConjugate).setComponent(0, 0) // ignore x

        while (posLocal2D.distanceTo(this.points[this.index]) < this.lookAheadRatio * this.radius) {
            this.index = (this.index + 1) % this.N
        }

        let target = this.points[this.index]
        let tw = new Vector3(75, target.y, target.x).applyQuaternion(this.quaternion)

        this.box.position.set(tw.x, tw.y, tw.z)

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

        // let deltaAngle = Math.min(Math.max(-this.angleError / 8, -12), 12) - 8

        return Math.sign(this.angleError) * rotationRate * -1 // rotate opposite direction to the error

        // if (this.on) {
            // this.rudder.mesh.setRotationFromEuler(new Euler(0, - Math.PI / 2, deltaAngle / 180 * Math.PI), 'XYZ')
        // }
    }

    // move position in to local coordinate system
    positionLocal2D(position: Vector3): Vector2 {
        let posLocal3D = position.applyQuaternion(this.qConjugate)
        return new Vector2(posLocal3D.z, posLocal3D.y)
    }

    distanceToPath(position: Vector3): number {
        let pos2d = this.positionLocal2D(position)
        return pos2d.length() - this.radius
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
}