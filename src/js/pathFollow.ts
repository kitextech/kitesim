import { Vector2, Vector3, Quaternion, Euler, ArrowHelper, Mesh, BoxGeometry, MeshLambertMaterial, Scene } from 'three'
import { AeroSurfaceRotating } from './aeroSurface'

export class PointOnSphere {
    constructor(readonly heading: number, readonly altitude: number) { }
}

export class PathFollow {
    index: number
    lookAheadDistance: number
    points: Vector2[] = []
    on: boolean = false
    quaternion: Quaternion
    qConjugate: Quaternion
    box: Mesh
    angleError?: number

    constructor(tc: PointOnSphere, radius: number, readonly N: number, readonly rudder: AeroSurfaceRotating, readonly scene: Scene) {
        this.index = Math.floor(N / 2)
        this.lookAheadDistance = radius * 0.9
        this.points = []
        this.N = N
        this.rudder = rudder

        for (var i = 0; i < this.N; i++) {
            this.points.push(new Vector2(radius * Math.cos(-i / N * 2 * Math.PI), radius * Math.sin(-i / N * 2 * Math.PI)))
        }

        this.quaternion = new Quaternion().setFromEuler(
            new Euler(0, tc.heading / 180 * Math.PI, tc.altitude / 180 * Math.PI, 'YZX')
        )
        this.qConjugate = this.quaternion.clone().conjugate()

        var pointer = new ArrowHelper(
            new Vector3(1, 0, 0).applyQuaternion(this.quaternion),
            new Vector3(0, 0, 0),
            10,
            0xff0000)

        scene.add(pointer)

        this.box = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshLambertMaterial({ color: 0xffff00 })
        )
        scene.add(this.box)

        this.setUpListener()
    }

    update(position, velocity) {

        // move position in to local coordinate system
        let posLocal3D = position.applyQuaternion(this.qConjugate)
        let posLocal2D = new Vector2(posLocal3D.z, posLocal3D.y)

        let velLocal = velocity.applyQuaternion(this.qConjugate).setComponent(0, 0) // ignore x

        while (posLocal2D.distanceTo(this.points[this.index]) < this.lookAheadDistance) {
            this.index = (this.index + 1) % this.N
        }

        let target = this.points[this.index]
        let tw = new Vector3(75, target.y, target.x).applyQuaternion(this.quaternion)

        this.box.position.set(tw.x, tw.y, tw.z)

        let currentHeading = Math.atan2(velLocal.z, velLocal.y)
        let vectorToTarget = this.points[this.index].clone().sub(posLocal2D)
        let angleToPoint = Math.atan2(vectorToTarget.x, vectorToTarget.y)

        this.angleError = ((currentHeading - angleToPoint) * 180 / Math.PI) % 360
        if (this.angleError < -180) this.angleError += 360
        if (this.angleError > 180) this.angleError -= 360

        let deltaAngle = Math.min(Math.max(-this.angleError / 8, -12), 12) - 8

        if (this.on) {
            this.rudder.mesh.setRotationFromEuler(new Euler(0, - Math.PI / 2, deltaAngle / 180 * Math.PI), 'XYZ')
        }
    }

    toggle() {
        this.on = !this.on
    }

    setUpListener() {
        var self = this
        document.addEventListener('keydown', function (e) {
            var key = e.keyCode || e.which;
            if (key === 81) {
                self.toggle()
            }
        }, false);
    }
}