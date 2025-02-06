// scripts/view-graph.js
'use strict';

// Attach labels and values to the window object to make them globally accessible
window.labels = [];
window.values = [];
window.xAxisLabel = 'X-axis'; // Default axis labels
window.yAxisLabel = 'Y-axis';

// Function to parse CSV data into labels and values arrays
function parseCSV(data) {
    const rows = data.trim().split('\n');
    window.labels = [];
    window.values = [];

    if (rows.length < 2) {
        throw new Error("CSV data must have at least one data row in addition to the header.");
    }

    // Extract the header row
    const headerRow = rows[0].split(',');
    if (headerRow.length < 2) {
        throw new Error("The CSV header must have at least two columns.");
    }

    // Set axis labels from the header row
    window.xAxisLabel = headerRow[0].trim();
    window.yAxisLabel = headerRow[1].trim();

    // Iterate over the data rows (skip the header row)
    for (let index = 1; index < rows.length; index++) {
        const row = rows[index];
        const cols = row.split(',');

        if (cols.length < 2) {
            throw new Error(`Row ${index + 1} does not have enough columns.`);
        }

        const xValue = cols[0].trim();
        const yValue = parseFloat(cols[1].trim());

        if (xValue === "") {
            throw new Error(`Missing x-value at row ${index + 1}.`);
        }

        if (isNaN(yValue)) {
            throw new Error(`Invalid number in the Y-axis at row ${index + 1}.`);
        }

        // Add the values to the arrays
        window.labels.push(xValue);
        window.values.push(yValue);
    }

    return { labels: window.labels, values: window.values };
}

// Main function to set up the graph on page load
function setupGraph() {
    try {
        const selectedGraph = localStorage.getItem('selectedGraph');
        if (!selectedGraph) {
            throw new Error("No graph type selected.");
        }

        // Check for data in the order of priority: manualData first, then uploadedCSV
        let dataSource = '';

        const manualData = localStorage.getItem('manualData');
        const uploadedCSV = localStorage.getItem('uploadedCSV');

        if (manualData) {
            dataSource = 'manualData';
            const data = JSON.parse(manualData);
            window.labels = data.labels;
            window.values = data.values;
            // Default axis labels
            window.xAxisLabel = 'X-axis';
            window.yAxisLabel = 'Y-axis';
        } else if (uploadedCSV) {
            dataSource = 'uploadedCSV';
            parseCSV(uploadedCSV);
        } else {
            throw new Error("No data available to display.");
        }

        if (window.labels.length < 2) {
            throw new Error("Insufficient data to create a graph.");
        }

        // Create the chart with the selected graph type and data
        createChart(selectedGraph, window.labels, window.values);
    } catch (error) {
        alert(error.message);
        console.error(error);
        // Redirect back to the upload page if there's an error
        window.location.href = 'upload.html';
    }
}

// Function to create and render the chart
function createChart(type, labels, values) {
    const ctx = document.getElementById('myChart').getContext('2d');

    // Configuration for Line and Bar charts
    const chartConfig = {
        type: type.toLowerCase(),
        data: {
            labels: labels,
            datasets: [{
                label: window.yAxisLabel,
                data: values,
                backgroundColor: type.toLowerCase() === 'bar' ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)',
                borderColor: type.toLowerCase() === 'bar' ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: window.xAxisLabel
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: window.yAxisLabel
                    }
                }
            }
        }
    };

    // Create and render the chart
    new Chart(ctx, chartConfig);
}

// Call the setupGraph function when the page loads
window.onload = function() {
    // Set the graph title
    const graphTitleElement = document.getElementById('graphTitle');
    const graphName = localStorage.getItem('graphName');
    if (graphName) {
        graphTitleElement.textContent = graphName;
    } else {
        graphTitleElement.textContent = 'Your Graph';
    }
    // Proceed to set up the graph
    setupGraph();
    //st end index to maximum value of current graph
    document.getElementById('endIndex').value= window.values.length-1;
};
