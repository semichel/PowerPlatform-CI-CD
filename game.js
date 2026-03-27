// Game State
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
let currentQuestionIndex = 0;
let gameQuestions = [];
let timeline = []; // events placed on the timeline
let selectedCategories = new Set(CATEGORIES);
const QUESTIONS_PER_PLAYER = 5;
let waitingForAnswer = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    updatePlayerNames();
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

    players = [];
    for (let i = 0; i < playerCount; i++) {
        const nameInput = document.getElementById(`player-name-${i}`);
        const name = nameInput.value.trim() || `Spelare ${i + 1}`;
        players.push({ name, score: 0 });
    }

    const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
    gameQuestions = shuffleArray(filtered).slice(0, playerCount * QUESTIONS_PER_PLAYER + 1);

    if (gameQuestions.length < 2) {
        Logger.log('ERROR', 'För få frågor');
        alert('Inte tillräckligt med frågor!');
        return;
    }

    // Place the first event on the timeline automatically
    const firstEvent = gameQuestions.shift();
    timeline = [firstEvent];

    currentPlayerIndex = 0;
    currentQuestionIndex = 0;
    waitingForAnswer = false;

    const cats = [...selectedCategories].join(', ');
    const playerNames = players.map(p => p.name).join(', ');
    Logger.log('GAME', `Spel startat! Spelare: ${playerNames} | Kategorier: ${cats} | ${gameQuestions.length} frågor`);
    Logger.log('GAME', `Första händelse på tidslinjen: "${firstEvent.question}" (${firstEvent.answer})`);

    showScreen('game-screen');
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= gameQuestions.length) {
        endGame();
        return;
    }

    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = gameQuestions.length;
    document.getElementById('player-turn').textContent = players[currentPlayerIndex].name;

    const q = gameQuestions[currentQuestionIndex];
    document.getElementById('card-category').textContent = q.category;
    document.getElementById('card-question').textContent = q.question;
    document.getElementById('card-hint').textContent = q.hint ? `Ledtråd: ${q.hint}` : '';

    Logger.log('GAME', `Fråga ${currentQuestionIndex + 1}: "${q.question}" [${q.category}] (svar: ${q.answer})`);

    updateScoreboard();
    renderTimeline();
    document.getElementById('result-area').classList.add('hidden');
    waitingForAnswer = true;
}

function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    // Sort timeline by year
    const sorted = [...timeline].sort((a, b) => a.answer - b.answer);

    // Add "Före" button before the first event
    const beforeFirst = createSlotButton(0, sorted.length > 0 ? sorted[0].answer : null, 'before');
    container.appendChild(beforeFirst);

    // Add each event on the timeline with slot buttons between them
    sorted.forEach((event, i) => {
        const eventEl = document.createElement('div');
        eventEl.className = 'timeline-event';
        eventEl.innerHTML = `
            <div class="timeline-year">${event.answer}</div>
            <div class="timeline-text">${event.question}</div>
        `;
        container.appendChild(eventEl);

        // Add slot button after each event
        const afterBtn = createSlotButton(i + 1, sorted[i + 1] ? sorted[i + 1].answer : null, 'after', sorted[i].answer);
        container.appendChild(afterBtn);
    });
}

function createSlotButton(index, nextYear, position, prevYear) {
    const btn = document.createElement('button');
    btn.className = 'timeline-slot';

    if (position === 'before') {
        btn.innerHTML = `<span class="slot-arrow">&uarr;</span> Före ${timeline.length > 0 ? timeline.sort((a,b) => a.answer - b.answer)[0].answer : ''}`;
    } else if (nextYear) {
        btn.innerHTML = `<span class="slot-arrow">&updownarrow;</span> Mellan`;
    } else {
        btn.innerHTML = `<span class="slot-arrow">&darr;</span> Efter ${prevYear || ''}`;
    }

    btn.onclick = () => placeEvent(index);
    return btn;
}

function placeEvent(slotIndex) {
    if (!waitingForAnswer) return;
    waitingForAnswer = false;

    const q = gameQuestions[currentQuestionIndex];
    const sorted = [...timeline].sort((a, b) => a.answer - b.answer);

    // Check if placement is correct
    let correct = false;
    const year = q.answer;

    if (slotIndex === 0) {
        // Placed before everything
        correct = year <= sorted[0].answer;
    } else if (slotIndex >= sorted.length) {
        // Placed after everything
        correct = year >= sorted[sorted.length - 1].answer;
    } else {
        // Placed between two events
        correct = year >= sorted[slotIndex - 1].answer && year <= sorted[slotIndex].answer;
    }

    let points = correct ? 2 : 0;
    players[currentPlayerIndex].score += points;

    // Add to timeline regardless
    timeline.push(q);

    Logger.log('PLAYER', `${players[currentPlayerIndex].name} placerade "${q.question}" (${q.answer}) ${correct ? 'RÄTT' : 'FEL'} | +${points}p | Total: ${players[currentPlayerIndex].score}p`);

    // Show result
    const resultArea = document.getElementById('result-area');
    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');

    if (correct) {
        resultText.textContent = `Rätt! "${q.question}" hände ${q.answer}.`;
        resultPoints.textContent = '+2 poäng';
        resultPoints.className = 'points-perfect';
    } else {
        resultText.textContent = `Fel! "${q.question}" hände ${q.answer}.`;
        resultPoints.textContent = 'Inga poäng';
        resultPoints.className = 'points-far';
    }

    resultArea.classList.remove('hidden');
    renderTimeline(); // Re-render with new event
    updateScoreboard();
}

function nextTurn() {
    currentQuestionIndex++;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

    if (currentQuestionIndex >= gameQuestions.length) {
        endGame();
        return;
    }

    showQuestion();
}

function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = players.map((p, i) =>
        `<div class="score-chip ${i === currentPlayerIndex ? 'active' : ''}">
            <span class="score-name">${p.name}</span>
            <span class="score-value">${p.score}</span>
        </div>`
    ).join('');
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
    timeline = [];
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
