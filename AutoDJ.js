function midiAutoDJ() {}

/*
    AutoDJ for Mixxx
    Byron Xu, 2018
    Licensed under the GNU GPL v3 or later

    Based on midiAutoDJ by Sophia Herzog, copyright (c) 2016-2017 and licenced under the GPL
    Available at https://www.mixxx.org/forums/viewtopic.php?f=7&t=8318

    Please see the README for more information and usage instructions
*/


// BASIC OPTIONS

midiAutoDJ.exitCue = 4;
// Hotcue number to mark the exit point
// Unit: Integer; Default: 4

midiAutoDJ.preStart = 8;
// Duration before the mix point to begin transition
// The exit point of the current song and the entrance point of
// the next song are overlapped.
// The transition begins some number of beats before this point.
// Unit: Beats; Allowed values: 1 2 4 8 16 32 64; Default: 8

midiAutoDJ.useEQ = 1;
// Whether to use EQ when transitioning
// Unit: Boolean (0 or 1); Default: 1 (yes)

midiAutoDJ.maxBpmAdjustment = 12;
// Maximum percentage adjustment of BPM allowed in order to sync beats
// Note that Mixxx can do double/half time mixing, e.g. sync 80bpm to 160bpm
// Unit: Percentage (not absolute BPM), Integer; Default: 12

midiAutoDJ.transpose = 1;
// Toggles whether to transpose in order to mix harmonically
// Unit: Boolean (0 or 1); Default: 1 (yes)

midiAutoDJ.transposeMax = 1;
// Maximum acceptable transposition in semitones
// Transposing by more than 1 tends to sound bad. However,
// if this script is unable to find a suitable song, it will ignore this limit.
// Unit: Integer (number of semitones); Default: 1

// Another option worth adjusting is the AutoDJ transition duration found in the GUI
// The default (10 seconds) is a bit long. 6-8 seconds may work better.

// More options can be found in the Options > Preferences menu
// Details here: https://blueprints.launchpad.net/mixxx/+spec/auto-dj-crates





// ADVANCED OPTIONS
// (these typically should not be adjusted unless you are making significant edits to the script)

midiAutoDJ.bpmSync = 1;             // Toggles if BPM and beat phase are to be synced (1) or not (0).
// Unit: Binary

midiAutoDJ.bpmSyncFade = 1;         // Toggles if BPM is to be synchronised slowly (1) during approximately the
// first two thirds of crossfading, or if it is to be adjusted abruptly (0)
// at the first beat found.
// Requires bpmSync to be enabled (1).
// Unit: Binary

midiAutoDJ.transposeSkipsMax = 3;     // Number of times to skip a track before resorting to
// transposing more than the maximum amount
// Unit: Integer; Range: 1 to MaxInt; Default: 3

midiAutoDJ.fadeQuickEffect = 0;     // Toggles if Quick Effect filter should be faded (1).
// or if it should stay untouched (0).
// Unit: Binary

midiAutoDJ.reverseQuickEffect = 0;  // Toggles direction of Quick Effect fade.
// 0: Fade out to  left, fade in from right.
// 1: Fade out to right, fade in from  left.
// Unit: Binary

midiAutoDJ.fadeRange = 0.5;         // Decide how far the Quick Effects knob should turn
// 0.0: No fade at all
// 0.5: Fade out to 25%, fade in from 75%
// 1.0: Fade out to  0%, fade in from 100%
// Unit: Float; Range: 0.0 to 1.0; Default: 0.5

// Advanced Options
midiAutoDJ.refineDuration = 1000; // Duration of sleeping between two track skips.
// If Mixxx appears to hang or be overwhelmed when searching
// for the next track, increase this value.
// Note: Must NOT be smaller than midiAutoDJ.sleepDuration
// Unit: Milliseconds; Default: 1000
midiAutoDJ.sleepDuration = 250;   // Duration of sleeping between actions.
// Try to keep it low for best results.
// Too low values might cause Mixxx to appear to hang.
// Unit: Milliseconds; Default: 250

