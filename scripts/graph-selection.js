// scripts/graph-selection.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('graph-selection-form');

    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        // Get the selected graph type
        const selectedGraph = document.querySelector('input[name="graphType"]:checked');
        if (!selectedGraph) {
            alert("Please select a graph type.");
            return;
        }
        // Store the selected graph type in localStorage
        localStorage.setItem('selectedGraph', selectedGraph.value);
        // Redirect to the view graph page
        window.location.href = 'view-graph.html';
    });
});
