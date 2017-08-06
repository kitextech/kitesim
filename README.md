## What?
This is a real time dynamic model of a tethered kite which can be useful for visualisation, parameter estimation, flight controller development and so forth for airborne wind turbines. [Live demo!](http://kitex.tech/kitesim/)

![Kitesim rendering of kitex SuperQ prototype](/readmeImages/kitesim.png?raw=true)

## install & use

1. install node js and npm from [https://nodejs.org/en/](https://nodejs.org/en/)
2. run `clone git@github.com:kitextech/kitesim.git`
3. run `cd kitesim`
3. run `npm install`
4. run `gulp`
5. open `docs/index.html`

### livereload
To increase development speed gulp will be tracking any file changes and process/copy files when needed. If you have the livereload plugin for chrome (and the livereload setting: local files activated) then the browser will automatically reload the page on file changes. 

### DAT-GUI Instlation
Since the npm packages of dat.gui is very outdated, then the package is installed by downloading the https://github.com/dataarts/dat.gui/ library into the node_modules folder and and running npm install. Rename the folder from dat.gui to dat-gui. The latest version is needed to get browsify support. Renaming to dat-gui is in order to get the matching typescript. https://github.com/dataarts/dat.gui/pull/137

## editor
We recommend using Visual Studio Code which is typescript aware.  

