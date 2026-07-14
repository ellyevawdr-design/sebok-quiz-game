// ==========================================
// 1. GLOBAL STATE & CONFIGURATION VARIABLES
// ==========================================
let questions = [];
let current = 0;
let answers = [];
let finalScore = 0; // Tracks player score globally for submission
let scoreChartInstance = null; // Tracks canvas state to prevent visual ghost charts
let scoreboardInterval = null; // Holds the real-time background timer instance

const BACKEND_URL = 'https://sebok-quiz-game.onrender.com';

// ==========================================
// 2. PAGE PERSISTENCE (REFRESH PROTECTION)
// ==========================================
// Checks if the user was already viewing the scoreboard on page load/refresh
window.addEventListener('DOMContentLoaded', () => {
    const quizState = localStorage.getItem('quiz_completed_state');
    if (quizState === 'true') {
        // Recover score data from local storage string parameters
        finalScore = parseInt(localStorage.getItem('saved_final_score')) || 0;
        
        // Skip the start screen and jump directly to results display layout
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');
        
        // Restore badge assets and kick off the dynamic scoreboard rendering routines
        restoreStaticResultsUI();
    }
});

// ==========================================
// 3. CORE QUIZ & SYSTEM LOGIC ACTIONS
// ==========================================
// Clear out storage keys when they explicitly click "Play Again" to restart
async function startQuiz() {
    try {
        // Wipe local storage flags clean so they can take a fresh attempt
        localStorage.removeItem('quiz_completed_state');
        localStorage.removeItem('saved_final_score');

        // Clear active real-time polling intervals if resetting the quiz session
        if (scoreboardInterval) {
            clearInterval(scoreboardInterval);
        }

        const response = await fetch(`${BACKEND_URL}/api/questions`);
        if (!response.ok) throw new Error("Network issue communicating with backend.");
        
        questions = await response.json();
        current = 0;
        answers = new Array(10).fill(null);
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        renderQuestion();
    } catch (error) {
        console.error("API error: ", error);
        alert("Could not connect to the backend server.");
    }
}

function renderQuestion() {
    document.getElementById('question-counter').textContent = `Question ${current + 1} of 10`;
    document.getElementById('prompt-text').textContent = `"${questions[current].prompt}"`;
    document.getElementById('prev-btn').disabled = current === 0;

    const fb = document.getElementById('feedback');
    const btns = document.getElementById('answer-buttons');
    const nextBtn = document.getElementById('next-btn');

    if (answers[current] !== null) {
        btns.classList.add('hidden');
        fb.classList.remove('hidden');
        const correct = answers[current] === questions[current].answer;
        document.getElementById('feedback-result').textContent = correct ? '✓ Correct!' : '✗ Incorrect';
        document.getElementById('feedback-result').className = `font-bold text-lg mb-1 ${correct ? 'text-green-600' : 'text-red-600'}`;
        fb.className = `mt-4 p-4 rounded-lg text-center ${correct ? 'bg-green-50' : 'bg-red-50'}`;
        document.getElementById('feedback-reason').textContent = questions[current].reason;
        nextBtn.classList.remove('hidden');
    } else {
        btns.classList.remove('hidden');
        fb.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }
}

function answer(choice) {
    answers[current] = choice;
    renderQuestion();
}

function nextQuestion() {
    if (current < 9) { 
        current++; 
        renderQuestion(); 
    } else { 
        showResults(); 
    }
}

function prevQuestion() {
    if (current > 0) { 
        current--; 
        renderQuestion(); 
    }
}

// Sets the completion flags and hands control over to the renderer
function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('results-screen').classList.remove('hidden');
    
    finalScore = answers.filter((a, i) => a === questions[i].answer).length;
    
    // Set local storage flags to survive page refreshes
    localStorage.setItem('quiz_completed_state', 'true');
    localStorage.setItem('saved_final_score', finalScore);

    restoreStaticResultsUI();
}

