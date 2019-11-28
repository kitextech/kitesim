import { Simulation, defaultConfig40 } from '../other/simulation';
import { Logger } from '../other/util';
import { createWriteStream  } from 'fs';
import { reciever } from  "../aero/airplane"


let toStandardOut = process.argv.includes("stdout") 
let fromStdIn = process.argv.includes("stdin")
let pathIndex = process.argv.indexOf("-p") //  return -1 if it  not  includes
let path = (pathIndex != -1) ? process.argv[pathIndex+1] : undefined

function getInput(fromStdIn: boolean): Promise<string> {
  return new Promise( (res, rej) => {
    if (fromStdIn) {
      let inputChunks: string[] = [];
      process.stdin.setEncoding("utf8") // not sure necessary

      process.stdin.on('data', function (chunk) {
        inputChunks.push(chunk)
      })
      .on('end', function () {
        let inputJSON = inputChunks.join()
          res(inputJSON)
      })
    } else {
      let config = defaultConfig40
      res(JSON.stringify(config))
    }
  })
}

getInput(fromStdIn).then( config => {
  run(config, path)
}) 

function run( configurationString:  string, path: string = undefined) {

    let config =  JSON.parse(configurationString, reciever) //  reciever from  airplane - little  odd
    
    let sim = new Simulation(config)
    let logger = Logger.getInstance()
    let date = new Date()

    let writeStream = (path ==  undefined) ? createWriteStream(`data/single/${date.getTime()}_${date.toUTCString()}.csv`) : createWriteStream(path)

    if (toStandardOut) {
      logger.f = (string: string) => {
        writeStream.write(string)
        process.stdout.write(string)
      }   
    } else {
      logger.f = (string: string) => writeStream.write(string)   
    }
    
    logger.start()
    
    let time = 0
    let dt = 1/64
    
    
    for (let count = 0; count < 4.0e3; count++) {
        sim.update(dt, time);
        time += dt
        logger.update(time)
    }
    


    writeStream.end()
    process.stdout.end()
}

