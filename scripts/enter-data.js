// scripts/enter-data.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const dataForm = document.getElementById('dataForm');
    const dataRows = document.getElementById('dataRows');
    const addRowButton = document.getElementById('addRowButton');
    const deleteRowButton = document.getElementById('deleteRowButton');

    let rowIndex = 0;

    // Function to add a new data row
    function addDataRow() {
        rowIndex++;
        const dataRow = document.createElement('div');
        dataRow.className = 'data-row';

        // Label Input
        const labelLabel = document.createElement('label');
        labelLabel.setAttribute('for', `labelInput${rowIndex}`);
        labelLabel.textContent = 'Label';
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.id = `labelInput${rowIndex}`;
        labelInput.name = `labelInput${rowIndex}`;
        labelInput.required = true;

        // Value Input
        const valueLabel = document.createElement('label');
        valueLabel.setAttribute('for', `valueInput${rowIndex}`);
        valueLabel.textContent = 'Value';
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.id = `valueInput${rowIndex}`;
        valueInput.name = `valueInput${rowIndex}`;
        valueInput.required = true;

        // Append inputs to data row
        dataRow.appendChild(labelLabel);
        dataRow.appendChild(labelInput);
        dataRow.appendChild(valueLabel);
        dataRow.appendChild(valueInput);

        // Append data row to form
        dataRows.appendChild(dataRow);
    }

    // Function to delete the last data row
    function deleteDataRow() {
        if (dataRows.lastElementChild) {
            dataRows.removeChild(dataRows.lastElementChild);
            rowIndex--;
        }
    }

    // Event listeners
    addRowButton.addEventListener('click', addDataRow);
    deleteRowButton.addEventListener('click', deleteDataRow);

    dataForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const labels = [];
        const values = [];
        let valid = true;

        for (let i = 1; i <= rowIndex; i++) {
            const labelInput = document.getElementById(`labelInput${i}`);
            const valueInput = document.getElementById(`valueInput${i}`);

            if (!labelInput.value.trim() || isNaN(valueInput.value)) {
                valid = false;
                break;
            }

            labels.push(labelInput.value.trim());
            values.push(parseFloat(valueInput.value));
        }

        if (!valid || labels.length === 0) {
            alert('Please fill out all fields correctly.');
            return;
        }

        // Store data in localStorage
        localStorage.setItem('manualData', JSON.stringify({ labels, values }));
        window.location.href = 'graph-selection.html';
    });

    // Initialize with one data row
    addDataRow();
});
