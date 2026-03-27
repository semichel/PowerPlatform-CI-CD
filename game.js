// Game State
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
let currentQuestionIndex = 0;
let gameQuestions = [];
let timeline = [];
let selectedCategories = new Set(CATEGORIES);
const QUESTIONS_PER_PLAYER = 10;
let waitingForAnswer = false;
let isOnlineGame = false;
let myPlayerIndex = -1;
let roundPoints = 0; // points accumulated this round (before "stanna")

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons('category-buttons');
    updatePlayerNames();
});

// Category buttons
function renderCategoryButtons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = CATEGORIES.map(cat =>
        `<button class="cat-btn selected" onclick="toggleCategory(this, '${cat}')">${cat}</button>`
    ).join('');
}

function toggleCategory(btn, category) {
    btn.classList.toggle('selected');
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
    } else {
        selectedCategories.add(category);
    }
}

// Player count (local mode)
function changePlayerCount(delta) {
    playerCount = Math.max(1, Math.min(6, playerCount + delta));
    document.getElementById('player-count-display').textContent = playerCount;
    updatePlayerNames();
}

function updatePlayerNames() {
    const container = document.getElementById('player-names');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < playerCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Spelare ${i + 1}`;
        input.id = `player-name-${i}`;
        container.appendChild(input);
    }
}

// Mode selection
function showLocalSetup() {
    showScreen('local-setup');
}

function showOnlineSetup() {
    showScreen('online-setup');
}

// Start Local Game
function startLocalGame() {
    if (selectedCategories.size === 0) {
        alert('Välj minst en kategori!');
        return;
    }

    isOnlineGame = false;
    players = [];
    for (let i = 0; i < playerCount; i++) {
        const nameInput = document.getElementById(`player-name-${i}`);
        const name = nameInput.value.trim() || `Spelare ${i + 1}`;
        players.push({ name, score: 0 });
    }

    prepareAndStartGame();
}

// Called by both local and online to set up questions and start
function prepareAndStartGame(providedQuestions) {
    if (providedQuestions) {
        gameQuestions = providedQuestions;
    } else {
        const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
        gameQuestions = shuffleArray(filtered).slice(0, players.length * QUESTIONS_PER_PLAYER + 1);
    }

    if (gameQuestions.length < 2) {
        alert('Inte tillräckligt med frågor!');
        return;
    }

    const firstEvent = gameQuestions.shift();
    timeline = [firstEvent];

    currentPlayerIndex = 0;
    currentQuestionIndex = 0;
    waitingForAnswer = false;
    roundPoints = 0;

    const playerNames = players.map(p => p.name).join(', ');
    Logger.log('GAME', `Spel startat! Spelare: ${playerNames} | ${gameQuestions.length} frågor`);

    showScreen('game-screen');
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= gameQuestions.length) {
        // Auto-bank remaining round points
        if (roundPoints > 0) {
            players[currentPlayerIndex].score += roundPoints;
            Logger.log('PLAYER', `${players[currentPlayerIndex].name} fick ${roundPoints}p (inga fler frågor)`);
            roundPoints = 0;
        }
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

    // Show round points info
    const roundInfo = document.getElementById('round-points');
    if (roundPoints > 0) {
        roundInfo.textContent = `${players[currentPlayerIndex].name} riskerar ${roundPoints}p`;
        roundInfo.classList.remove('hidden');
    } else {
        roundInfo.classList.add('hidden');
    }

    updateScoreboard();
    document.getElementById('result-area').classList.add('hidden');

    // Online mode: show/hide controls based on whose turn it is
    const waitingOverlay = document.getElementById('waiting-overlay');
    if (isOnlineGame && myPlayerIndex !== currentPlayerIndex) {
        waitingOverlay.classList.remove('hidden');
        document.getElementById('waiting-for-player').textContent = players[currentPlayerIndex].name;
        waitingForAnswer = false;
    } else {
        waitingOverlay.classList.add('hidden');
        waitingForAnswer = true;
    }

    // Render timeline AFTER waitingForAnswer is set, so slot buttons appear
    renderTimeline();
}

function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    const sorted = [...timeline].sort((a, b) => a.answer - b.answer);
    const canInteract = !isOnlineGame || myPlayerIndex === currentPlayerIndex;

    // "Före" button
    if (canInteract && waitingForAnswer) {
        const beforeFirst = createSlotButton(0, sorted[0] ? sorted[0].answer : null, 'before');
        container.appendChild(beforeFirst);
    }

    sorted.forEach((event, i) => {
        const eventEl = document.createElement('div');
        eventEl.className = 'timeline-event';
        eventEl.innerHTML = `
            <div class="timeline-year">${event.answer}</div>
            <div class="timeline-text">${event.question}</div>
        `;
        container.appendChild(eventEl);

        if (canInteract && waitingForAnswer) {
            const afterBtn = createSlotButton(i + 1, sorted[i + 1] ? sorted[i + 1].answer : null, 'after', sorted[i].answer);
            container.appendChild(afterBtn);
        }
    });
}

function createSlotButton(index, nextYear, position, prevYear) {
    const btn = document.createElement('button');
    btn.className = 'timeline-slot';

    if (position === 'before') {
        const firstYear = [...timeline].sort((a,b) => a.answer - b.answer)[0];
        btn.innerHTML = `<span class="slot-arrow">&uarr;</span> Före ${firstYear ? firstYear.answer : ''}`;
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

    // In online mode, send choice to host
    if (isOnlineGame && typeof onlinePlaceEvent === 'function') {
        onlinePlaceEvent(slotIndex);
        return;
    }

    processPlacement(slotIndex);
}

function processPlacement(slotIndex) {
    const q = gameQuestions[currentQuestionIndex];
    const sorted = [...timeline].sort((a, b) => a.answer - b.answer);

    let correct = false;
    const year = q.answer;

    if (slotIndex === 0) {
        correct = year <= sorted[0].answer;
    } else if (slotIndex >= sorted.length) {
        correct = year >= sorted[sorted.length - 1].answer;
    } else {
        correct = year >= sorted[slotIndex - 1].answer && year <= sorted[slotIndex].answer;
    }

    timeline.push(q);

    if (correct) {
        roundPoints += 2;
        Logger.log('PLAYER', `${players[currentPlayerIndex].name} RÄTT "${q.question}" (${q.answer}) | Riskerar: ${roundPoints}p`);
    } else {
        Logger.log('PLAYER', `${players[currentPlayerIndex].name} FEL "${q.question}" (${q.answer}) | Förlorade ${roundPoints}p`);
        roundPoints = 0;
    }

    showResult(q, correct);
}

function showResult(q, correct) {
    const resultArea = document.getElementById('result-area');
    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');
    const continueBtn = document.getElementById('continue-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextBtn = document.getElementById('next-btn');

    document.getElementById('waiting-overlay').classList.add('hidden');

    if (correct) {
        resultText.textContent = `Rätt! "${q.question}" hände ${q.answer}.`;
        resultPoints.textContent = `${roundPoints}p på spel`;
        resultPoints.className = 'points-perfect';

        // Show "Fortsätt" and "Stanna" buttons
        const canControl = !isOnlineGame || isHost || myPlayerIndex === currentPlayerIndex;
        if (canControl) {
            continueBtn.classList.remove('hidden');
            stopBtn.classList.remove('hidden');
        } else {
            continueBtn.classList.add('hidden');
            stopBtn.classList.add('hidden');
        }
        nextBtn.classList.add('hidden');
    } else {
        resultText.textContent = `Fel! "${q.question}" hände ${q.answer}. Du förlorade alla poäng från rundan!`;
        resultPoints.textContent = '0 poäng';
        resultPoints.className = 'points-far';

        // Only show "Nästa" (go to next player)
        continueBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');

        if (isOnlineGame && !isHost) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
    }

    resultArea.classList.remove('hidden');
    renderTimeline();
    updateScoreboard();
}

// Player chooses to continue (risk more)
function continueRound() {
    currentQuestionIndex++;

    if (isOnlineGame && typeof onlineContinueRound === 'function') {
        onlineContinueRound();
        return;
    }

    if (currentQuestionIndex >= gameQuestions.length) {
        // No more questions - auto bank
        players[currentPlayerIndex].score += roundPoints;
        Logger.log('PLAYER', `${players[currentPlayerIndex].name} stannade (inga fler frågor) +${roundPoints}p`);
        roundPoints = 0;
        endGame();
        return;
    }

    showQuestion();
}

// Player chooses to stop (bank points, next player)
function stopRound() {
    players[currentPlayerIndex].score += roundPoints;
    Logger.log('PLAYER', `${players[currentPlayerIndex].name} stannade! +${roundPoints}p | Total: ${players[currentPlayerIndex].score}p`);
    roundPoints = 0;

    if (isOnlineGame && typeof onlineStopRound === 'function') {
        onlineStopRound();
        return;
    }

    goToNextPlayer();
}

// Wrong answer → next player
function nextTurn() {
    roundPoints = 0;

    if (isOnlineGame && typeof onlineNextTurn === 'function') {
        onlineNextTurn();
        return;
    }

    goToNextPlayer();
}

function goToNextPlayer() {
    currentQuestionIndex++;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    roundPoints = 0;

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
    Logger.log('GAME', `Spel slut! ${winnerText}`);
}

function resetGame() {
    Logger.log('GAME', 'Tillbaka till start');
    timeline = [];
    isOnlineGame = false;
    roundPoints = 0;
    if (typeof cleanupOnline === 'function') cleanupOnline();
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
