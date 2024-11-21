// scripts/upload.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadForm = document.getElementById('upload-form');

    // Handle file selection
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file type and size
            if (!file.name.endsWith('.csv')) {
                alert("Invalid file type. Please upload a CSV file.");
                fileInput.value = '';
                fileNameDisplay.textContent = 'No file selected';
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2 MB limit
                alert("File is too large. Please upload a file smaller than 2 MB.");
                fileInput.value = '';
                fileNameDisplay.textContent = 'No file selected';
                return;
            }
            // Display the selected file name
            fileNameDisplay.textContent = file.name;

            // Read the file content and store it in localStorage
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvData = e.target.result;
                localStorage.setItem('uploadedCSV', csvData);
            };
            reader.readAsText(file);
        }
    });

    // Handle form submission
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!fileInput.value) {
            alert("Please select a CSV file.");
            return;
        }
        if (!localStorage.getItem('uploadedCSV')) {
            alert("File not ready yet. Please wait a moment and try again.");
            return;
        }
        // Redirect to the graph selection page
        window.location.href = 'graph-selection.html';
    });
});
