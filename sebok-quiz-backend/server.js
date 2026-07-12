const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
const PORT = 5000;

// Enable cross-origin resource sharing so your HTML file can access this API
app.use(cors());
app.use(express.json());

// Helper function to scramble arrays on the backend server
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// REST API Endpoint: GET /api/questions
app.get('/api/questions', (req, res) => {
    try {
        // Read data directly from our JSON file database
        const dataPath = path.join(__dirname, 'database.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const db = JSON.parse(rawData);

        // Shuffle all questions and select a slice of 10
        const randomTen = shuffle([...db.questions]).slice(0, 10);
        
        // Respond with the processed data payload
        res.json(randomTen);
    } catch (error) {
        res.status(500).json({ error: "Failed to read database records." });
    }
});

// Start the server instance
app.listen(PORT, () => {
    console.log(`Backend server successfully active at http://localhost:${PORT}`);
});