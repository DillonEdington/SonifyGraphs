// scripts/enter-data.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const dataTable = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
    const addRowButton = document.getElementById('add-row');
    const deleteRowButton = document.getElementById('delete-row');
    const continueButton = document.getElementById('continueButton');

    // Function to add a new row to the data table
    function addRow() {
        const newRow = dataTable.insertRow();
        const labelCell = newRow.insertCell(0);
        const valueCell = newRow.insertCell(1);

        // Create input elements for label and value
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.setAttribute('aria-label', 'Data label');
        labelInput.required = true;

        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.setAttribute('aria-label', 'Data value');
        valueInput.required = true;

        // Append inputs to the table cells
        labelCell.appendChild(labelInput);
        valueCell.appendChild(valueInput);
    }

    // Function to delete the last row from the data table
    function deleteRow() {
        if (dataTable.rows.length > 0) {
            dataTable.deleteRow(-1); // Delete the last row
        }
    }

    // Function to collect data from the table and store it
    function collectData() {
        const labels = [];
        const values = [];
        let valid = true;

        // Iterate over each row to collect data
        for (let row of dataTable.rows) {
            const labelInput = row.cells[0].firstChild;
            const valueInput = row.cells[1].firstChild;

            // Check if inputs are filled and valid
            if (!labelInput.value || isNaN(valueInput.value)) {
                valid = false;
                break;
            }

            labels.push(labelInput.value.trim());
            values.push(parseFloat(valueInput.value));
        }

        if (!valid || labels.length === 0) {
            alert('Please fill out all fields correctly.');
            return null;
        }

        return { labels, values };
    }

    // Event listeners for the add and delete row buttons
    addRowButton.addEventListener('click', addRow);
    addRowButton.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            addRow();
        }
    });

    deleteRowButton.addEventListener('click', deleteRow);
    deleteRowButton.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            deleteRow();
        }
    });

    // Event listener for the continue button
    continueButton.addEventListener('click', function() {
        const data = collectData();
        if (data) {
            // Store data in localStorage to be used on the next page
            localStorage.setItem('manualData', JSON.stringify(data));
            window.location.href = 'graph-selection.html';
        }
    });

    continueButton.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            continueButton.click();
        }
    });

    // Initialize the table with one row by default
    addRow();
});
