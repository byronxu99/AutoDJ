# AutoDJ
Improved automatic DJing for [Mixxx](https://www.mixxx.org/)

Based on [midiAutoDJ by Sophia Herzog](https://www.mixxx.org/forums/viewtopic.php?f=7&t=8318)

## Features
* Automatic song selection with an adjustable tempo difference percentage tolerance
* Automatic harmonic mixing and key transposition
* Support for entrance and exit cue points
* Support for double and half time, e.g. 160bpm to 80bpm
* Bass EQ for smoother transitions

## Example
![Screenshot](https://i.imgur.com/l6s0cXE.png)

A transition from the song on the right (160bpm, Bb Major) to the song on the left (90bpm, D minor). Every two beats on the right is matched to one on the left, and the exit cue on the right is aligned with the entrance cue on the left. As the cues are approached, the tempo changes smoothly while the beats are synchronized. The screenshot shows this change in progress. At the same time, the EQ knobs are adjusted, fading out the bass of the old song and fading in that of the new song.

## Usage Info
Mixxx allows arbitrary Javascript code to be loaded for the purpose of interfacing between MIDI controllers and internal variables. This script is executed by Mixxx through being binded to a "fake" MIDI controller. (Alternatively, a real MIDI keyboard can also be used, skipping the first step below. This will require attaching the device to your computer whenever you wish to use this script.)

Steps:
1. Install and configure a MIDI loopback driver. One choice that works on Windows is [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) (it's proprietary but available at no cost).
1. In Mixxx, go to Options > Preferences > Controllers and select the loopback device. In the Scripts tab, add the AutoDJ.js file. Mixxx will install it in the appropriate location.
1. Load songs into Mixxx and perform BPM/key analysis (if you haven't already). Sort your music into crates and attach the desired crates to Auto DJ.
1. Check to ensure that the beat grid is aligned properly. Oftentimes, the automatic detection will be off by half a beat. Set cue locations for the entrance and exit points of each song. The script's default is to assume that the main cue marks the entrance point and hotcue 4 denotes the exit point.
1. When the Auto DJ feature of Mixxx is enabled, this script will be automatically executed.

### Tips
* In the Mixxx Auto DJ controls, adjust the transition duration. The default value of 10 seconds is a bit long. I've found that 6-8 seconds is better.
* More options are available in the Options > Preferences > Auto DJ menu. For some information, see [here](https://blueprints.launchpad.net/mixxx/+spec/auto-dj-crates).
* Try adjusting the crossfader settings between additive mode and constant power mode. You may prefer one over the other.

