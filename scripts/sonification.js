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
    
        if (!isPlaying && !isFinished && !audioObject) {
            const startIndex = parseInt(document.getElementById('startIndex').value);
            const endIndex = parseInt(document.getElementById('endIndex').value);
    
            if (
                isNaN(startIndex) ||
                isNaN(endIndex) ||
                startIndex > endIndex ||
                startIndex < 0 ||
                endIndex >= window.values.length
            ) {
                alert(`Please enter valid start and end indices between 0 and ${window.values.length - 1}.`);
                document.getElementById('endIndex').value = window.values.length - 1;
                return;
            }
    
            // Enable buttons
            playButton.disabled = true;
            pauseButton.disabled = false;
            resetButton.disabled = false;
    
            const speed = parseFloat(speedRange.value);
            sonifyData(window.labels, window.values, startIndex, endIndex, speed);
            
            animationPaused = false;
            originalColors = []; // Reset colors
            animationIndex = startIndex;
            visualIndicator(myChart, startIndex, endIndex, speed);
    
        } else if (isFinished) {
            playButton.disabled = true;
    
        } else if (audioObject && !isPlaying) {
            // Resume audio
            Tone.Transport.start();
            isPlaying = true;
    
            playButton.disabled = true;
            pauseButton.disabled = false;
    
            // Resume animation
            animationPaused = false;
    
            // Restore the last highlighted bar before continuing
            if (animationIndex > 0) {
                myChart.data.datasets[0].backgroundColor[animationIndex - 1] = originalColors[animationIndex - 1];
            }
    
            myChart.update();
            highlightNextBar(); // Resume animation for coloring successive bars
        }
    });
    
        if (!isPlaying && !isFinished && !sequence) {
            // Starting new sonification
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

            // Create the synth if it doesn't exist
            if (!synth) {
                synth = new Tone.Synth().toDestination();
            }

            // Get the speed value
            const speed = parseFloat(speedRange.value);

            // Call the function to sonify the selected data range
            sonifyData(window.labels, window.values, startIndex, endIndex, speed);

        } else if (isFinished) {
            // Sonification is finished; disable play button
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
        } else if (sequence) {
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

        // Reset the transport position
        Tone.Transport.position = 0;
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
        const frequencies = rangeValues.map(v => mapValueToFrequency(v));


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
        const noteDuration = Tone.Time('4n').toSeconds();
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

    // Playback stopped
    function stopPlayback(time) {
        if (isPlaying || !isFinished) {
            isPlaying = false;
            isFinished = true;

            // Disable play & pause
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');

            // Enable reset
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');

            // Stop transport
            if (Tone.Transport.state !== 'stopped') {
                Tone.Transport.stop(time);
            }

            // Dispose audio object
            if (audioObject) {
                audioObject.stop(time);
                audioObject.dispose();
                audioObject = null;
            }
            oscillator = null;

            // Clear final event
            if (scheduledId !== null) {
                Tone.Transport.clear(scheduledId);
                scheduledId = null;
            }
        }
    }

    // Manual stop and reset
    function stopAndResetPlayback(skipButtonReset = false) {
        // Stop transport
        if (Tone.Transport.state !== 'stopped') {
            Tone.Transport.stop();
        }
    
        // Dispose audio
        if (audioObject) {
            audioObject.stop();
            audioObject.dispose();
            audioObject = null;
        }
        oscillator = null;
    
        // Clear final event
        if (scheduledId !== null) {
            Tone.Transport.clear(scheduledId);
            scheduledId = null;
        }
    
        animationPaused = false;
        clearTimeout(animationTimeout); // Stop any pending highlight timeouts
    
        // Reset graph colors if chart exists
        if (chartReference) {
            const dataset = chartReference.data.datasets[0];
            if (originalColors.length > 0) {
                dataset.backgroundColor = [...originalColors]; // Restore all bars to original color
            }
            chartReference.update();
        }
    
        // Reset visualIndicator
        animationIndex = 0;
        originalColors = [];
    
        // Reset flags
        isPlaying = false;
        isFinished = false;
        Tone.Transport.position = 0;
    
        // Only reset buttons if skipButtonReset is false
        if (!skipButtonReset) {
            playButton.disabled = false;
            playButton.setAttribute('aria-disabled', 'false');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');
        }
    }
    
    // Map data value to frequency
    function mapValueToFrequency(value) {

        const minFreq = 200; // Minimum frequency (in Hz)
        const maxFreq = 800; // Maximum frequency (in Hz)
        const minValue = Math.min(...window.values); // Minimum data value

        const maxValue = Math.max(...window.values);

        // If all data are identical, pick the midpoint
        if (minValue === maxValue) {
            return (minFreq + maxFreq) / 2;
        }

        // Scale data value into frequency range
        return ((value - minValue) / (maxValue - minValue)) *
               (maxFreq - minFreq) + minFreq;
    }
});