// Handles drawing the badges, messages, and firing the 3-second real-time loop
function restoreStaticResultsUI() {
    document.getElementById('score-text').textContent = `${finalScore} / 10`;
    
    // Make submission box visible again for runs/reloads
    document.getElementById('save-score-container').classList.remove('hidden');
    document.getElementById('username-input').value = "";
    
    const badges = [
        { range: [0, 2], src: 'DoBetter.png', alt: 'You can do better!' },
        { range: [3, 4], src: 'DontGiveUp.png', alt: 'Don\'t give up!' },
        { range: [5, 6], src: 'GoodTry.png', alt: 'Good Try!' },
        { range: [7, 8], src: 'ThatGood.png', alt: 'That\'s good!' },
        { range: [9, 10], src: 'Outstanding.png', alt: 'Outstanding!' }
    ];
    
    const badge = badges.find(b => finalScore >= b.range[0] && finalScore <= b.range[1]);
    if (badge) {
        document.getElementById('badge-image').src = badge.src;
        document.getElementById('badge-image').alt = badge.alt;
    }
    
    const msgs = ['Keep practising!', 'Not bad!', 'Great job!', 'Perfect! 🎉'];
    document.getElementById('score-msg').textContent = finalScore <= 4 ? msgs[0] : finalScore <= 6 ? msgs[1] : finalScore <= 9 ? msgs[2] : msgs[3];

    // Load the chart graphics initially
    loadLeaderboardChart();

    // Start real-time short polling loop to fetch updates from other players every 3 seconds
    if (scoreboardInterval) clearInterval(scoreboardInterval);
    scoreboardInterval = setInterval(() => {
        loadLeaderboardChart();
    }, 3000); 
}

// ==========================================
// 4. SCOREBOARD API PIPELINES & CHART ENGINE
// ==========================================
// NEW FUNCTION 1: Submit Player Score via HTTP POST
async function submitPlayerScore() {
    const nameInput = document.getElementById('username-input').value;
    if (!nameInput.trim()) {
        alert("Please input your username!");
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/scoreboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameInput, score: finalScore })
        });

        if (!response.ok) throw new Error("Failed to dispatch score.");
        
        // Hide input interface container once saved smoothly
        document.getElementById('save-score-container').classList.add('hidden');
        
        // Refresh chart dynamically with updated parameters
        await loadLeaderboardChart();
    } catch (error) {
        console.error("Score submission error:", error);
        alert("Could not update the scoreboard on the cloud server.");
    }
}

// NEW FUNCTION 2: Fetch and Render Chart.js Bar Graph
async function loadLeaderboardChart() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/scoreboard`);
        if (!response.ok) throw new Error("Could not pull scoreboard entries.");
        
        const topScores = await response.json();

        // Separate labels (names) and numeric values (scores)
        const labels = topScores.map(item => item.name);
        const dataValues = topScores.map(item => item.score);

        const ctx = document.getElementById('leaderboardChart').getContext('2d');

        // Prevent layout collision artifact bugs by tearing down old instances
        if (scoreChartInstance) {
            scoreChartInstance.destroy();
        }

        // Draw a Kahoot-colored responsive horizontal bar chart
        scoreChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Top Players Score',
                    data: dataValues,
                    backgroundColor: ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#864cbf'],
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y', // Makes it a horizontal leaderboard chart!
                responsive: true,
                scales: {
                    x: { beginAtZero: true, max: 10, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (error) {
        console.error("Failed to compile chart graphics:", error);
    }
}

// NEW FUNCTION 3: Trigger Admin Reset Workflow via HTTP DELETE
async function triggerAdminClear() {
    const password = prompt("Enter Admin Passcode to clear session scores:");
    if (!password) return;

    if (confirm("Are you absolutely sure you want to completely wipe all scores for the next player group?")) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/scoreboard/clear`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': password
                }
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.error || "Reset failed.");
                return;
            }

            alert(result.message);
            // Re-render the empty chart instantly
            await loadLeaderboardChart();
            
        } catch (error) {
            console.error("Admin action failed:", error);
            alert("Error communicating with the administrative cloud server.");
        }
    }
}