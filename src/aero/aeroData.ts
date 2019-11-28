import {DU96W180_Cl_raw, DU96W180_Cd_raw, NACA0012_Cl_raw, NACA0012_Cd_raw, DU_97_W_300_Cm_raw} from "./airfoilDataRaw"

// precalculate a value for each angle (360 degrees)
function precalculate(data: number[][], indexLimit: number = 360): number[] {
  var result: number[] = []

  var index = 1

  for (var i = 0; i < indexLimit; i++) {
    while (i > data[index][0]) {
      index += 1
    }

    var ratio = (i - data[index-1][0]) / (data[index][0] - data[index-1][0])
    result.push( data[index-1][1] * (1-ratio) + data[index][1] * ratio )
  }
  result.push(result[0])
  result.push(result[1])

  return result
}

var DU96W180_Cl_Processed = precalculate(DU96W180_Cl_raw)
var DU96W180_Cd_Processed = precalculate(DU96W180_Cd_raw)
var DU97W300_Cm_Processed = precalculate(DU_97_W_300_Cm_raw)

var NACA0012_Cl_Processed = precalculate(NACA0012_Cl_raw, 180)
var NACA0012_Cd_Processed = precalculate(NACA0012_Cd_raw, 180)

function angleDegreeAsym(angle: number): number {
  angle = angle*180/Math.PI

  if (angle < 0) {
    angle += 360
  }

  return angle
}

function angleDegreeSym(angle: number): number {
  return Math.abs(angle*180/Math.PI)
}

function getLinearRatio(dataset: number[], index: number, ratio: number) {
  return dataset[index] * (1-ratio) + dataset[index+1] * ratio
}

function clAsym(angle: number): number {
  angle = angleDegreeAsym(angle)
  var angleInt = Math.floor(angle)
  return getLinearRatio(DU96W180_Cl_Processed, angleInt, angle - angleInt)
}

function cdAsym(angle: number): number {
  var angle = angleDegreeAsym(angle)
  var angleInt = Math.floor(angle)
  return getLinearRatio(DU96W180_Cd_Processed, angleInt, angle - angleInt)

}

function clSym(angle: number): number {
  var sign = Math.sign(angle)
  var angle = angleDegreeSym(angle)
  var angleInt = Math.floor(angle)
  return sign * getLinearRatio(NACA0012_Cl_Processed, angleInt, angle - angleInt)
}

function cdSym(angle: number): number {
  var angle = angleDegreeSym(angle)
  var angleInt = Math.floor(angle)
  return getLinearRatio(NACA0012_Cd_Processed, angleInt, angle - angleInt)
}

function cm(angle: number): number {
  var angle = angleDegreeAsym(angle)
  var angleInt = Math.floor(angle)
  return getLinearRatio(DU97W300_Cm_Processed, angleInt, angle - angleInt)
}


export class Airfoil {
  constructor(readonly symmetric: boolean) {
  }

  cd(angle: number): number {
    return this.symmetric ? cdSym(angle) : cdAsym(angle)
  }

  cl(angle: number): number {
    return this.symmetric ? clSym(angle) : clAsym(angle)
  }

  cm(angle: number): number {
    return this.symmetric ? 0 : cm(angle)
  }
}
