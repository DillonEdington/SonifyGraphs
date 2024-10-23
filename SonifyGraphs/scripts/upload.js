// upload.js

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('fileNameDisplay').textContent = "Selected file: " + file.name; //Displays the name of the file in the box
        
        // Read the file and save its contents in local storage
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvData = e.target.result;
            localStorage.setItem('uploadedCSV', csvData); //Saves data from the uploaded file to local memory.
        };
        reader.readAsText(file);
    }
}

function triggerFileInput() {
    document.getElementById('fileInput').click();
}
