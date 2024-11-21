// scripts/upload.js
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadButton = document.getElementById('uploadButton');
	const uploadForm = document.getElementById('uploadForm');

    let fileReady = false;

    // Handle file selection
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        fileReady = false; // Reset the flag
        uploadButton.disabled = true; // Disable the upload button

        if (file) {
            // **Clear manualData from localStorage**
            localStorage.removeItem('manualData');

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
                fileReady = true;
                uploadButton.disabled = false; // Enable the upload button
            };
            reader.readAsText(file);
        }
    });

    // Handle upload button click
    uploadButton.addEventListener('click', function(event) {
        if (!fileReady) {
            alert("File is not ready yet. Please wait a moment.");
            return;
        }
		
		//for database
		event.preventDefault();
		const formData = new FormData(uploadForm);
		formData.append('csvFile', fileInput.files[0]);
		
		fetch('/upload', {
			method: 'POST', 
			body: formData,
		})
		.then(response => response.text())
		.then(data => {
			console.log(data);
	        // Redirect to the graph selection page
	        window.location.href = 'graph-selection.html';
		})
        .catch(error => {
        	console.error('Error Uploading File:', error);
        })
    });
});
