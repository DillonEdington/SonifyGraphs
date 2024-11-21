//Server on local host

const mysql = require('mysql2');
const csvParser = require('csv-parser');
const express = require('express');
const fs = require('fs');
const app = express();
const path = require('path');
const multer = require('multer');
const port = 8000;

//for mysql connection
const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'SonifyGraphs',
});

connection.connect((err) => {
	if (err) {
		console.error('Error connecting to the database: ' + err.stack);
		return;
	}
	console.log('Connection to database successful');
});

//for uploads folder where files are being stored (will change later)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir);
}

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

//for handling file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, 'uploads/'), 
	filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage: storage }).single('csvFile');

app.post('/upload', upload, (req, res) => {
	if (!req.file) {
		console.error('Now file uploaded');
		return res.status(400).send('No file uploaded');
	}
	
	console.log('File Received', req.file);

	const results = [];
	fs.createReadStream(req.file.path)
		.pipe(csvParser())
		.on('data', (row) => {
			console.log('Parsed Row:', row);
			results.push(row);
		})
		.on('end', () => {
			console.log('Parsed CSV data:', results);
			results.forEach((row) => {
				const keys = Object.keys(row);
				const x_value = row[keys[0]];
				const y_value = parseFloat(row[keys[1]]);
				const graphType = 'line';
		
				if (isNaN(y_value)) {
					console.error(`y_value invalid for x_value: ${x_value}, skipping row.`);
					return;
				}
				const query = 'Insert into graph_data (x_value, y_value, graph_type) VALUES (?, ?, ?)';
				connection.query(query, [x_value, y_value, graphType], (err, result) => {
					if (err) {
						console.error('Error inserting data into database:', err);
					} else {
						console.log('Data inserted successfully:', result);
					}
				});
			});
		
			res.send('CSV file uploaded and data inserted successfully');
		})
		.on('error', (err) => {
			console.error('Error reading CSV file:', err);
			res.status(500).send('Error reading CSV file.');
		});
});

//for starting server
app.listen(port, () => console.log(`Server is running on port ${port}`));



