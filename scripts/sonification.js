'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // =====================================================
    // Global Variables and UI Elements
    // =====================================================
    
    // Grab references to UI buttons and display elements
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const resetButton = document.getElementById('resetButton');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');

    // Audio-related objects and playback control variables
    let audioObject = null;          // Holds the Tone.js audio object (Sequence or Oscillator)
    let oscillator = null;           // Used for continuous (line graph) sonification
    let synth = null;                // Used for discrete sonification (bar, scatter, or heatmap)
    let isPlaying = false;           // Indicates whether audio is currently playing
    let isFinished = false;          // Indicates whether playback has finished
    let scheduledId = null;          // ID for scheduled stop event in Tone.Transport
    let animationPaused = false;     // Flag to indicate if the visual animation is paused
    let animationIndex = 0;          // Current index for chart highlighting animation
    let originalColors = [];         // Stores original Chart.js colors to restore after highlighting
    let animationTimeout;            // ID for the setTimeout used in Chart.js highlighting
    let chartReference;              // Reference to the Chart.js chart object
    let startIndexRef, endIndexRef;  // Start and end indices for chart highlighting range

    // Global variable to store the heatmap sonification range (using flattened indices)
    window.heatmapSonificationRange = null;

    // Initialize the speed display with the current speed value from the slider
    speedValue.textContent = speedRange.value + 'x';


    // =====================================================
    // Event Listener: Play Button
    // =====================================================

    playButton.addEventListener('click', async function () {
        // Ensure Tone.js is started
        await Tone.start();
        // Retrieve the type of graph selected from local storage
        const selectedGraph = localStorage.getItem('selectedGraph');

        // If playback is not already active and hasn't finished, start a new session
        if (!isPlaying && !isFinished && !audioObject) {
            const speed = parseFloat(speedRange.value);
            // Check if the selected graph is a heatmap
            if (selectedGraph && selectedGraph.toLowerCase() === 'heatmap') {
                playButton.disabled = true;
                pauseButton.disabled = false;
                resetButton.disabled = false;
                // Start heatmap sonification with integrated highlighting
                sonifyHeatmap(window.heatmapData, speed);
            } else if (selectedGraph && selectedGraph.toLowerCase() === 'line') {
                // For continuous (line) graphs, get start and end indices from the UI
                const startIndex = parseInt(document.getElementById('startIndex').value);
                const endIndex = parseInt(document.getElementById('endIndex').value);
                // Validate the provided indices
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
                playButton.disabled = true;
                pauseButton.disabled = false;
                resetButton.disabled = false;
                // Start continuous sonification for the line graph
                sonifyContinuous(window.labels, window.values, startIndex, endIndex, speed);
                animationPaused = false;
                originalColors = [];
                animationIndex = startIndex;
                // Begin the visual indicator (chart highlighting) animation
                visualIndicator(myChart, startIndex, endIndex, speed);
            } else {
                // For discrete sonification (bar, scatter, etc.), get indices from the UI
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
                    document.getElementById('endIndex').value = window.values.length - 1;
                    return;
                }
                playButton.disabled = true;
                pauseButton.disabled = false;
                resetButton.disabled = false;
                // Start discrete sonification
                sonifyDiscrete(window.labels, window.values, startIndex, endIndex, speed);
                animationPaused = false;
                originalColors = [];
                animationIndex = startIndex;
                // Begin visual indicator animation for the discrete graph
                visualIndicator(myChart, startIndex, endIndex, speed);
            }
        } else if (isFinished) {
            // If playback has finished, keep the play button disabled
            playButton.disabled = true;
        } else if (audioObject && !isPlaying) {
            // If playback is paused, resume Tone.Transport and update UI states
            Tone.Transport.start();
            isPlaying = true;
            playButton.disabled = true;
            pauseButton.disabled = false;
            animationPaused = false;
            const sel = localStorage.getItem('selectedGraph').toLowerCase();
            if (sel === 'heatmap') {
                // For heatmaps, the Tone.Sequence callback automatically resumes highlighting
            } else if (myChart && myChart.data && myChart.data.datasets && myChart.data.datasets[0].backgroundColor) {
                // Restore the previous color for the last highlighted bar and continue highlighting
                myChart.data.datasets[0].backgroundColor[animationIndex - 1] = originalColors[animationIndex - 1];
                myChart.update();
                highlightNextBar();
            }
        }
    });


    // =====================================================
    // Event Listener: Pause Button
    // =====================================================
    pauseButton.addEventListener('click', function () {
        if (isPlaying) {
            // Pause Tone.Transport to pause audio playback
            Tone.Transport.pause();
            isPlaying = false;
            playButton.disabled = false;
            pauseButton.disabled = true;
            animationPaused = true;
            clearTimeout(animationTimeout);  // Stop any ongoing animation timeout
            // Note: For heatmaps, the associated Tone.Sequence pauses automatically
        }
    });


    // =====================================================
    // Event Listener: Reset Button
    // =====================================================
    resetButton.addEventListener('click', function() {
        // Stop and reset playback and animations
        stopAndResetPlayback();
    });


    // =====================================================
    // Event Listener: Speed Range Slider
    // =====================================================
    speedRange.addEventListener('input', function() {
        const speed = parseFloat(speedRange.value);
        // Update the speed display to show the current multiplier
        speedValue.textContent = speed + 'x';
        // If audio is playing, adjust the BPM of Tone.Transport accordingly
        if (isPlaying) {
            Tone.Transport.bpm.value = 120 * speed;
        }
    });


    // ===============================
    // Sonification Functions
    // ===============================

    // Discrete sonification for bar, scatter, etc.
    function sonifyDiscrete(labels, values, startIndex, endIndex, speed) {
        // Extract the selected range of values and convert them to frequencies
        const rangeValues = values.slice(startIndex, endIndex + 1);
        const frequencies = rangeValues.map(v => mapValueToFrequency(v));

        if (frequencies.length === 0) {
            alert('No data points to sonify in the selected range.');
            return;
        }

        // Stop any existing playback before starting new playback
        stopAndResetPlayback(true);
        if (!synth) {
            // Initialize the synthesizer if it hasn't been created yet
            synth = new Tone.Synth().toDestination();
        }
        // Set playback speed by adjusting BPM
        Tone.Transport.bpm.value = 120 * speed;
        // Create a Tone.Sequence to play each frequency in order
        audioObject = new Tone.Sequence((time, freq) => {
            synth.triggerAttackRelease(freq, '8n', time);
        }, frequencies, '4n');
        audioObject.loop = false;
        audioObject.start(0);
        Tone.Transport.start();
        isPlaying = true;
        isFinished = false;
        // Schedule a stop event once all notes have played
        const noteDuration = Tone.Time('4n').toSeconds();
        const totalDuration = frequencies.length * noteDuration;
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
        }, totalDuration);
    }

    // Continuous sonification for line graphs with smooth transitions
    function sonifyContinuous(labels, values, startIndex, endIndex, speed) {
        // Extract the selected range of values and map them to frequencies
        const rangeValues = values.slice(startIndex, endIndex + 1);
        const frequencies = rangeValues.map(v => mapValueToFrequency(v));

        if (frequencies.length === 0) {
            alert('No data points to sonify in the selected range.');
            return;
        }

        // Reset any existing playback
        stopAndResetPlayback(true);
        Tone.Transport.bpm.value = 120 * speed;
        // Initialize an oscillator for continuous sound generation
        oscillator = new Tone.Oscillator().toDestination();
        oscillator.sync();
        oscillator.frequency.value = frequencies[0];
        oscillator.start(0);
        audioObject = oscillator;
        const noteDuration = Tone.Time('4n').toSeconds();
        const totalDuration = frequencies.length * noteDuration;
        // Schedule frequency updates to smoothly glide between notes
        for (let i = 0; i < frequencies.length - 1; i++) {
            const offset = i * noteDuration;
            Tone.Transport.schedule((scheduledTime) => {
                oscillator.frequency.setValueAtTime(frequencies[i], scheduledTime);
                oscillator.frequency.linearRampToValueAtTime(
                    frequencies[i + 1],
                    scheduledTime + noteDuration
                );
            }, offset);
        }
        // Schedule playback stop after the total duration
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
        }, totalDuration);
        Tone.Transport.start();
        isPlaying = true;
        isFinished = false;
    }


    // =====================================================
    // Heatmap Sonification with Integrated Highlighting
    // =====================================================

    function sonifyHeatmap(data, speed) {
        if (!data || !data.z) {
            alert("No heatmap data available for sonification.");
            return;
        }
        // Get start and end indices from the UI for the heatmap
        const startIndexUI = parseInt(document.getElementById('startIndex').value);
        const endIndexUI = parseInt(document.getElementById('endIndex').value);
        const zMatrix = data.z;
        const numRows = zMatrix.length;
        const numCols = zMatrix[0].length;
        let flattened = [];
        // Flatten the 2D heatmap matrix into a 1D array
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                flattened.push(zMatrix[i][j]);
            }
        }
        let startIndex = 0, endIndex = flattened.length - 1;
        // Validate the indices provided by the user
        if (!isNaN(startIndexUI) && !isNaN(endIndexUI) && startIndexUI <= endIndexUI &&
            startIndexUI >= 0 && endIndexUI < flattened.length) {
            startIndex = startIndexUI;
            endIndex = endIndexUI;
        } else {
            alert(`Please enter valid start and end indices between 0 and ${flattened.length - 1}.`);
            document.getElementById('endIndex').value = flattened.length - 1;
            return;
        }
        // Create a subset of the flattened data to be sonified
        const subset = flattened.slice(startIndex, endIndex + 1);
        let minVal = Infinity, maxVal = -Infinity;
        // Determine the minimum and maximum values in the subset for frequency mapping
        subset.forEach(val => {
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
        });
        // Map each data point to an object with a frequency and its flattened index
        const freqObjects = subset.map((v, i) => {
            return { freq: mapHeatmapValueToFrequency(v, minVal, maxVal), index: startIndex + i };
        });
        if (freqObjects.length === 0) {
            alert('No data points to sonify in the heatmap.');
            return;
        }
        // Reset any existing playback
        stopAndResetPlayback(true);
        if (!synth) {
            // Create the synthesizer if needed
            synth = new Tone.Synth().toDestination();
        }
        Tone.Transport.bpm.value = 120 * speed;
        // Use Tone.Sequence to play notes and trigger cell highlighting in sync
        audioObject = new Tone.Sequence((time, noteObj) => {
            synth.triggerAttackRelease(noteObj.freq, '8n', time);
            // Highlight the corresponding cell in the heatmap
            highlightHeatmapCell(noteObj.index);
        }, freqObjects, '4n');
        audioObject.loop = false;
        audioObject.start(0);
        Tone.Transport.start();
        isPlaying = true;
        isFinished = false;
        const noteDuration = Tone.Time('4n').toSeconds();
        const totalDuration = freqObjects.length * noteDuration;
        // Schedule a stop event that also clears heatmap highlights after playback
        scheduledId = Tone.Transport.scheduleOnce((time) => {
            stopPlayback(time);
            Plotly.relayout('myPlotlyChart', { shapes: [] });
        }, totalDuration);
        // Save the sonification range for potential future reference
        window.heatmapSonificationRange = { start: startIndex, end: endIndex };
    }


    // =====================================================
    // Mapping Functions: Convert Data Values to Frequencies
    // =====================================================

    // Map a general data value to a frequency between 200 and 800 Hz
    function mapValueToFrequency(value) {
        const minFreq = 200;
        const maxFreq = 800;
        const minValue = Math.min(...window.values);
        const maxValue = Math.max(...window.values);
        // If all values are the same, return the midpoint frequency
        if (minValue === maxValue) {
            return (minFreq + maxFreq) / 2;
        }
        // Linear mapping of value to frequency
        return ((value - minValue) / (maxValue - minValue)) * (maxFreq - minFreq) + minFreq;
    }

    // Map a heatmap data value to a frequency using specified min and max values
    function mapHeatmapValueToFrequency(value, minValue, maxValue) {
        const minFreq = 200;
        const maxFreq = 800;
        // Handle case where all values are equal
        if (minValue === maxValue) {
            return (minFreq + maxFreq) / 2;
        }
        // Linear mapping of the heatmap value to frequency
        return ((value - minValue) / (maxValue - minValue)) * (maxFreq - minFreq) + minFreq;
    }


    // =============================================
    // Highlighting Functions for Non-Heatmap Graphs
    // =============================================

    // Initialize and start the visual indicator for chart highlighting
    function visualIndicator(chart, startIndex, endIndex, speed) {
        chartReference = chart;
        startIndexRef = startIndex;
        endIndexRef = endIndex;
        const dataset = chart.data.datasets[0];
        // Ensure the backgroundColor is an array for individual bar highlighting
        if (!Array.isArray(dataset.backgroundColor)) {
            dataset.backgroundColor = new Array(chart.data.labels.length).fill(dataset.backgroundColor);
        }
        // Save the original colors if not already saved
        if (originalColors.length === 0) {
            originalColors = [...dataset.backgroundColor];
        }
        // Reset the animation index if needed
        if (animationIndex === 0 || animationIndex < startIndex) {
            animationIndex = startIndex;
        }
        animationPaused = false;
        // Start the recursive highlighting process
        highlightNextBar();
    }

    // Highlight the next bar in the chart by updating its background color
    function highlightNextBar() {
        if (animationPaused) return; // Exit if animation is paused
        const dataset = chartReference.data.datasets[0];
        // If finished, restore the last bar's original color
        if (animationIndex > endIndexRef) {
            dataset.backgroundColor[endIndexRef] = originalColors[endIndexRef];
            chartReference.update();
            return;
        }
        // Restore the color of the previous bar (if applicable)
        if (animationIndex > startIndexRef) {
            dataset.backgroundColor[animationIndex - 1] = originalColors[animationIndex - 1];
        }
        // Highlight the current bar by setting its color to white
        dataset.backgroundColor[animationIndex] = 'rgba(0, 0, 255, 1)';
        chartReference.update();
        animationIndex++;
        // Schedule the next highlight based on the note duration
        const noteDuration = Tone.Time('4n').toMilliseconds();
        animationTimeout = setTimeout(highlightNextBar, noteDuration);
    }

    // Highlight a specific cell in the heatmap using its flattened index
    function highlightHeatmapCell(flatIndex) {
        const numCols = window.heatmapData.x.length;
        const row = Math.floor(flatIndex / numCols);
        const col = flatIndex % numCols;
        // Define a rectangular shape to visually highlight the cell
        const shape = {
            type: 'rect',
            xref: 'x',
            yref: 'y',
            x0: col - 0.5,
            y0: row - 0.5,
            x1: col + 0.5,
            y1: row + 0.5,
            line: {
                color: 'white', // Use a white border for clear visibility
                width: 3
            }
        };
        // Update the Plotly chart to display the highlight
        Plotly.relayout('myPlotlyChart', { shapes: [shape] });
    }


    // =======================================
    // Stop and Reset Functions
    // =======================================

    // Stop playback and perform cleanup after playback is finished
    function stopPlayback(time) {
        if (isPlaying || !isFinished) {
            isPlaying = false;
            isFinished = true;
            // Disable the play and pause buttons after playback completion
            playButton.disabled = true;
            playButton.setAttribute('aria-disabled', 'true');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');
            // Stop Tone.Transport if it is running
            if (Tone.Transport.state !== 'stopped') {
                Tone.Transport.stop(time);
            }
            // Stop and dispose of the audio object if it exists
            if (audioObject) {
                audioObject.stop(time);
                audioObject.dispose();
                audioObject = null;
            }
            oscillator = null;
            // Clear any scheduled stop events from Tone.Transport
            if (scheduledId !== null) {
                Tone.Transport.clear(scheduledId);
                scheduledId = null;
            }
        }
    }

    // Stop playback immediately and reset all playback and animation states
    function stopAndResetPlayback(skipButtonReset = false) {
        if (Tone.Transport.state !== 'stopped') {
            Tone.Transport.stop();
        }
        if (audioObject) {
            audioObject.stop();
            audioObject.dispose();
            audioObject = null;
        }
        oscillator = null;
        if (scheduledId !== null) {
            Tone.Transport.clear(scheduledId);
            scheduledId = null;
        }
        animationPaused = false;
        clearTimeout(animationTimeout);
        // Restore original colors in the chart if highlighting was in progress
        if (chartReference) {
            const dataset = chartReference.data.datasets[0];
            if (originalColors.length > 0) {
                dataset.backgroundColor = [...originalColors];
            }
            chartReference.update();
        }
        // Reset animation-related variables
        animationIndex = 0;
        originalColors = [];
        isPlaying = false;
        isFinished = false;
        // Reset Tone.Transport's position to the beginning
        Tone.Transport.position = 0;
        // Reset UI button states unless skipping the reset for buttons
        if (!skipButtonReset) {
            playButton.disabled = false;
            playButton.setAttribute('aria-disabled', 'false');
            pauseButton.disabled = true;
            pauseButton.setAttribute('aria-disabled', 'true');
            resetButton.disabled = false;
            resetButton.setAttribute('aria-disabled', 'false');
        }
    }
});
