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

    let animationPaused = false;
    let animationIndex = 0; // Track where the animation left off
    let originalColors = []; //Tracks original colors for the highlight animations
    let animationTimeout; //tracks timeout for animation
    let chartReference; //references for chart and indices to change color
    let startIndexRef, endIndexRef

    // Initialize the speed display
    speedValue.textContent = speedRange.value + 'x';

    // Event Listener for Play button
    playButton.addEventListener('click', async function () {
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
    
    

    // Pause button
    pauseButton.addEventListener('click', function () {
        if (isPlaying) {
            Tone.Transport.pause();
            isPlaying = false;
            
            playButton.disabled = false;
            pauseButton.disabled = true;
    
            animationPaused = true; // Stop animation at current index

            clearTimeout(animationTimeout); //clears the color
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
    

function  visualIndicator(chart, startIndex, endIndex, speed) { //Visual indication of what indices are being sonified. Changes color of each bar to blue and then back.
    chartReference = chart;
    startIndexRef = startIndex;
    endIndexRef = endIndex;

    const dataset = chart.data.datasets[0];

    // Ensure backgroundColor is an array
    if (!Array.isArray(dataset.backgroundColor)) {
        dataset.backgroundColor = new Array(chart.data.labels.length).fill(dataset.backgroundColor);
    }

    // Store the original colors once at the start
    if (originalColors.length === 0) {
        originalColors = [...dataset.backgroundColor];
    }

    if (animationIndex === 0 || animationIndex < startIndex) {
        animationIndex = startIndex; // Reset animation index only if it's not resuming
    }

    animationPaused = false;

    highlightNextBar();
}
function highlightNextBar() {
        if (animationPaused) return; // Stop execution if paused
    
        const dataset = chartReference.data.datasets[0];
    
        // If the animation is finished, restore the final bar's color and stop
        if (animationIndex > endIndexRef) {
            dataset.backgroundColor[endIndexRef] = originalColors[endIndexRef]; // Reset final bar color
            chartReference.update();
            return;
        }
    
        if (animationIndex > startIndexRef) {
            dataset.backgroundColor[animationIndex - 1] = originalColors[animationIndex - 1];
        }
    
        // Highlight the current bar
        dataset.backgroundColor[animationIndex] = 'rgba(0, 0, 255, 1)';
    
        chartReference.update();
    
        animationIndex++; // Move to the next bar
    
        const noteDuration = Tone.Time('4n').toMilliseconds();
        animationTimeout = setTimeout(highlightNextBar, noteDuration);
    }




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
        const minFreq = 200;  // lower bound
        const maxFreq = 800;  // upper bound
        const minValue = Math.min(...window.values);
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
