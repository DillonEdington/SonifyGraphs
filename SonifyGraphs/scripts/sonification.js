// scripts/sonification.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const playRangeButton = document.getElementById('playRange');

    // Event listener for the play range button
    playRangeButton.addEventListener('click', async function() {
        // Start the AudioContext if not already started
        await Tone.start();

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
            alert("Please enter valid start and end indices.");
            return;
        }

        // Call the function to sonify the selected data range
        sonifyData(window.labels, window.values, startIndex, endIndex);
    });

    // Function to sonify the data within the selected range
    function sonifyData(labels, values, startIndex, endIndex) {
        // Extract the range of values to sonify
        const rangeValues = values.slice(startIndex, endIndex + 1);

        // Create a synthesizer using Tone.js
        const synth = new Tone.Synth().toDestination();

        // Map data values to frequencies
        const frequencies = rangeValues.map(value => mapValueToFrequency(value));

        // Schedule notes to play in sequence
        let now = Tone.now();
        frequencies.forEach((frequency, index) => {
            synth.triggerAttackRelease(frequency, "8n", now + index * 0.5); // Play each note with a 0.5-second interval
        });
    }

    // Function to map data values to frequencies
    function mapValueToFrequency(value) {
        const minFreq = 100; // Minimum frequency (in Hz)
        const maxFreq = 1000; // Maximum frequency (in Hz)
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
