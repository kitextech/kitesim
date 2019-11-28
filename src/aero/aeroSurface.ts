import { Mesh, Vector3, Quaternion, Shape, ExtrudeGeometry, MeshLambertMaterial, Group, AxesHelper, ArrowHelper } from 'three'
import { Airfoil } from './aeroData'
import { RHO } from "../other/constants"
import { ForceMoment, Logger } from "../other/util"

export interface AeroSurfaceOptions {
	airfoil: Airfoil
	span: number
	cord: number
	thickness: number
	orientation: Quaternion
	position: Vector3
	vis?: VisualisationOptions
	rotationVector?: Vector3
}

export interface VisualisationOptions {
	mesh?: boolean
	coord?: boolean
	lift?: boolean
	drag?: boolean
	moment?: boolean
}

// Aerosurface
// Default orientation of the Aerosurface is leading edge towards 
// 1. axis (F), spanwise is along 2. axis (R), 
// and the upper surface is towards - 3. axis  (-D) 


export class AeroSurface extends Group {
	surfaceArea: number

	liftArrow?: ArrowHelper
	dragArrow?: ArrowHelper
	momentArrow?: ArrowHelper
	rotationVector?: Vector3
	alfa: number // logging
	apparentWindVelocity: number // logging
	flap: number = 0

	constructor(readonly p: AeroSurfaceOptions, readonly name: string) {
		super()

		if (this.name == "left") {
			Logger.getInstance().addLoggable(this, "wing.left.alfa", "wing.left.apparentVelocity")
		}

		if (this.name == "verticalL") {
			Logger.getInstance().addLoggable(this, "wing.verticalL.alfa", "wing.verticalL.apparentVelocity")
		}

		this.surfaceArea = p.span * p.cord

		this.position.copy(p.position)  // p.position
		this.setRotationFromQuaternion(p.orientation)

		if (p.rotationVector !== undefined) {
			this.rotationVector = p.rotationVector
		}

		if (p.vis !== undefined) {
			if (p.vis.mesh !== undefined && p.vis.mesh) {
				let mesh = this.createMesh(p)
				this.add(mesh) }
			if (p.vis.coord !== undefined && p.vis.coord) {
				this.add(new AxesHelper())
			}
			if (p.vis.lift !== undefined && p.vis.lift) {
				this.liftArrow = new ArrowHelper(new Vector3())
				this.liftArrow.setColor( 0x22aa22 )
				this.add(this.liftArrow )
			}
			if (p.vis.drag !== undefined && p.vis.drag) {
				this.dragArrow = new ArrowHelper(new Vector3())
				this.dragArrow.setColor( 0xaa2222 )
				this.add(this.dragArrow )
			}
			if (p.vis.moment !== undefined && p.vis.moment) {
				this.momentArrow = new ArrowHelper(new Vector3())
				this.add(this.momentArrow )
			}
		}
	}

	setDelta(angle: number) { // Aerodynamic control surface angular deflection. A positive deflection generates a negative moment.
		if (this.rotationVector === undefined) {
			throw "Rotaiton Vector Not defined"
		}
		this.setRotationFromQuaternion(new Quaternion().setFromAxisAngle(this.rotationVector, angle).multiply(this.p.orientation))
	}

	setFlapDeflection(angle: number) { // Aerodynamic control surface angular deflection. A positive deflection generates a negative moment.
		this.flap = angle		
	}

	createMesh(p: AeroSurfaceOptions): Mesh {
		let shape = new Shape()
		shape.moveTo(0, 0)
		shape.lineTo(0, p.thickness)
		if (p.airfoil.symmetric) { shape.lineTo(-p.cord, p.thickness / 2) }
		else { shape.lineTo(-p.cord, 0) }
		shape.lineTo(0, 0)

		let geometry = new ExtrudeGeometry(shape, {
				steps: 1,
				depth: p.span,
				bevelEnabled: false
			}
		)

		geometry.translate(p.cord / 4, - p.thickness / 2, - p.span / 2)
		geometry.rotateX(-Math.PI / 2)

		let material = new MeshLambertMaterial({ color: 0xff0000 })
		let mesh = new Mesh(geometry, material)

		return mesh
	}


	apparentWind_local(apparentWindKite_FRD: Vector3, angularRate_FRD: Vector3): Vector3 {

		let apparentWind_FRD = apparentWindKite_FRD.clone().sub(angularRate_FRD.clone().cross(this.position)) // the position of the aero_surface in the parrent/kite frame
		let apparentWind_local = apparentWind_FRD.clone().applyQuaternion(this.quaternion.clone().conjugate())
		return apparentWind_local
	}

	forceMoment(apparentWindKite_FRD: Vector3, angularRate_FRD: Vector3): ForceMoment { // force in parent coordinate system
		let apparentWind_local = this.apparentWind_local(apparentWindKite_FRD, angularRate_FRD)
		let alfa = Math.atan2(-apparentWind_local.z, -apparentWind_local.x)
		this.alfa = alfa

		let apparentWind_local_perpendicular = apparentWind_local.clone().setY(0)
		this.apparentWindVelocity = apparentWind_local_perpendicular.length()


		let QS = 1 / 2 * RHO * apparentWind_local_perpendicular.lengthSq() * this.surfaceArea
		let liftScalar = (this.p.airfoil.cl(alfa) + this.flap) * QS 
		let dragScalar = this.p.airfoil.cd(alfa + Math.abs(this.flap)) * QS

		let momentScalar = this.p.airfoil.cm(alfa) * QS * this.p.cord

		let lift_local = new Vector3(0, -1, 0).cross(apparentWind_local_perpendicular).normalize().multiplyScalar(liftScalar)
		let drag_local = apparentWind_local_perpendicular.clone().normalize().multiplyScalar(dragScalar)
		let moment_local = new Vector3(0, 1, 0).multiplyScalar(momentScalar)

		let a: [ArrowHelper, Vector3][] = [[this.liftArrow, lift_local], [this.dragArrow, drag_local], [this.momentArrow, moment_local]];
		a.forEach( ([arrow, value]) => {
			if (arrow !== undefined) {
				arrow.setDirection(value.clone().normalize())
				arrow.setLength(value.length())
			}	
		});

		let sumOfForces_local = new Vector3().addVectors(lift_local, drag_local)
		let sumOfForces_FRD = new Vector3().addVectors(lift_local, drag_local).applyQuaternion(this.quaternion)
		let momentFromForces_local = this.position.clone().applyQuaternion(this.quaternion.clone().conjugate()).cross(sumOfForces_local)
		return new ForceMoment(sumOfForces_FRD, new Vector3().addVectors(moment_local, momentFromForces_local).applyQuaternion(this.quaternion))
	}

	getValues(): number[]  {
		return [this.alfa*180/Math.PI, this.apparentWindVelocity]
	}
}