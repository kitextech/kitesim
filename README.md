## KITESIM
This is a real time dynamic model of a tethered kite which can be useful for visualisation, parameter estimation, flight controller development and so forth for airborne wind turbines. [Live demo!](http://kitex.tech/kitesim/)

![Kitesim rendering of kitex SuperQ prototype](/readmeImages/kitesim.png?raw=true)

## installing
1. install nodejs (choose most recent LTS)
2. clone from github
2. `npm install` in the root folder
3. It's recommended to use Visual Studio Code for editing/ "wathcing" and building. 

## Viewing in a browser
2. `npm run web`. Opens a terminal process that watches for file changes and rebuilds the bundle.js 
3.  open `dist/index.html` in browser. On mac you can type `open dist/index.html` from another terminal.

## Running Headless
2. `npm run build`
3. `npm run log` or `npm run multi`

You can have Visual studio code watch your tsc - tscondig_headless.json to automatically rebuild on file changes. Configure under terminal menu.

# Folders
## Dist 
This is the output used for the website. 

contains bundle.js and index.html is used for the main simulation script. 
A secondary website playground.html with acombiening playground.js can be used to test parts of the simulator.

## logger
Transpiled code output folder for headless mode

## models
Load models from pure .json files

## src
Source files. Configuration, simulation code and the programs  

## tests
Unit tests for the fundemental aerodynamics ect.

## node_modules
installed packages for instance webpack and threeJS. Don't touch

#Physics
We have writen the physics ourselvs. see tether.ts, aero-plane.ts, ...