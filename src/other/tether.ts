import { AttachmentPointState, AttachmentPointForces } from "../aero/airplane"
import { Vector3, Mesh, BoxGeometry, MeshLambertMaterial, Line, LineBasicMaterial, Geometry } from 'three'
import * as C from "./constants"
import { Logger } from "./util";


export interface TetherOptions {
  segments: number
  totalLength: number
  kiteTLength: number
  density: number
  diameter: number
  youngsModolus: number
  // k0: number
  k0_negative: number
  d0: number
  cd: number
  origin: Vector3
  direction: Vector3
}

interface TetherState {
  pos: Vector3[]
  vel: Vector3[]
}

export let tetherPropertiesKX40: TetherOptions = {
  segments: 10,
  totalLength: 120,
  kiteTLength: 8, // meter
  density: 950,
  diameter: 0.01,
	youngsModolus: 80e8, // 67% of SK75  fiber  // FIXME
  k0_negative: 0, // spring konstant // N per e,
  d0: 30, // damping,
  cd: 0.95,
  origin: new Vector3(0,0,-10),
  direction: new Vector3(1,0,0)
}

export class Tether {
  pos: Vector3[] = []
  vel: Vector3[] = []
  mass: number[] = []
  renderObjects: Mesh[] = []

  // intermetiate loop calculation varialbles
  segment: Vector3[] = []
  segmentDir: Vector3[] = []
  tSegmentLengthDefault: number[] = []
  tSegmentStretchVelocity: number[] = []

  FSpring: Vector3[] = []
  FDrag: Vector3[] = []
  FTotal: Vector3[] = []

  k0: number
  segmentLength: number
  indexEnd: number
  KIndex1: number
  KIndex2: number

  lineGeometryMain: Geometry
  lineGeometryKite: Geometry

  lineMain: Line
  lineKite: Line

  // tp: TetherProperties

  constructor(readonly tp: TetherOptions, apState: AttachmentPointState[]) {
    
    this.segmentLength = (tp.totalLength-tp.kiteTLength) / tp.segments // length of tether,
    this.indexEnd = tp.segments - 1
    this.KIndex1 = tp.segments
    this.KIndex2 = tp.segments + 1

    let crossSectionArea = Math.PI * Math.pow(tp.diameter / 2, 2)
    this.k0 = crossSectionArea * tp.youngsModolus 

    this.constructMainTether(tp)
    this.constructKiteTether(tp, apState)
    this.updateStateBasedOnKitePosition(apState)
    this.constructLineGeometry()

    let springForcesNames = Array(tp.segments+2).fill(0).map( (_,i) => "spring_" + i )

    Logger.getInstance().addLoggable(this, ...springForcesNames)//...["tether.groundForce"].concat(springForcesNames) )

  }

  // main tether
  constructMainTether(tp: TetherOptions) {
    for (var i = 0; i < tp.segments; i++) {
      this.tSegmentLengthDefault.push(this.segmentLength)
      this.pos.push( this.tp.direction.clone().multiplyScalar( (i + 1) * this.segmentLength).add(this.tp.origin)  )
      this.vel.push(new Vector3(0, 0, 0))
      this.mass.push(this.segmentLength * Math.PI * Math.pow(tp.diameter / 2, 2) * tp.density)
      let boxSize = this.tp.totalLength / 150
      this.renderObjects.push(new Mesh(
        new BoxGeometry(boxSize, boxSize, boxSize),
        new MeshLambertMaterial({ color: 0xFF6400 })
      ))
    }
  }

  // kite tethers
  constructKiteTether(tp: TetherOptions, ap: AttachmentPointState[]) {
    let mainEndPoint = this.pos[this.indexEnd]
    
    for (var i = 0; i < 2; i++) {
      this.tSegmentLengthDefault.push(ap[i].pos.clone().sub(mainEndPoint).length())
      this.mass.push(this.tSegmentLengthDefault[this.indexEnd+1+i] * Math.PI * Math.pow(tp.diameter / 2, 2) * tp.density)
    }
  }

  constructLineGeometry() {
    this.lineGeometryMain = new Geometry();
    this.lineGeometryKite = new Geometry();
    
    this.lineGeometryMain.vertices.push( this.tp.origin )
    for (var i = 0; i <= this.indexEnd; i++) {
      this.lineGeometryMain.vertices.push( this.pos[i] )
    }

    this.lineGeometryKite.vertices.push(
      this.pos[this.KIndex1],
      this.pos[this.indexEnd],
      this.pos[this.KIndex2]
    )

    // line
    let material = new LineBasicMaterial({ color: 0xFF6400 })
    this.lineMain = new Line( this.lineGeometryMain, material )
    this.lineKite = new Line( this.lineGeometryKite, material );
  }

  updateStateBasedOnKitePosition(apState: AttachmentPointState[]) { // use local variables instead
    let that = this
    function setState(state: AttachmentPointState, i: number) {
      that.pos[i] = state.pos
      that.vel[i] = state.vel
    }

    apState.forEach((state, i) => { setState(state, i + that.KIndex1) })
  }

  updateForcesAndPosition(dt: number, wind: Vector3) {

    // First segment
    this.segment[0] = this.pos[0].clone().sub(this.tp.origin)
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
    this.tSegmentStretchVelocity[this.KIndex2] = this.segmentDir[this.KIndex2].dot(this.vel[this.KIndex2].clone().sub(this.vel[this.indexEnd])) / this.tSegmentLengthDefault[this.KIndex2]

    // all tethers
    for (var i = 0; i <= this.KIndex2; i++) { // calculate forces for main and kite tethers
      let ap = wind.clone().sub(this.vel[i])
      let apAlongtSegment = this.segmentDir[i].clone().multiplyScalar(this.segmentDir[i].clone().dot(ap))
      let windPerpendicular = ap.clone().sub(apAlongtSegment)
      let currentLength = this.segment[i].length()
      let tetherStretch = (currentLength - this.tSegmentLengthDefault[i]) / this.tSegmentLengthDefault[i]
      let springConstant = tetherStretch > 0 ? this.k0 : this.tp.k0_negative

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

  kiteTetherForces_NED(): AttachmentPointForces {
    return {
      point1: this.FSpring[this.KIndex1].clone().add(this.FDrag[this.KIndex1]),
      point2: this.FSpring[this.KIndex2].clone().add(this.FDrag[this.KIndex2])
    }
  }

  getKiteTetherMass(): number {
    return this.mass[this.KIndex1] + this.mass[this.KIndex2]
  }

  updateUI() {
    this.updateLineUI()
    this.renderObjects.forEach( (mesh, i) => {
      mesh.position.copy(this.pos[i])
    })
  }

  updateLineUI() {
    for (var i = 0; i <= this.indexEnd; i++) {
      this.lineGeometryMain.vertices[i+1] = this.pos[i]
    }
    this.lineGeometryMain.verticesNeedUpdate = true

    this.lineGeometryKite.vertices[0] = this.pos[this.KIndex1]
    this.lineGeometryKite.vertices[1] = this.pos[this.indexEnd]
    this.lineGeometryKite.vertices[2] = this.pos[this.KIndex2]
    this.lineGeometryKite.verticesNeedUpdate = true
  }

  getUIObjects(): THREE.Object3D[] {
    return [(<THREE.Object3D>this.lineMain), this.lineKite].concat(this.renderObjects)
  }

  getValues(): number[] {
    return this.FSpring.map( v => v.length())
  }

  getState(): TetherState {
    return {
      pos: this.pos,
      vel: this.vel
    }
  }

  setState(state: TetherState) {
    this.pos = state.pos
    this.vel = state.vel
  }
}