// Note to developers: Indent with tabs, align with spaces.
// JSHint configuration block:
/* jshint curly: true, eqeqeq: true, forin: true, freeze: true, futurehostile: true, latedef: true, nocomma: true, nonew: true, shadow: outer, singleGroups: true, strict: implied, undef: true, unused: true */
/* globals engine: false */

// Global Variables
midiAutoDJ.sleepTimer = 0; // 0 signifies a beginTimer error
midiAutoDJ.connected = 0;  // 0 signifies disconnected state
midiAutoDJ.syncing = 0;    // 1 signifies Mixxx should be trying to sync both decks
midiAutoDJ.skips = 0;      // Counts skips
midiAutoDJ.transposeSkips = 0;      // Counts skips due to undesirable transpositions
midiAutoDJ.refineWait = 0;          // Counts timer cycles since last track skip
midiAutoDJ.songLoaded = 0;          // If the next song has been loaded

// Functions
midiAutoDJ.init = function(id) { // Called by Mixxx
    id = 0; // Satisfy JSHint, but keep Mixxx function signature
    engine.setValue("[Channel1]", "quantize", 1.0);
    engine.setValue("[Channel2]", "quantize", 1.0);
    engine.setValue("[Channel1]", "keylock", 1.0);
    engine.setValue("[Channel2]", "keylock", 1.0);
    engine.setValue("[Channel1]", "keylockMode", 0.0);
    engine.setValue("[Channel2]", "keylockMode", 0.0);
    engine.setValue("[Master]", "crossfader", -1.0); // Assumes empty decks on Channel1 and Channel2; see Notes section above

    if (engine.connectControl("[AutoDJ]", "enabled", "midiAutoDJ.toggle")) {
        midiAutoDJ.connected = 1;
        engine.trigger("[AutoDJ]", "enabled");
    } else { // If connecting fails, this allows using the script anyway; least surprise.
        midiAutoDJ.sleepTimer = engine.beginTimer(midiAutoDJ.sleepDuration, "midiAutoDJ.main()");
    }
};

midiAutoDJ.shutdown = function(id) { // Called by Mixxx
    id = 0; // Satisfy JSHint, but keep Mixxx function signature
    if (midiAutoDJ.connected && engine.connectControl("[AutoDJ]", "enabled", "midiAutoDJ.toggle", true)) {
        midiAutoDJ.connected = 0;
    }
    if (midiAutoDJ.sleepTimer) {
        engine.stopTimer(midiAutoDJ.sleepTimer);
    }
};

midiAutoDJ.toggle = function(value, group, control) { // Called by signal connection
    group = 0;   // Satisfy JSHint, but keep Mixxx function signature
    control = 0; // Satisfy JSHint, but keep Mixxx function signature
    if (value) {
        midiAutoDJ.songLoaded = 0;
        midiAutoDJ.sleepTimer = engine.beginTimer(midiAutoDJ.sleepDuration, "midiAutoDJ.main()");
    } else if (midiAutoDJ.sleepTimer) {
        engine.stopTimer(midiAutoDJ.sleepTimer);
        midiAutoDJ.sleepTimer = 0;
    }
};

