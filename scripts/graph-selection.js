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

        // Get the graph name, if any
        const graphNameInput = document.getElementById('graphName');
        const graphName = graphNameInput.value.trim();

        // Store the selected graph type and graph name
        localStorage.setItem('selectedGraph', selectedGraph.value);
        if (graphName) {
            localStorage.setItem('graphName', graphName);
        } else {
            localStorage.removeItem('graphName');
        }
        // Redirect to the view graph page
        window.location.href = 'view-graph.html';
    });
});
