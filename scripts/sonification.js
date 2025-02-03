// scripts/sonification.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resetButton = document.getElementById('resetButton');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');

    // Track either a Tone.Sequence (discrete notes) or a Tone.Oscillator (continuous sound).
    let audioObject = null;
    let oscillator = null;  // for line graphs
    
    let synth = null;  // for dicrete playback (bar/scatter)

    let isPlaying = false;
    let isFinished = false;
    let scheduledId = null; // ID for final "stop" event scheduling

    // Initialize the speed display
    speedValue.textContent = speedRange.value + 'x';

    // Play button
    playButton.addEventListener('click', async function() {
        // Start the AudioContext if not already started
        await Tone.start();

        // If we have NOT started any audio yet
        if (!isPlaying && !isFinished && !audioObject) {
            const startIndex = parseInt(document.getElementById('startIndex').value);
            const endIndex = parseInt(document.getElementById('endIndex').value);

            // Validate the indices
            if (
                isNaN(startIndex) ||
                isNaN(endIndex) ||
                startIndex > endIndex ||
                startIndex < 0 ||
                endIndex >= window.values.length
            ) {
                alert(`Please enter valid start and end indices between 0 and ${window.values.length - 1}.`);
                //edit input data to fit within valid parameters
                document.getElementById('endIndex').value= window.values.length-1;
                return;
            }

            // Disable the play button and enable the pause button
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = false;
            pauseButton.setAttribute('aria-disabled', 'false');
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');

            // Start sonification
            const speed = parseFloat(speedRange.value);
            sonifyData(window.labels, window.values, startIndex, endIndex, speed);

        // If finished, do nothing (play won't re-trigger)
        } else if (isFinished) {
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');

        // Otherwise, must be paused or resumed
        } else if (audioObject && !isPlaying) {
            // Resume
            Tone.Transport.start();
            isPlaying = true;

            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = false;
            pauseButton.setAttribute('aria-disabled', 'false');
        }
    });

    // Pause button
    pauseButton.addEventListener('click', function() {
        if (isPlaying) {
            Tone.Transport.pause();
            isPlaying = false;

            playButton.disabled = false;
            playButton.setAttribute('aria-disabled', 'false');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');
        }
    });

    // Reset button
    resetButton.addEventListener('click', function() {
        stopAndResetPlayback();
    });

    // Speed slider
    speedRange.addEventListener('input', function() {
        const speed = parseFloat(speedRange.value);
        speedValue.textContent = speed + 'x';
        if (isPlaying) {
            // Adjust BPM in real time
            Tone.Transport.bpm.value = 120 * speed;
        }
    });

    // Sonify data
    function sonifyData(labels, values, startIndex, endIndex, speed) {
        const selectedGraph = localStorage.getItem('selectedGraph');
        // Check if it's a Line graph for continuous sound
        if (selectedGraph && selectedGraph.toLowerCase() === 'line') {
            sonifyContinuous(labels, values, startIndex, endIndex, speed);
        } else {
            sonifyDiscrete(labels, values, startIndex, endIndex, speed);
        }
    }

    // Discrete Notes (Bar/Scatter)
    function sonifyDiscrete(labels, values, startIndex, endIndex, speed) {
        const rangeValues = values.slice(startIndex, endIndex + 1);
        const frequencies = rangeValues.map(v => mapValueToFrequency(v));

        if (frequencies.length === 0) {
            alert('No data points to sonify in the selected range.');
            return;
        }

        // Clear old playback if needed
        stopAndResetPlayback(true);

        // Create the synth if needed
        if (!synth) {
            synth = new Tone.Synth().toDestination();
        }

        // Set BPM
        Tone.Transport.bpm.value = 120 * speed;

        // Create the Tone.Sequence
        audioObject = new Tone.Sequence((time, freq) => {
            // Use the callback 'time' for accurate scheduling
            synth.triggerAttackRelease(freq, '8n', time);
        }, frequencies, '4n');

        audioObject.loop = false;
        audioObject.start(0);

        // Start the transport
        Tone.Transport.start();
        isPlaying = true;
        isFinished = false;

        // Schedule final stop
        const noteDuration = Tone.Time('4n').toSeconds();
        const totalDuration = frequencies.length * noteDuration;
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
        }, totalDuration);
    }

    // Continuous Pitch (Line)
    function sonifyContinuous(labels, values, startIndex, endIndex, speed) {
        const rangeValues = values.slice(startIndex, endIndex + 1);
        const frequencies = rangeValues.map(v => mapValueToFrequency(v));

        if (frequencies.length === 0) {
            alert('No data points to sonify in the selected range.');
            return;
        }

        // Clear old playback if needed
        stopAndResetPlayback(true);

        // Set BPM
        Tone.Transport.bpm.value = 120 * speed;

        // Create one oscillator and sync it
        oscillator = new Tone.Oscillator().toDestination();
        oscillator.sync();
        // Set starting frequency before playback begins
        oscillator.frequency.value = frequencies[0];
        oscillator.start(0);

        audioObject = oscillator; // for tracking

        // Each "segment" in the data is a quarter note long
        const noteDuration = Tone.Time('4n').toSeconds();
        const totalDuration = frequencies.length * noteDuration;

        // Schedule frequency ramps
        for (let i = 0; i < frequencies.length - 1; i++) {
            const offset = i * noteDuration;
            Tone.Transport.schedule((scheduledTime) => {
                // At segment start
                oscillator.frequency.setValueAtTime(frequencies[i], scheduledTime);
                // Linearly ramp to next frequency by segment end
                oscillator.frequency.linearRampToValueAtTime(
                    frequencies[i + 1],
                    scheduledTime + noteDuration
                );
            }, offset);
        }

        // Schedule final stop after last ramp
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
        }, totalDuration);

        // Start transport
        Tone.Transport.start();
        isPlaying = true;
        isFinished = false;
    }

    // Function to stop playback and reset state
    function stopPlayback(time) {
        if (isPlaying || !isFinished) {
            isPlaying = false;
            isFinished = true;

            // Disable the play button since playback is finished
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');

            // Disable the pause button
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');

            // Enable the reset button
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');

            if (Tone.Transport.state !== 'stopped') {
                Tone.Transport.stop(time);
            }

            if (sequence) {
                sequence.stop(time);
                sequence.dispose();
                sequence = null;
            }

            // Clear any scheduled events
            if (scheduledId !== null) {
                Tone.Transport.clear(scheduledId);
                scheduledId = null;
            }
        }
    }

    // Function to map data values to frequencies
    function mapValueToFrequency(value) {
        const minFreq = 200; // Minimum frequency (in Hz)
        const maxFreq = 800; // Maximum frequency (in Hz)
        const minValue = Math.min(...window.values); // Minimum data value
        const maxValue = Math.max(...window.values);

        // Handle the case where all values are the same
        if (minValue === maxValue) {
            return (minFreq + maxFreq) / 2;
        }

        // Normalize the value to a frequency within the specified range
        return ((value - minValue) / (maxValue - minValue)) * (maxFreq - minFreq) + minFreq;
    }
});
