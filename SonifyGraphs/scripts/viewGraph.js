// scripts/viewGraph.js

// Function to parse CSV data into arrays
function parseCSV(data) {
    const rows = data.split('\n');
    const labels = [];
    const values = [];
    
    rows.forEach((row, index) => {
        if (index === 0) return; // skip header row
        const cols = row.split(',');
        labels.push(cols[0]);
        values.push(parseFloat(cols[1]));
    });

    return { labels, values };
}

// Function to create the chart
function createChart(type, labels, values) {
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: type.toLowerCase(), // 'line' or 'bar'
        data: {
            labels: labels,
            datasets: [{
                label: `${type} Graph`,
                data: values,
                backgroundColor: type === 'Bar' ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)', //Color and design option for the graphs
                borderColor: type === 'Bar' ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Main function to set up the page
function setupGraph() {
    const selectedGraph = localStorage.getItem('selectedGraph'); //Gets graph choice from local memory
    
    if (!selectedGraph) {
        alert("No graph type selected.");
        window.location.href = 'Graph-Selection.html'; // redirect to selection page
        return;
    }

    // Retrieve the uploaded CSV data from local storage
    const csvData = localStorage.getItem('uploadedCSV');
    if (!csvData) {
        alert("No CSV data uploaded.");
        window.location.href = 'Upload.html'; //Error for no selected type, goes back to upload page. 
        return;
    }

    // Parse CSV data and create the chart
    const data = parseCSV(csvData);
    createChart(selectedGraph, data.labels, data.values);
}

// Call the setup function when the page loads
window.onload = setupGraph;
