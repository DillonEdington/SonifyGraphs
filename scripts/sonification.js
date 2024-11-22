// scripts/sonification.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resetButton = document.getElementById('resetButton');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');

    let synth;
    let sequence;
    let isPlaying = false;
    let isFinished = false;
    let scheduledId = null; // Variable to store the scheduled event ID

    // Initialize the speed display
    speedValue.textContent = speedRange.value + 'x';

    // Event listener for the play button
    playButton.addEventListener('click', async function() {
        // Start the AudioContext if not already started
        await Tone.start();

        if (!isPlaying && !isFinished) {
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
                return;
            }

            // Disable the play button and enable the pause button
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = false;
            pauseButton.setAttribute('aria-disabled', 'false');
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');

            // Create the synth if it doesn't exist
            if (!synth) {
                synth = new Tone.Synth().toDestination();
            }

            // Get the speed value
            const speed = parseFloat(speedRange.value);

            // Call the function to sonify the selected data range
            sonifyData(window.labels, window.values, startIndex, endIndex, speed);
        }
        else if (isFinished) {
            // Sonification is finished; disable play button
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
        }
        else {
            // Resume playback
            Tone.Transport.start();
            isPlaying = true;
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = false;
            pauseButton.setAttribute('aria-disabled', 'false');
        }
    });

    // Event listener for the pause button
    pauseButton.addEventListener('click', function() {
        if (isPlaying) {
            Tone.Transport.pause();
            isPlaying = false;
            playButton.disabled = false;
            playButton.setAttribute('aria-disabled', 'false');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');

            // Clear any scheduled events
            if (scheduledId !== null) {
                Tone.Transport.clear(scheduledId);
                scheduledId = null;
            }
        }
    });

    // Event listener for the reset button
    resetButton.addEventListener('click', function() {
        // Stop playback and reset the sequence
        if (isPlaying || isFinished) {
            if (Tone.Transport.state !== 'stopped') {
                Tone.Transport.stop();
            }

            if (sequence) {
                sequence.stop();
                sequence.dispose();
                sequence = null;
            }

            // Clear any scheduled events
            if (scheduledId !== null) {
                Tone.Transport.clear(scheduledId);
                scheduledId = null;
            }

            isPlaying = false;
            isFinished = false;
        }
        // Reset buttons
        playButton.disabled = false;
        playButton.setAttribute('aria-disabled', 'false');
        pauseButton.disabled = true;
        pauseButton.setAttribute('aria-disabled', 'true');
        resetButton.disabled = false;
        resetButton.setAttribute('aria-disabled', 'false');
    });

    // Event listener for the speed control
    speedRange.addEventListener('input', function() {
        const speed = parseFloat(speedRange.value);
        speedValue.textContent = speed + 'x';
        if (isPlaying) {
            Tone.Transport.bpm.value = 120 * speed; // Adjust the BPM
        }
    });

    // Function to sonify the data within the selected range
    function sonifyData(labels, values, startIndex, endIndex, speed) {
        // Extract the range of values to sonify
        const rangeValues = values.slice(startIndex, endIndex + 1);

        // Map data values to frequencies
        const frequencies = rangeValues.map(value => mapValueToFrequency(value));

        // Check if there are frequencies to play
        if (frequencies.length === 0) {
            alert('No data points to sonify in the selected range.');
            return;
        }

        // Stop and dispose of any existing sequence
        if (sequence) {
            sequence.stop();
            sequence.dispose();
            sequence = null;
        }

        // Reset the transport
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        // Adjust the playback speed
        Tone.Transport.bpm.value = 120 * speed;

        // Calculate the duration of a '4n' note after setting the BPM
        const noteDuration = Tone.Time('4n').toSeconds();

        // Create a sequence
        sequence = new Tone.Sequence((time, frequency) => {
            synth.triggerAttackRelease(frequency, '8n', time);
        }, frequencies, '4n');

        // Set the sequence to play only once
        sequence.loop = false;

        // Start the sequence
        sequence.start(0);

        // Start the transport
        Tone.Transport.start();

        isPlaying = true;
        isFinished = false;

        // Calculate the total duration
        const totalDuration = frequencies.length * noteDuration;

        // Schedule stopPlayback() after the total duration
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
        }, totalDuration);
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
        const maxValue = Math.max(...window.values); // Maximum data value

        // Handle the case where all values are the same
        if (minValue === maxValue) {
            return (minFreq + maxFreq) / 2;
        }

        // Normalize the value to a frequency within the specified range
        return ((value - minValue) / (maxValue - minValue)) * (maxFreq - minFreq) + minFreq;
    }
});
