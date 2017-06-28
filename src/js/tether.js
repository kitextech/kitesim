//
// TETHER
//

export class Tether {
  constructor(kite) {
    this.segmentLength = teProp.totalLength/teProp.segments // length of tether,
    this.indexEnd = teProp.segments-1
    this.KIndex1 = teProp.segments
    this.KIndex2 = teProp.segments+1

    this.pos = []
    this.vel = []
    this.mass = []
    this.renderObjects = []

    // intermetiate loop calculation varialbles
    this.segment = []
    this.segmentDir = []
    this.tSegmentLength = []
    this.tSegmentLengthDefault = []
    this.tSegmentStretchVelocity = []

    this.FSpring = []
    this.FDrag = []
    this.FTotal = []

    this.constructMainTether()
    this.constructKiteTether()
    this.updateKiteTetherPosAndVelocity(kite)
  }

  // main tether
  constructMainTether() {
    for (var i = 0; i < teProp.segments; i++) {
      this.tSegmentLengthDefault.push(this.segmentLength)
      this.pos.push(new THREE.Vector3( (i+1) * this.segmentLength, 0, 0 ))
      this.vel.push(new THREE.Vector3( 0, 0, 0 ))

      this.mass.push(this.segmentLength * Math.PI * Math.pow(teProp.diameter/2, 2) * teProp.density)

      this.renderObjects.push(new THREE.Mesh(
        new THREE.BoxGeometry( 1, 1, 1 ),
        new THREE.MeshLambertMaterial( { color: 0xff0000 } )
        ))
      scene.add(  this.renderObjects[i] )

      this.addRowToArray()
    }
  }

  // kite tethers
  constructKiteTether() {
    this.tSegmentLengthDefault.push(teProp.kiteTLength)
    this.tSegmentLengthDefault.push(teProp.kiteTLength)

    // NOTE THIS POSITION AND VELOCITIES WILL BE RECALCULATED ON EVERY FRAME BASED ON KITE POSITION AND ORIENTATION
    this.pos.push() // new THREE.Vector3( tSegmentLength + dx, tetherAttachmentPoint1.y, 0 ))
    this.pos.push() // new THREE.Vector3( tSegmentLength + dx, tetherAttachmentPoint2.y, 0 ))
    this.vel.push() // new THREE.Vector3( 0, 0, 0 ))
    this.vel.push() // new THREE.Vector3( 0, 0, 0 ))

    this.mass.push(teProp.kiteTLength * Math.PI * Math.pow(teProp.diameter/2, 2) * teProp.density)
    this.mass.push(teProp.kiteTLength * Math.PI * Math.pow(teProp.diameter/2, 2) * teProp.density)

    this.addRowToArray()
    this.addRowToArray()
  }

  addRowToArray() {
    this.segment.push(0)
    this.segmentDir.push(0)
    this.tSegmentLength.push(0)
    this.tSegmentStretchVelocity.push(0)

    this.FSpring.push(0)
    this.FDrag.push(0)
    this.FTotal.push(0)
  }

  updateKiteTetherPosAndVelocity(kite) { // use local variables instead
    this.pos[this.KIndex1] = kite.obj.position.clone().add(kite.tetherAttachmentPoint1.clone().applyQuaternion(kite.obj.quaternion))
    this.pos[this.KIndex2] = kite.obj.position.clone().add(kite.tetherAttachmentPoint2.clone().applyQuaternion(kite.obj.quaternion))
    this.vel[this.KIndex1] = kite.velocity.clone().add(kite.tetherAttachmentPoint1.clone().cross(kite.angularVelocity).multiplyScalar(-1).applyQuaternion(kite.obj.quaternion))
    this.vel[this.KIndex2] = kite.velocity.clone().add(kite.tetherAttachmentPoint2.clone().cross(kite.angularVelocity).multiplyScalar(-1).applyQuaternion(kite.obj.quaternion))
  }