// Note: Technically, it would be cleaner to use signal connections instead of a timer.
//       However, I prefer keeping this simple; it's just a MIDI script, after all.
midiAutoDJ.main = function() { // Called by timer
    var deck1Playing = engine.getValue("[Channel1]", "play_indicator");
    var deck2Playing = engine.getValue("[Channel2]", "play_indicator");
    var prev = 1;
    var next = 2;
    var prevPos = engine.getValue("[Channel"+prev+"]", "playposition");
    var nextPos = engine.getValue("[Channel"+next+"]", "playposition");
    if ( prevPos === -1 || nextPos === -1 ) {
        return;
    }

    if (deck1Playing && ! deck2Playing) {
        prev = 1; // actually this is already assigned 1 and we don't need to do it again
        next = 2;
    } else if (deck2Playing && ! deck1Playing) {
        prev = 2; // swap prev and next
        next = 1;
        var tmp = nextPos;
        nextPos = prevPos;
        prevPos = tmp;
    } else { // the one with the smaller position is designated as next
        if (prevPos < nextPos) {
            var tmp = nextPos;
            nextPos = prevPos;
            prevPos = tmp;
            next = 1;
            prev = 2;
        }
    }

    var nextPlaying = engine.getValue("[Channel"+next+"]", "play_indicator");

    var prevBpm = engine.getValue("[Channel"+prev+"]", "file_bpm");
    var nextBpm = engine.getValue("[Channel"+next+"]", "file_bpm");

    // Calcuate the BPM percentage difference that the next track will
    // have to be adjusted by in order to match the previous
    var diffBpm = 100 * Math.abs(nextBpm - prevBpm) / nextBpm;
    var diffBpmDouble = 0; // diffBpm, with bpm of ONE track doubled
    // Note: Where appropriate, Mixxx will automatically match two beats of one.
    if (nextBpm < prevBpm) {
        diffBpmDouble = 100 * Math.abs(nextBpm - prevBpm*0.5) / nextBpm;
    } else {
        diffBpmDouble = 100 * Math.abs(nextBpm - prevBpm*2) / nextBpm;
    }

    // Normalised crossfader variable to be used at several points below:
    var crossfader = engine.getValue("[Master]", "crossfader"); // Oscillates between -1.0 and 1.0
    crossfader = (crossfader+1.0)/2.0; // Oscillates between 0.0 and 1.0
    if ( next === 1 ) {
        crossfader = 1.0-crossfader; // Fades from 0.0 to 1.0
    }

    // Next track is playing --> Fade in progress
    if (nextPlaying && nextPos > -0.15) {
        // Reset variables
        skip = 0;
        midiAutoDJ.songLoaded = 0;

        // Fade using EQ
        if (midiAutoDJ.useEQ) {
            // fade in bass of next track
            if (crossfader > 0.5) {
                var nextEQ = engine.getValue("[EqualizerRack1_[Channel"+next+"]_Effect1]", "parameter1");
                if (nextEQ < 1) {
                    nextEQ += 0.025;
                }
                if (nextEQ > 1) {
                    nextEQ = 1.0;
                }
                engine.setValue("[EqualizerRack1_[Channel"+next+"]_Effect1]", "parameter1", nextEQ);
            }
            // fade out bass of previous track
            if (crossfader > 0.1) {
                var prevEQ = engine.getValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1");
                if (prevEQ > 0) {
                    prevEQ -= 0.025;
                }
                if (prevEQ < 0) {
                    prevEQ = 0;
                }
                engine.setValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1", prevEQ);
            }
        }

        if ( midiAutoDJ.bpmSync ) {
            // Note: In order to get BPM to sync, but not key, and to get beats aligned nicely,
            //       I tried lots of variants with sync_enabled, sync_master, beatsync, beatsync_phase, beat_active, ...
            //       Nothing really worked well, except for the following abomination, which,
            //       at least, does the job somewhat okay-ish...
            // Note: Sometimes, Mixxx does not sync close enough for === operator
            if ( crossfader > 0.75 && midiAutoDJ.syncing ) { // 0.75 should leave at more than one midiAutoDJ.sleepDuration of time
                // Beat phases should be synchronised by now, so let's disable sync again
                midiAutoDJ.syncing = 0;
                if (midiAutoDJ.bpmSyncFade) {
                    engine.setValue("[Channel"+next+"]", "sync_enabled", 1.0);
                    engine.setValue("[Channel"+next+"]", "sync_enabled", 0.0);
                } else {
                    engine.setValue("[Channel"+prev+"]", "sync_enabled", 1.0); // Simulating short click of sync button...
                    engine.setValue("[Channel"+prev+"]", "sync_enabled", 0.0); // ...needs manual reset to work as expected
                }
                // Reset syncing modes before new track is loaded
                engine.setValue("[Channel"+prev+"]", "sync_mode", 0.0);
                engine.setValue("[Channel"+next+"]", "sync_mode", 0.0);
            } else if (crossfader < 0.75 && ! midiAutoDJ.syncing ) { // Synchronize BPM
                // Note midiAutoDJ.syncing prevents entering this case multiple times to avoid Mixxx jumping around madly in BPM doubling cases
                // Sync Modes: 0=None, 1=Follower, 2=Master; set follower before master, Mixxx would sanity-adjust it too late
                if (midiAutoDJ.bpmSyncFade) {
                    midiAutoDJ.syncing = 1;
                    engine.setValue("[Channel"+next+"]", "sync_mode", 1.0);
                    engine.setValue("[Channel"+prev+"]", "sync_mode", 2.0);
                    engine.setValue("[Channel"+next+"]", "sync_enabled", 1.0);
                    engine.setValue("[Channel"+next+"]", "sync_enabled", 0.0);
                } else if (engine.getValue("[Channel"+prev+"]", "beat_active")) { // Beat synchronise this case, sounds less harsh
                    midiAutoDJ.syncing = 1;
                    engine.setValue("[Channel"+prev+"]", "sync_mode", 1.0);
                    engine.setValue("[Channel"+next+"]", "sync_mode", 2.0);
                    engine.setValue("[Channel"+prev+"]", "sync_enabled", 1.0); // Simulating short click of sync button...
                    engine.setValue("[Channel"+prev+"]", "sync_enabled", 0.0); // ...needs manual reset to work as expected
                }
                // Sync is now enabled until disabled again
            }
            if ( midiAutoDJ.bpmSyncFade && midiAutoDJ.syncing ) {
                // This is not linear; incremental adjustments start and end slowly
                // Note: Must finish before crossfader = 0.75 because of the above code block
                var prevBpmCurrent=engine.getValue("[Channel"+prev+"]", "bpm");
                var adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm-prevBpmCurrent);
                if ( diffBpmDouble < diffBpm ) {
                    if ( nextBpm < prevBpm ) {
                        adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm*2-prevBpmCurrent);
                    } else {
                        adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm/2-prevBpmCurrent);
                    }
                }
                engine.setValue("[Channel"+prev+"]", "bpm", adjustedBpm);
            }
        }

    } else { // Next track is stopped --> Disable sync and refine track selection
        // Adjust the EQ for bass (parameter 1) if necessary to smoothly transition after the fade in
        if (midiAutoDJ.useEQ) {
            var eqValue = engine.getValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1");
            if (eqValue != 1) {
                if (eqValue < 1) {
                    eqValue += 0.025;
                }
                if (eqValue > 1) {
                    eqValue = 1.0;
                }
                engine.setValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1", eqValue);
            }
        }

        if (midiAutoDJ.bpmSyncFade) {
            // Avoid timestreching indefinitely due to ever so slight residual offset in BPM float
            engine.setValue("[Channel"+prev+"]", "bpm", prevBpm);
        }

        // Clean up in case previous transition did not finish nicely
        if ( midiAutoDJ.syncing ) {
            midiAutoDJ.syncing = 0;
            engine.setValue("[Channel"+prev+"]", "sync_mode", 0.0); // Disable sync, else loading new track...
            engine.setValue("[Channel"+next+"]", "sync_mode", 0.0); // ...or skipping tracks would break things.
            //engine.setValue("[Channel"+prev+"]", "sync_enabled", 0.0);
            //engine.setValue("[Channel"+next+"]", "sync_enabled", 0.0);
        }

        if ( midiAutoDJ.fadeQuickEffect ) {
            // To prepare for next fade
            engine.setValue("[QuickEffectRack1_[Channel"+next+"]]", "super1", 0.5+midiAutoDJ.fadeRange/2.0);
            // In case the transition ended to quickly
            engine.setValue("[QuickEffectRack1_[Channel"+prev+"]]", "super1", 0.5);
        }


        // Check if we are at the exit point of the current song
        // Begin the transition to the next song if this is the case
        var exitCueSamples = engine.getValue("[Channel"+prev+"]", "hotcue_"+midiAutoDJ.exitCue+"_position");
        if (exitCueSamples != -1) {
            var currentPos = engine.getValue("[Channel"+prev+"]", "playposition");
            var sampleRate = engine.getValue("[Channel"+prev+"]", "track_samplerate");
            var trackDuration = engine.getValue("[Channel"+prev+"]", "duration");
            var exitCuePos = exitCueSamples / sampleRate / trackDuration / 2; // need to divide by 2 for whatever reason

            var prevBpmCurrent = engine.getValue("[Channel"+prev+"]", "bpm");
            var nextBpmCurrent = engine.getValue("[Channel"+next+"]", "bpm");
            var exitCueOffset = midiAutoDJ.preStart * 60.0 / prevBpmCurrent / trackDuration;

            // Adjust for double/half time
            // Next song is twice the tempo (+1 for floating point rounding)
            if (nextBpmCurrent > prevBpmCurrent + 1) {
                exitCueOffset = exitCueOffset * 0.5;
            }
            // Next song if half the tempo
            if (nextBpmCurrent + 1 < prevBpmCurrent) {
                exitCueOffset = exitCueOffset * 2;
            }

            if (currentPos >= exitCuePos - exitCueOffset - 0.0008) {
                engine.setValue("[AutoDJ]", "fade_now", 1.0);
                engine.setValue("[AutoDJ]", "fade_now", 0.0);
            }
        }


        // Second, refine track selection
        // Key advantage of trial and error:
        //  * keeps code simple, Mixxx scripting is not made for this task
        //  * does not mess with Auto-DJ track source settings or queue ordering
        var skip = 0;

        // Is the BPM difference too much?
        if ( diffBpm > midiAutoDJ.maxBpmAdjustment && diffBpmDouble > midiAutoDJ.maxBpmAdjustment ) {
            skip = 1;
        }

        // Mix harmonically by transposing
        // However, skip the song if you have to transpose too much
        // and don't transpose if we are skipping too much
        if (midiAutoDJ.transpose && !skip) {
            // Sync key
            var oldKey = engine.getValue("[Channel"+next+"]", "key");
            engine.setValue("[Channel"+next+"]", "sync_key", 1.0);
            engine.setValue("[Channel"+next+"]", "sync_key", 0.0);
            var newKey = engine.getValue("[Channel"+next+"]", "key");

            // Check if we should skip
            if (Math.abs(newKey - oldKey) > midiAutoDJ.transposeMax + 0.001) {
                if (midiAutoDJ.transposeSkips < midiAutoDJ.transposeSkipsMax) {
                    skip = 1;
                    midiAutoDJ.transposeSkips++;
                } else {
                    // Can't skip, so reset the key
                    engine.setValue("[Channel"+next+"]", "key", oldKey);
                }
            }
        }

        // Skip the next song
        if (skip) {
            skip = 0;
            midiAutoDJ.songLoaded = 0;

            engine.setValue("[AutoDJ]", "skip_next", 1.0);
            engine.setValue("[AutoDJ]", "skip_next", 0.0); // Have to reset manually
            midiAutoDJ.skips++;

        } else { // Song selected
            // reset counter
            skip = 0;
            midiAutoDJ.transposeSkips = 0;

            // Prepare the next track for the transition
            // Place the play position at the desired offset from the transition point
            if (! midiAutoDJ.songLoaded) {
                midiAutoDJ.songLoaded = 1;
                engine.setValue("[Channel"+next+"]", "cue_gotoandstop", 1.0);
                engine.setValue("[Channel"+next+"]", "cue_gotoandstop", 0.0);
                engine.setValue("[Channel"+next+"]", "beatjump_"+midiAutoDJ.preStart+"_backward", 1.0);
                engine.setValue("[Channel"+next+"]", "beatjump_"+midiAutoDJ.preStart+"_backward", 0.0);

                // Also set EQ bass (parameter 1) to the lowest setting
                if (midiAutoDJ.useEQ) {
                    engine.setValue("[EqualizerRack1_[Channel"+next+"]_Effect1]", "parameter1", 0.2);
                }

                var nextBpmAdjusted = nextBpm;
                if (midiAutoDJ.bpmSyncFade) {
                    nextBpmAdjusted = prevBpm;
                    if ( diffBpmDouble < diffBpm ) {
                        if ( nextBpm < prevBpm ) {
                            nextBpmAdjusted = prevBpm/2;
                        } else {
                            nextBpmAdjusted = prevBpm*2;
                        }
                    }
                }
                engine.setValue("[Channel"+next+"]", "bpm", nextBpmAdjusted);
            }
        }
    }
};

