import { Mesh, Vector3 } from 'three'
import { clSym, cdSym, clAsym, cdAsym } from './aeroData'
import { Kite, WingProperties } from './kite'
import * as C from "./Constants" 

export abstract class AeroSurfaceBase {
  // readonly wing: Mesh
  // area: number
  readonly liftUnitFunc: (Vector3) => Vector3
  readonly dragUnitFunc: (Vector3) => Vector3
  cl: (number) => number
  cd: (number) => number
  alfa?: number
  lift?: Vector3
  drag?: Vector3

  constructor( readonly mesh: Mesh, readonly prop: WingProperties, liftUnitFunc, dragUnitFunc) {
    // this.wing = wing
    // this.area = area
    this.liftUnitFunc = liftUnitFunc
    this.dragUnitFunc = dragUnitFunc
    this.cl = prop.sym ? clSym : clAsym
    this.cd = prop.sym ? cdSym : cdAsym
  }

  localApparentWind(apKiteWorld: Vector3): Vector3 {
    return apKiteWorld.clone().applyQuaternion(this.mesh.getWorldQuaternion().conjugate()).setComponent(2,0)
  }

  calculateForcesInFrame(liftUnit: Vector3, dragUnit: Vector3, apSquare: number, alfa: number) {
    this.lift = liftUnit.clone().multiplyScalar( 1/2 * C.RHO * apSquare * this.prop.area * this.cl(alfa) )
    this.drag = dragUnit.clone().multiplyScalar( 1/2 * C.RHO * apSquare * this.prop.area * this.cd(alfa) )
  }
}

export class AeroSurface extends AeroSurfaceBase {
  constructor(mesh, prop, liftUnitFunc, dragUnitFunc) {
    super(mesh, prop, liftUnitFunc, dragUnitFunc)
  }
  
  update(apKiteWorld: Vector3, apKiteKite: Vector3) {
    var ap = this.localApparentWind(apKiteWorld)
    this.alfa = Math.atan2(ap.y, ap.x)
    var liftKiteUnit = this.liftUnitFunc(apKiteKite).normalize()
    var dragKiteUnit = this.dragUnitFunc(apKiteKite).normalize()
    this.calculateForcesInFrame(liftKiteUnit, dragKiteUnit, ap.lengthSq(), this.alfa)
  }
}

export class AeroSurfaceRotating extends AeroSurfaceBase {
  totalAero?: Vector3

  constructor(mesh, prop, liftUnitFunc, dragUnitFunc) {
    super(mesh, prop, liftUnitFunc, dragUnitFunc)
  }

  update(apKiteWorld: Vector3, apKiteKite: Vector3, kite: Kite) {
    var velWingKite = this.prop.position.clone().cross(kite.angularVelocity).multiplyScalar(-1)
    var apWingKite = apKiteWorld.clone().applyQuaternion(kite.obj.getWorldQuaternion().conjugate()).sub(velWingKite)

    var liftKiteUnit = this.liftUnitFunc(apWingKite).normalize()
    var dragKiteUnit = this.dragUnitFunc(apWingKite).normalize()

    var apWing = apWingKite.clone().applyQuaternion(this.mesh.quaternion.clone().conjugate()).setComponent(2,0)
    this.alfa = Math.atan2(apWing.y, apWing.x)

    this.calculateForcesInFrame(liftKiteUnit, dragKiteUnit, apWing.lengthSq(), this.alfa)
    this.totalAero = this.lift.clone().add(this.drag)
  }
}
