class AeroSurface {
  constructor(wing, area, symmetric, liftUnitFunc, dragUnitFunc, ) {
    this.wing = wing
    this.area = area
    this.liftUnitFunc = liftUnitFunc // function
    this.dragUnitFunc = dragUnitFunc // function
    this.cl = symmetric ? clSym : clAsym // function
    this.cd = symmetric ? cdSym : cdAsym // function
  }

  update(apKiteWorld, apKiteKite) {
    var ap = this.localApparentWind(apKiteWorld)
    this.alfa = Math.atan2(ap.y, ap.x)
    var liftKiteUnit = this.liftUnitFunc(apKiteKite).normalize()
    var dragKiteUnit = this.dragUnitFunc(apKiteKite).normalize()
    this.calculateForcesInFrame(liftKiteUnit, dragKiteUnit, ap.lengthSq(), this.alfa)
  }

  localApparentWind(apKiteWorld) {
    return apKiteWorld.clone().applyQuaternion(this.wing.getWorldQuaternion().conjugate()).setComponent(2,0)
  }

  calculateForcesInFrame(liftUnit, dragUnit, apSquare, alfa) {
    this.lift = liftUnit.clone().multiplyScalar( 1/2 * rho * apSquare * this.area * this.cl(alfa) )
    this.drag = dragUnit.clone().multiplyScalar( 1/2 * rho * apSquare * this.area * this.cd(alfa) )
  }
}

class RotatingAeroSurface extends AeroSurface {
  constructor(wing, area, symmetric, position, liftUnitFunc, dragUnitFunc) {
    super(wing, area, symmetric, liftUnitFunc, dragUnitFunc)
    this.position = position
  }

  update(apKiteWorld, apKiteKite, angularVelocity) {
    var velWingKite = this.position.clone().cross(angularVelocity).multiplyScalar(-1)
    var apWingKite = apKiteWorld.clone().applyQuaternion(kite.obj.getWorldQuaternion().conjugate()).sub(velWingKite)

    var liftKiteUnit = this.liftUnitFunc(apWingKite).normalize()
    var dragKiteUnit = this.dragUnitFunc(apWingKite).normalize()

    var apWing = apWingKite.clone().applyQuaternion(this.wing.quaternion.clone().conjugate()).setComponent(2,0)
    this.alfa = Math.atan2(apWing.y, apWing.x)

    this.calculateForcesInFrame(liftKiteUnit, dragKiteUnit, apWing.lengthSq(), this.alfa)
    this.totalAero = this.lift.clone().add(this.drag)
  }
}