  updateTetherPositionAndForces(dt) {

    // First segment
    this.segment[0] = this.pos[0].clone()
    this.segmentDir[0] = this.segment[0].clone().normalize()
    this.tSegmentStretchVelocity[0] = this.segmentDir[0].dot( this.vel[0].clone() ) / this.tSegmentLengthDefault[0]

    // Second to end of tether
    for (var i = 1; i <= this.indexEnd; i++) {
      this.segment[i] = this.pos[i].clone().sub(this.pos[i-1])
      this.segmentDir[i] = this.segment[i].clone().normalize()
      this.tSegmentStretchVelocity[i] = this.segmentDir[i].dot( this.vel[i].clone().sub(this.vel[i-1]) ) / this.tSegmentLengthDefault[i]
    }

    // tethers attached to the kite
    this.segment[this.KIndex1] = this.pos[this.KIndex1].clone().sub( this.pos[this.indexEnd])
    this.segment[this.KIndex2] = this.pos[this.KIndex2].clone().sub( this.pos[this.indexEnd])
    this.segmentDir[this.KIndex1] = this.segment[this.KIndex1].clone().normalize()
    this.segmentDir[this.KIndex2] = this.segment[this.KIndex2].clone().normalize()
    this.tSegmentStretchVelocity[this.KIndex1] = this.segmentDir[this.KIndex1].dot( this.vel[this.KIndex1].clone().sub( this.vel[this.indexEnd] ) ) / this.tSegmentLengthDefault[this.KIndex1]
    this.tSegmentStretchVelocity[this.KIndex2] = this.segmentDir[this.KIndex2].dot( this.vel[this.KIndex2].clone().sub( this.vel[this.indexEnd] ) ) / this.tSegmentLengthDefault[this.KIndex1]

    // all tethers
    for (var i = 0; i <= this.KIndex2; i++) { // calculate forces for main and kite tethers
      var ap = wind.clone().sub( this.vel[i] )
      var apAlongtSegment = this.segmentDir[i].clone().multiplyScalar( this.segmentDir[i].clone().dot(ap) )
      var windPerpendicular = ap.clone().sub( apAlongtSegment )
      var currentLength = this.segment[i].length()
      var tetherStretch = (currentLength - this.tSegmentLengthDefault[i]) / this.tSegmentLengthDefault[i]
      var springConstant = tetherStretch > 0 ? teProp.k0 : teProp.k0_negative

      this.FSpring[i] = this.segmentDir[i].clone().multiplyScalar(- springConstant * ( tetherStretch ) - teProp.d0 * this.tSegmentStretchVelocity[i] )
      this.FDrag[i] = windPerpendicular.multiplyScalar( 1/2 * rho * teProp.diameter * currentLength * teProp.cd * windPerpendicular.length())
    }

    // all tethers except the end and kite tethers
    for (var i = 0; i < this.indexEnd; i++) {
      this.FTotal[i] = this.FSpring[i].clone().sub( this.FSpring[i+1] ).add( this.FDrag[i] )
    }

    // the end tether segment
    this.FTotal[this.indexEnd] = this.FSpring[this.indexEnd].clone()
      .sub(this.FSpring[this.KIndex1])
      .sub(this.FSpring[this.KIndex2])
      .add(this.FDrag[this.indexEnd])

    // update position of the tether
    for (var i = 0; i <= this.indexEnd; i++) {
      var a = this.FTotal[i].divideScalar( this.mass[i] ).add( gravity )
      this.vel[i].add( a.multiplyScalar(dt) )
      this.pos[i].add( this.vel[i].clone().multiplyScalar(dt) )
    }
  }

  kiteTetherForces() {
    return {
      spring1: this.FSpring[this.KIndex1].clone(),
      spring2: this.FSpring[this.KIndex2].clone(),
      drag1: this.FDrag[this.KIndex1].clone(),
      drag2: this.FDrag[this.KIndex2].clone(),
    }
  }
}
