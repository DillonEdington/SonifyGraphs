// scripts/view-graph.js
'use strict';

// Attach labels and values to the window object to make them globally accessible
window.labels = [];
window.values = [];
window.xAxisLabel = 'X-axis'; // Default axis labels
window.yAxisLabel = 'Y-axis';

// Global variable for heatmap data
window.heatmapData = null;

/*
------------------------------
CSV Parsing Functions
------------------------------
*/

// CSV parser for two-column data (used by Chart.js)
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

// CSV parser for heatmap data (expects three columns: x, y, z)
function parseCSVHeatmap(data) {
    const rows = data.trim().split('\n');
    if (rows.length < 2) {
        throw new Error("CSV data must have at least one data row in addition to the header.");
    }
    // Extract the header row
    const headerRow = rows[0].split(',');
    if (headerRow.length < 3) {
        throw new Error("The CSV header must have at least three columns. (e.g., x, y, z)");
    }
    // Use header row for default axis labels
    const xHeader = headerRow[0].trim();
    const yHeader = headerRow[1].trim();
    // Use arrays to preserve insertion order
    let xValues = [];
    let yValues = [];
    // Temporary storage for data points
    const points = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 3) {
            throw new Error(`Row ${i + 1} does not have three columns.`);
        }
        const xVal = cols[0].trim();
        const yVal = cols[1].trim();
        const zVal = parseFloat(cols[2].trim());

        if (xVal === "" || yVal === "" || isNaN(zVal)) {
            throw new Error(`Invalid data at row ${i + 1}.`);
        }
        if (!xValues.includes(xVal)) {
            xValues.push(xVal);
        }
        if (!yValues.includes(yVal)) {
            yValues.push(yVal);
        }
        points.push({ x: xVal, y: yVal, z: zVal });
    }

    // Initialize a 2D matrix for z values with dimensions [yValues.length][xValues.length]
    const zMatrix = [];
    for (let i = 0; i < yValues.length; i++) {
        zMatrix[i] = new Array(xValues.length).fill(null);
    }

    // Fill the matrix using the data points in the order they were encountered
    points.forEach(point => {
        const colIndex = xValues.indexOf(point.x);
        const rowIndex = yValues.indexOf(point.y);
        zMatrix[rowIndex][colIndex] = point.z;
    });

    // Store the parsed data globally for heatmap usage
    window.heatmapData = { x: xValues, y: yValues, z: zMatrix };
    // Also set the axis labels from the header
    window.xAxisLabel = xHeader;
    window.yAxisLabel = yHeader;

    return window.heatmapData;
}

/*
------------------------------
Graph Setup and Rendering
------------------------------ 
*/
// Main function to set up the graph on page load
function setupGraph() {
    try {
        const selectedGraph = localStorage.getItem('selectedGraph');
        if (!selectedGraph) {
            throw new Error("No graph type selected.");
        }

        // Check for data in order of priority: manualData first, then uploadedCSV
        let dataSource = '';
        const manualData = localStorage.getItem('manualData');
        const uploadedCSV = localStorage.getItem('uploadedCSV');

        if (manualData && selectedGraph.toLowerCase() !== 'heatmap') {
            dataSource = 'manualData';
            const data = JSON.parse(manualData);
            window.labels = data.labels;
            window.values = data.values;
            window.xAxisLabel = 'X-axis';
            window.yAxisLabel = 'Y-axis';
        } else if (uploadedCSV) {
            dataSource = 'uploadedCSV';
            if (selectedGraph.toLowerCase() === 'heatmap') {
                parseCSVHeatmap(uploadedCSV);
            } else {
                parseCSV(uploadedCSV);
            }
        } else {
            throw new Error("No data available to display.");
        }

        if (selectedGraph.toLowerCase() === 'heatmap' && (!window.heatmapData || !window.heatmapData.z.length)) {
            throw new Error("Insufficient heatmap data.");
        } else if ((selectedGraph.toLowerCase() !== 'heatmap') && window.labels.length < 2) {
            throw new Error("Insufficient data to create a graph.");
        }

        createChart(selectedGraph, window.labels, window.values);
    } catch (error) {
        alert(error.message);
        console.error(error);
        window.location.href = 'upload.html';
    }
}

