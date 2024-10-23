// scripts/graphSelection.js

function handleCheckboxChange(checkbox) {
    const lineGraph = document.getElementById('lineGraph'); //Checks the different types of graphs
    const barGraph = document.getElementById('barGraph');

    if (checkbox === lineGraph && lineGraph.checked) {
        barGraph.checked = false;
    } else if (checkbox === barGraph && barGraph.checked) { //Disallows the user from selecting multiple types of graphs (may need to change later)
        lineGraph.checked = false;
    }
}

function confirmSelection() {
    const lineGraph = document.getElementById('lineGraph').checked; //confirms selection 
    const barGraph = document.getElementById('barGraph').checked;

    if (!lineGraph && !barGraph) {
        alert("Please select a graph type."); //Warning for no selection
        return;
    }

    // Store the selected graph type in local storage
    const selectedGraph = lineGraph ? 'Line' : 'Bar';
    localStorage.setItem('selectedGraph', selectedGraph); //Stores the selection

    // Redirect to the view graph page
    window.location.href = 'View-Graph.html'; //Goes to View-Graph after saving the selection.
}
