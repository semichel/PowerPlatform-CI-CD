// Game State
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
let currentQuestionIndex = 0;
let gameQuestions = [];
let selectedCategories = new Set(CATEGORIES);
const QUESTIONS_PER_PLAYER = 5;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    updatePlayerNames();
    document.getElementById('year-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitGuess();
    });
});

// Category buttons
function renderCategoryButtons() {
    const container = document.getElementById('category-buttons');
    container.innerHTML = CATEGORIES.map(cat =>
        `<button class="cat-btn selected" onclick="toggleCategory(this, '${cat}')">${cat}</button>`
    ).join('');
}

function toggleCategory(btn, category) {
    btn.classList.toggle('selected');
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
        Logger.log('GAME', `Kategori avvald: ${category}`);
    } else {
        selectedCategories.add(category);
        Logger.log('GAME', `Kategori vald: ${category}`);
    }
}

// Player count
function changePlayerCount(delta) {
    playerCount = Math.max(1, Math.min(6, playerCount + delta));
    document.getElementById('player-count-display').textContent = playerCount;
    updatePlayerNames();
    Logger.log('GAME', `Antal spelare ändrat till ${playerCount}`);
}

function updatePlayerNames() {
    const container = document.getElementById('player-names');
    container.innerHTML = '';
    for (let i = 0; i < playerCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Spelare ${i + 1}`;
        input.id = `player-name-${i}`;
        container.appendChild(input);
    }
}

// Start Game
function startGame() {
    if (selectedCategories.size === 0) {
        Logger.log('GAME', 'Försökte starta utan kategorier');
        alert('Välj minst en kategori!');
        return;
    }

    // Setup players
    players = [];
    for (let i = 0; i < playerCount; i++) {
        const nameInput = document.getElementById(`player-name-${i}`);
        const name = nameInput.value.trim() || `Spelare ${i + 1}`;
        players.push({ name, score: 0 });
    }

    // Filter and shuffle questions
    const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
    gameQuestions = shuffleArray(filtered).slice(0, playerCount * QUESTIONS_PER_PLAYER);

    if (gameQuestions.length === 0) {
        Logger.log('ERROR', 'Inga frågor tillgängliga');
        alert('Inga frågor tillgängliga för valda kategorier!');
        return;
    }

    currentPlayerIndex = 0;
    currentQuestionIndex = 0;

    const cats = [...selectedCategories].join(', ');
    const playerNames = players.map(p => p.name).join(', ');
    Logger.log('GAME', `Spel startat! Spelare: ${playerNames} | Kategorier: ${cats} | ${gameQuestions.length} frågor`);

    showScreen('game-screen');
    updateGameUI();
}

// Game Logic
function updateGameUI() {
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = gameQuestions.length;
    document.getElementById('player-turn').textContent = players[currentPlayerIndex].name;

    const q = gameQuestions[currentQuestionIndex];
    document.getElementById('card-category').textContent = q.category;
    document.getElementById('card-question').textContent = q.question;
    document.getElementById('card-hint').textContent = q.hint ? `Ledtråd: ${q.hint}` : '';

    Logger.log('GAME', `Fråga ${currentQuestionIndex + 1}/${gameQuestions.length}: "${q.question}" [${q.category}] (svar: ${q.answer})`);

    // Update scoreboard
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = players.map((p, i) =>
        `<div class="score-chip ${i === currentPlayerIndex ? 'active' : ''}">
            <span class="score-name">${p.name}</span>
            <span class="score-value">${p.score}</span>
        </div>`
    ).join('');

    // Reset input
    document.getElementById('year-input').value = '';
    document.getElementById('year-input').disabled = false;
    document.getElementById('guess-btn').disabled = false;
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('year-input').focus();
}

function submitGuess() {
    const input = document.getElementById('year-input');
    const guess = parseInt(input.value);

    if (isNaN(guess)) {
        input.style.borderColor = '#e94560';
        Logger.log('PLAYER', `${players[currentPlayerIndex].name} skrev ogiltigt värde`);
        return;
    }

    input.disabled = true;
    document.getElementById('guess-btn').disabled = true;

    const q = gameQuestions[currentQuestionIndex];
    const diff = Math.abs(guess - q.answer);
    let points = 0;
    let pointsClass = '';
    let message = '';

    if (diff === 0) {
        points = 5;
        pointsClass = 'points-perfect';
        message = `Helt rätt! Det var ${q.answer}!`;
    } else if (diff <= 2) {
        points = 3;
        pointsClass = 'points-close';
        message = `Nästan! Rätt svar: ${q.answer}. Du gissade ${diff} år fel.`;
    } else if (diff <= 5) {
        points = 2;
        pointsClass = 'points-ok';
        message = `Inte illa! Rätt svar: ${q.answer}. Du var ${diff} år ifrån.`;
    } else if (diff <= 10) {
        points = 1;
        pointsClass = 'points-ok';
        message = `Okej gissning! Rätt svar: ${q.answer}. Du var ${diff} år ifrån.`;
    } else {
        points = 0;
        pointsClass = 'points-far';
        message = `Fel tyvärr! Rätt svar: ${q.answer}. Du var ${diff} år ifrån.`;
    }

    players[currentPlayerIndex].score += points;

    Logger.log('PLAYER', `${players[currentPlayerIndex].name} gissade ${guess} (rätt: ${q.answer}, diff: ${diff}, +${points}p) | Total: ${players[currentPlayerIndex].score}p`);

    document.getElementById('result-text').textContent = message;
    const pointsEl = document.getElementById('result-points');
    pointsEl.textContent = points > 0 ? `+${points} poäng` : 'Inga poäng';
    pointsEl.className = pointsClass;
    document.getElementById('result-area').classList.remove('hidden');

    // Update scoreboard
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = players.map((p, i) =>
        `<div class="score-chip ${i === currentPlayerIndex ? 'active' : ''}">
            <span class="score-name">${p.name}</span>
            <span class="score-value">${p.score}</span>
        </div>`
    ).join('');
}

function nextTurn() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= gameQuestions.length) {
        endGame();
        return;
    }

    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateGameUI();
}

function endGame() {
    showScreen('end-screen');

    const sorted = [...players].sort((a, b) => b.score - a.score);
    const maxScore = sorted[0].score;

    document.getElementById('final-scores').innerHTML = sorted.map((p, i) =>
        `<div class="final-score-row ${i === 0 ? 'winner' : ''}">
            <div class="final-rank">${i === 0 ? '\u{1F3C6}' : `#${i + 1}`}</div>
            <div class="final-name">${p.name}</div>
            <div class="final-points">${p.score} poäng</div>
        </div>`
    ).join('');

    const winners = sorted.filter(p => p.score === maxScore);
    let winnerText;
    if (winners.length > 1) {
        winnerText = `Oavgjort mellan ${winners.map(w => w.name).join(' och ')}!`;
    } else {
        winnerText = `${sorted[0].name} vinner!`;
    }
    document.getElementById('winner-announcement').textContent = winnerText;

    const scoresSummary = sorted.map(p => `${p.name}: ${p.score}p`).join(', ');
    Logger.log('GAME', `Spel slut! ${winnerText} | Resultat: ${scoresSummary}`);
}

function resetGame() {
    Logger.log('GAME', 'Nytt spel startas');
    showScreen('start-screen');
}

// Helpers
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
