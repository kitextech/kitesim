import parse from 'csv-parse'
import { fork } from 'child_process'
import fs from  'fs'
import { defaultConfig40 } from '../other/simulation';
import { performance } from 'perf_hooks'
import { VTOL_TransitionAlgo } from '../flightControl/vtol';
import { Vector3 } from 'three';

interface Dictionary<T> {
  [key: string]: T;
}

let variable = [0,2, 5,10,15, 20]

interface simIntermediateResult {
  lookup: Dictionary<number>,
  output: number[][],
  success: boolean
}


function flightGenerator( x: number, dir: string) : Promise<simIntermediateResult> {
  return new Promise( (res, rej) =>  {

    let lookupTable: Dictionary<number> = {}
    let prevAngle: number
    let loopCount = 0
    
    let output: any[] = []
    // Create the parser
    let parser = parse({
      delimiter: '\t'
    })
    // Use the readable stream api
    parser.on('readable', function(){
      let record: any[]
      while (record = parser.read()) {
        if (output.length == 0) {  // header line
            record.forEach((val: string, index: number) => {
                lookupTable[val] = index
            })
        }

        record = record.map( v => parseFloat(v) )
        let angleIndex =  lookupTable["pf.loopProgressAngle"]
        let altitudeIndex =  lookupTable["plane.p.z"]

        let angle = record[angleIndex]
        let altitude = record[altitudeIndex]
    
        if ((angle - prevAngle) < -Math.PI*1.8 )  {
            loopCount+=1
        }
        prevAngle = angle

        if (altitude > 0.5 ) {
          // half a meter below ground
          // flight.kill()
          res( {
            lookup: lookupTable,
            output: output,
            success: false
          })
        }

        if (loopCount == 3)  {
            output.push(record) // save data
        } 
        if (loopCount == 4)  {
            // flight.kill()
            res( {
              lookup: lookupTable,
              output: output,
              success: true
            })
        } 
        // count number of loops
      }
    })
    
    // Catch any error
    parser.on('error', function(err){
      console.error(err.message)
    })
    let filename  = dir + "/" + x + ".csv"
    let flight = fork('logger/src/programs/headless.js', ["stdout", "stdin", "-p", filename],  {stdio: "pipe"})
    let config = defaultConfig40
    

    config.wind = { static: new Vector3(x,0,0) }


    flight.stdin.write(JSON.stringify(config))
    flight.stdin.end()

    flight.stdout.pipe(parser)

    flight.on('close', (code) => {
        if (loopCount < 4) {
          res( {
            lookup: lookupTable,
            output: output,
            success: false
          })
        } 
    })

  })
}

var t0 = performance.now();

let date  = new Date()
let dir = `data/multi/${date.getTime()}_${date.toUTCString()}`
let resultFile = dir + "/result.json"
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}



Promise.all(
  variable.map( v => flightGenerator(v, dir) )
).then( results => {
  let resultSummery: Dictionary<any> = {}
  
  results.forEach( (result, index) => {
    console.log( "variable: " + variable[index]) 

    if (result.success)  {
      let processResult = processDataFromLoop(result.lookup, result.output) 
      resultSummery[ variable[index] ] = processResult

      console.log( processResult )
    } else {
      resultSummery[ variable[index] ] = []
      console.log( "didn't fly" )
    }
  })
  var t1 = performance.now();
  console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");

  fs.writeFileSync(resultFile, JSON.stringify(resultSummery, null, 2))
}).catch(  err => {
  console.log( "Something bad happend: ", err)
})

//  support functions 
function mean(numbers: number[]):  number {
  return numbers.reduce( (prev, cur) => prev + cur, 0) / (numbers.length)
}

function minMeanMax(numbers: number[]) {
  return {
    min: Math.min(...numbers),
    mean: mean(numbers),
    max: Math.max(...numbers)
  }
}

function processDataFromLoop(lookupTable: Dictionary<number>, records:number[][]) {
  // let dt = records[lookupTable["time"]][1]-records[lookupTable["time"]][0]
  let power = records.map( record => { return record[lookupTable["plane.power"]] } )
  let pathError = records.map( record => { return record[lookupTable["pf.pathError"]] } )
  let groundTetherForce = records.map( record => { return record[lookupTable["spring_0"]] } ) 

  return {
    power: minMeanMax(power),
    pathError: minMeanMax(pathError),
    groundTetherForce: minMeanMax(groundTetherForce)
  }  
}