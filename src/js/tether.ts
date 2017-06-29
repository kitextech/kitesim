import { AttachmentPointState, Force, KiteTetherForces } from "./kite"
import { Vector3, Mesh, BoxGeometry, MeshLambertMaterial, Scene } from 'three'
import * as C from "./Constants"

export interface TetherProperties {
  segments: number
  totalLength: number
  kiteTLength: number
  density: number
  diameter: number
  k0: number
  k0_negative: number
  d0: number
  cd: number
}

export let tetherProperties: TetherProperties = {
  segments: 10,
  totalLength: 70,
  kiteTLength: 3, // meter
  density: 950,
  diameter: 0.002,
  k0: 2000, // spring konstant // N per e,
  k0_negative: 0, // spring konstant // N per e,
  d0: 1, // damping,
  cd: 0.95,
}

export class Tether {
  pos: Vector3[] = []
  vel: Vector3[] = []
  mass: number[] = []
  renderObjects: Mesh[] = []

  // intermetiate loop calculation varialbles
  segment: Vector3[] = []
  segmentDir: Vector3[] = []
  tSegmentLength: number[] = []
  tSegmentLengthDefault: number[] = []
  tSegmentStretchVelocity: number[] = []

  FSpring: Vector3[] = []
  FDrag: Vector3[] = []
  FTotal: Vector3[] = []

  segmentLength: number
  indexEnd: number
  KIndex1: number
  KIndex2: number

  // tp: TetherProperties

  constructor(readonly tp: TetherProperties, apState: AttachmentPointState[]) {
    this.segmentLength = tp.totalLength / tp.segments // length of tether,
    this.indexEnd = tp.segments - 1
    this.KIndex1 = tp.segments
    this.KIndex2 = tp.segments + 1

    this.constructMainTether(tp)
    this.constructKiteTether(tp)
    this.updateKiteTetherState(apState)
  }

  // main tether
  constructMainTether(tp: TetherProperties) {
    for (var i = 0; i < tp.segments; i++) {
      this.tSegmentLengthDefault.push(this.segmentLength)
      this.pos.push(new Vector3((i + 1) * this.segmentLength, 0, 0))
      this.vel.push(new Vector3(0, 0, 0))

      this.mass.push(this.segmentLength * Math.PI * Math.pow(tp.diameter / 2, 2) * tp.density)

      this.renderObjects.push(new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshLambertMaterial({ color: 0xff0000 })
      ))
    }
  }

  // kite tethers
  constructKiteTether(tp: TetherProperties) {
    for (var i = 0; i < 2; i++) {
      this.tSegmentLengthDefault.push(tp.kiteTLength)
      this.mass.push(tp.kiteTLength * Math.PI * Math.pow(tp.diameter / 2, 2) * tp.density)
    }
  }

  updateKiteTetherState(apState: AttachmentPointState[]) { // use local variables instead
    let that = this
    function setState(state: AttachmentPointState, i: number) {
      that.pos[i] = state.pos
      that.vel[i] = state.vel
    }

    apState.forEach((state, i) => { setState(state, i + that.KIndex1) })
  }

  updateTetherPositionAndForces(dt: number) {

    // First segment
    this.segment[0] = this.pos[0].clone()
    this.segmentDir[0] = this.segment[0].clone().normalize()
    this.tSegmentStretchVelocity[0] = this.segmentDir[0].dot(this.vel[0].clone()) / this.tSegmentLengthDefault[0]

    // Second to end of tether
    for (var i = 1; i <= this.indexEnd; i++) {
      this.segment[i] = this.pos[i].clone().sub(this.pos[i - 1])
      this.segmentDir[i] = this.segment[i].clone().normalize()
      this.tSegmentStretchVelocity[i] = this.segmentDir[i].dot(this.vel[i].clone().sub(this.vel[i - 1])) / this.tSegmentLengthDefault[i]
    }

    // tethers attached to the kite
    this.segment[this.KIndex1] = this.pos[this.KIndex1].clone().sub(this.pos[this.indexEnd])
    this.segment[this.KIndex2] = this.pos[this.KIndex2].clone().sub(this.pos[this.indexEnd])
    this.segmentDir[this.KIndex1] = this.segment[this.KIndex1].clone().normalize()
    this.segmentDir[this.KIndex2] = this.segment[this.KIndex2].clone().normalize()
    this.tSegmentStretchVelocity[this.KIndex1] = this.segmentDir[this.KIndex1].dot(this.vel[this.KIndex1].clone().sub(this.vel[this.indexEnd])) / this.tSegmentLengthDefault[this.KIndex1]
    this.tSegmentStretchVelocity[this.KIndex2] = this.segmentDir[this.KIndex2].dot(this.vel[this.KIndex2].clone().sub(this.vel[this.indexEnd])) / this.tSegmentLengthDefault[this.KIndex1]

    // all tethers
    for (var i = 0; i <= this.KIndex2; i++) { // calculate forces for main and kite tethers
      let ap = C.WIND.clone().sub(this.vel[i])
      let apAlongtSegment = this.segmentDir[i].clone().multiplyScalar(this.segmentDir[i].clone().dot(ap))
      let windPerpendicular = ap.clone().sub(apAlongtSegment)
      let currentLength = this.segment[i].length()
      let tetherStretch = (currentLength - this.tSegmentLengthDefault[i]) / this.tSegmentLengthDefault[i]
      let springConstant = tetherStretch > 0 ? this.tp.k0 : this.tp.k0_negative

      this.FSpring[i] = this.segmentDir[i].clone().multiplyScalar(- springConstant * (tetherStretch) - this.tp.d0 * this.tSegmentStretchVelocity[i])
      this.FDrag[i] = windPerpendicular.multiplyScalar(1 / 2 * C.RHO * this.tp.diameter * currentLength * this.tp.cd * windPerpendicular.length())
    }

    // all tethers except the end and kite tethers
    for (var i = 0; i < this.indexEnd; i++) {
      this.FTotal[i] = this.FSpring[i].clone().sub(this.FSpring[i + 1]).add(this.FDrag[i])
    }

    // the end tether segment
    this.FTotal[this.indexEnd] = this.FSpring[this.indexEnd].clone()
      .sub(this.FSpring[this.KIndex1])
      .sub(this.FSpring[this.KIndex2])
      .add(this.FDrag[this.indexEnd])

    // update position of the tether
    for (var i = 0; i <= this.indexEnd; i++) {
      var a = this.FTotal[i].divideScalar(this.mass[i]).add(C.GRAVITY)
      this.vel[i].add(a.multiplyScalar(dt))
      this.pos[i].add(this.vel[i].clone().multiplyScalar(dt))
    }
  }

  kiteTetherForces(): KiteTetherForces {
    return {
      spring1: this.FSpring[this.KIndex1].clone(),
      spring2: this.FSpring[this.KIndex2].clone(),
      drag1: this.FDrag[this.KIndex1].clone(),
      drag2: this.FDrag[this.KIndex2].clone(),
    }
  }

  getKiteTetherMass(): number {
    return this.mass[this.KIndex1] + this.mass[this.KIndex2]
  }
}