// Function to create and render the chart
function createChart(type, labels, values) {
    if (type.toLowerCase() === 'heatmap') {
        // Hide Chart.js canvas and show Plotly div
        document.getElementById('myChart').style.display = 'none';
        const plotlyDiv = document.getElementById('myPlotlyChart');
        plotlyDiv.style.display = 'block';

        // For the heatmap, preserve insertion order.
        // If y-axis values are numeric, reverse the order so that the smallest appears at the bottom.
        let yAxisTickVals, yAxisTickText, zMatrixToPlot;
        const areYNumeric = window.heatmapData.y.every(v => !isNaN(parseFloat(v)));
        if (areYNumeric) {
            yAxisTickVals = Array.from(Array(window.heatmapData.y.length).keys()).reverse();
            yAxisTickText = window.heatmapData.y.slice().reverse();
            zMatrixToPlot = window.heatmapData.z.slice().reverse();
        } else {
            yAxisTickVals = Array.from(Array(window.heatmapData.y.length).keys());
            yAxisTickText = window.heatmapData.y;
            zMatrixToPlot = window.heatmapData.z;
        }

        const data = [
            {
                z: zMatrixToPlot,
                x: Array.from(Array(window.heatmapData.x.length).keys()),
                type: 'heatmap'
            }
        ];
        const layout = {
            title: localStorage.getItem('graphName') || 'Your Graph',
            xaxis: {
                title: window.xAxisLabel,
                tickvals: Array.from(Array(window.heatmapData.x.length).keys()),
                ticktext: window.heatmapData.x,
                range: [-0.5, window.heatmapData.x.length - 0.5],
                autorange: false
            },
            yaxis: {
                title: window.yAxisLabel,
                tickvals: yAxisTickVals,
                ticktext: yAxisTickText,
                range: [-0.5, window.heatmapData.y.length - 0.5],
                autorange: false
            }
        };
        Plotly.newPlot('myPlotlyChart', data, layout, {displayModeBar: false});
    } else {
       // For other graph types, use Chart.js
       document.getElementById('myChart').style.display = 'block';
       document.getElementById('myPlotlyChart').style.display = 'none';

       const ctx = document.getElementById('myChart').getContext('2d');
       const chartConfig = {
           type: type.toLowerCase(),
           data: {
               labels: labels,
               datasets: [{
                   label: window.yAxisLabel,
                   data: values,
                backgroundColor: type.toLowerCase() === 'bar' ? 'rgba(139, 104, 127, 0.5)' : 'rgba(92, 116, 87,.5)',
                borderColor: type.toLowerCase() === 'bar' ? 'rgba(139, 104, 127, 1)' : 'rgba(92, 116, 87,1)',
                borderWidth: 1,
                // this is to fix the fill on line graph: fill color would take all screen
   				fill: type.toLowerCase() === 'line' ? false : true
               }]
           },
           options: {
   			responsive: true,
               scales: {
                   x: {
                       title: {
                           display: true,
                           text: window.xAxisLabel,
   						font: {
   							size: 14 
   						}
   					},
   					ticks: {
   						font: {
   							size: 14
   						}
                       }
                   },
                   y: {
                       beginAtZero: true,
                       title: {
                           display: true,
                           text: window.yAxisLabel,
   						font: {
   							size: 14
   						}
   					},
   					ticks: {
   						font: {
   							size: 14
   						}				
                       }
                   }
               }
           }
       };
                    
        window.myChart = new Chart(ctx, chartConfig);
    }
}

// Function to download the chart as a (0) transparent or (1) opaque image
function downloadChart(control) {
    const canvas = document.getElementById('myChart');
    const chartTitle = document.getElementById('graphTitle').textContent.trim(); // Get the graph title from the HTML
    let image;
    if (control) { // Convert to transparent image
        const tempCanvas = document.createElement('canvas'); // Create a duplicate canvas
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill background with white
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); // fill the duplicate with white

        // Draw the existing chart onto the duplicate canvas
        tempCtx.drawImage(canvas, 0, 0);

        image = tempCanvas.toDataURL('image/jpeg', 1.0);
    }
    else image = canvas.toDataURL('image/png'); // Convert to transparent image
    const link = document.createElement('a'); // Create a download link
    link.href = image;
    link.download = `${chartTitle || 'graph'}.png`; // File name
    link.click();
}

window.onload = function() {
    const graphTitleElement = document.getElementById('graphTitle');
    const graphName = localStorage.getItem('graphName');
    if (graphName) {
        graphTitleElement.textContent = graphName;
    } else {
        graphTitleElement.textContent = 'Your Graph';
    }
    setupGraph();
    // Set default indexes to cover the entire graph for all types.
    const selectedGraph = localStorage.getItem('selectedGraph');
    if (selectedGraph && selectedGraph.toLowerCase() === 'heatmap') {
        let totalCells = window.heatmapData.x.length * window.heatmapData.y.length;
        document.getElementById('startIndex').value = 0;
        document.getElementById('endIndex').value = totalCells - 1;
    } else {
        document.getElementById('startIndex').value = 0;
        document.getElementById('endIndex').value = window.values.length - 1;
    }
    document.getElementById('downloadChartPNG').addEventListener('click', function(){ downloadChart(0); });
    document.getElementById('downloadChartJPEG').addEventListener('click', function(){ downloadChart(1); });
};

// this is the event listener for the zoom
document.getElementById('zoomSlider')?.addEventListener('input', function () {
	if (window.myChart) {
		const zoomLevel = parseFloat(this.value);
		// this is to update charts scale range
		window.myChart.options.scales.y.min = Math.min(...window.values) * zoomLevel;
		window.myChart.options.scales.y.max = Math.max(...window.values) * zoomLevel;
		window.myChart.update();
		
		// this is to update zoom level display
		document.getElementById('zoomLevelValue').textContent = `Zoom: ${zoomLevel}x`;
	}
});

// Updates chart color function
function getColor(hue) {
	return `hsl(${hue}, 100%, 50%)`;
}

// Line Color Slider Event Listener
document.getElementById('colorSlider')?.addEventListener('input', function () {
	if (window.myChart) {
		const hue = this.value;
		const color = getColor(hue);
		
		// this is to update charts color
		window.myChart.data.datasets[0].borderColor = color;
		window.myChart.update();
		
		// this is to update line colors preview
		document.getElementById('lineColorPreview').style.backgroundColor = color;
		document.getElementById('lineColorValue').textContent = `Hue: ${hue}°`;
	}
});

// This is the fill color slider event listener
document.getElementById('fillColorSlider')?.addEventListener('input', function () {
	if (window.myChart) {
		const hue = this.value;
		// this is for opacity
		const color = `hsla(${hue}, 100%, 50%, 0.2)`;
		
		window.myChart.data.datasets[0].backgroundColor = color;
		window.myChart.update();
		
		document.getElementById('fillColorPreview').style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
		document.getElementById('fillColorValue').textContent = `Hue: ${hue}°`;
	}
});
