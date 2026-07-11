let questions = [];
let current = 0;
let answers = [];

// MODIFIED: Fetch the shuffled questions from the Node.js API endpoint
async function startQuiz() {
    try {
        // Fetch data from the local server pipeline
        const response = await fetch('http://localhost:5000/api/questions');
        if (!response.ok) throw new Error("Network issue communicating with backend.");
        
        // Parse the incoming JSON question payload
        questions = await response.json();
        
        current = 0;
        answers = new Array(10).fill(null);
        
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('quiz-screen').classList.remove('hidden');
        renderQuestion();
    } catch (error) {
        console.error("API error: ", error);
        alert("Could not connect to the backend server. Make sure node server.js is running!");
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

// BADGES PROCESSING LIVES INSIDE THIS FUNCTION
function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('results-screen').classList.remove('hidden');
    
    const score = answers.filter((a, i) => a === questions[i].answer).length;
    document.getElementById('score-text').textContent = `${score} / 10`;
    
    // REPLACE placeholder link strings below with actual web graphic links
    const badges = [
        { range: [0, 2], src: 'DoBetter.png', alt: 'You can do better!' },
        { range: [3, 4], src: 'DontGiveUp.png', alt: 'Don\'t give up!' },
        { range: [5, 6], src: 'GoodTry.png', alt: 'Good Try!' },
        { range: [7, 8], src: 'ThatGood.png', alt: 'That\'s good!' },
        { range: [9, 10], src: 'Outstanding.png', alt: 'Outstanding!' }
    ];
    
    const badge = badges.find(b => score >= b.range[0] && score <= b.range[1]);
    if (badge) {
        document.getElementById('badge-image').src = badge.src;
        document.getElementById('badge-image').alt = badge.alt;
    }
    
    const msgs = ['Keep practising!', 'Not bad!', 'Great job!', 'Perfect! 🎉'];
    document.getElementById('score-msg').textContent = score <= 4 ? msgs[0] : score <= 6 ? msgs[1] : score <= 9 ? msgs[2] : msgs[3];
}