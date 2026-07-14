const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable cross-origin resource sharing globally for blanket protection
app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'database.json');

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
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const db = JSON.parse(rawData);
        const randomTen = shuffle([...db.questions]).slice(0, 10);
        res.json(randomTen);
    } catch (error) {
        res.status(500).json({ error: "Failed to read database records." });
    }
});

// NEW ENDPOINT 1: GET /api/scoreboard (Fetch Top 5 Scores)
app.get('/api/scoreboard', (req, res) => {
    try {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const db = JSON.parse(rawData);
        
        // Ensure scoreboard exists, sort descending by score, slice top 5
        const scores = db.scoreboard || [];
        const topFive = [...scores]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
            
        res.json(topFive);
    } catch (error) {
        res.status(500).json({ error: "Failed to load scoreboard entries." });
    }
});

// NEW ENDPOINT 2: POST /api/scoreboard (Save New Entry)
app.post('/api/scoreboard', (req, res) => {
    try {
        const { name, score } = req.body;
        if (!name) return res.status(400).json({ error: "Player name is required." });

        const rawData = fs.readFileSync(dataPath, 'utf8');
        const db = JSON.parse(rawData);
        
        if (!db.scoreboard) db.scoreboard = [];

        // Append new score payload with current local timestamp
        db.scoreboard.push({
            name: name.trim(),
            score: parseInt(score) || 0,
            date: new Date().toISOString().split('T')[0]
        });

        // Synchronize and write back to persistent cloud storage
        fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
        res.status(201).json({ message: "Score saved successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update cloud scoreboard records." });
    }
});

// Start the server instance
app.listen(PORT, () => {
    console.log(`Backend server successfully active at http://localhost:${PORT}`);
});