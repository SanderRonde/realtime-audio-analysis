# Realtime audio analysis

## Installation

### The JS side

`cd` into the `js` folder and run `yarn`. That's it

### The python side

* Install python3.6
* Install your prefered version of tensorflow (`tensorflow`, `tensorflow-gpu`, `tensorflow-directml` for example)
* Install the packages from the `py/packages.pip` file

### Finally

Make sure you have some program that downloads played spotify tracks to your device in the background. I use [spy-spotify](https://github.com/jwallet/spy-spotify). Set its output format to `.wav` and its output folder to some folder X. Then change the `TRACK_FOLDER` variable in the `start.sh` file to be equal to that folder. By default it's `./data/tracks`.