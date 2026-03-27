// Game State
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
let playerTimelines = []; // per-player timelines
let playerQuestions = []; // per-player question decks
let playerQuestionIndex = []; // per-player current question index
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
function prepareAndStartGame(providedPlayerQuestions, providedPlayerTimelines) {
    if (providedPlayerQuestions && providedPlayerTimelines) {
        // Online guest: receive pre-split data
        playerQuestions = providedPlayerQuestions;
        playerTimelines = providedPlayerTimelines;
    } else {
        // Local or host: split questions among players
        const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
        const shuffled = shuffleArray(filtered);

        playerQuestions = [];
        playerTimelines = [];

        for (let i = 0; i < players.length; i++) {
            // Each player gets QUESTIONS_PER_PLAYER cards + 1 starter
            const start = i * (QUESTIONS_PER_PLAYER + 1);
            const playerCards = shuffled.slice(start, start + QUESTIONS_PER_PLAYER + 1);

            if (playerCards.length < 2) {
                alert('Inte tillräckligt med frågor för alla spelare!');
                return;
            }

            // First card becomes starter on their timeline
            const starter = playerCards.shift();
            playerTimelines.push([starter]);
            playerQuestions.push(playerCards);
        }
    }

    playerQuestionIndex = players.map(() => 0);
    currentPlayerIndex = 0;
    waitingForAnswer = false;
    roundPoints = 0;

    const playerNames = players.map(p => p.name).join(', ');
    const totalQ = playerQuestions.reduce((sum, pq) => sum + pq.length, 0);
    Logger.log('GAME', `Spel startat! Spelare: ${playerNames} | ${totalQ} frågor totalt`);

    showScreen('game-screen');
    showQuestion();
}

function showQuestion() {
    const pi = currentPlayerIndex;
    const qi = playerQuestionIndex[pi];
    const myQuestions = playerQuestions[pi];

    if (qi >= myQuestions.length) {
        // Auto-bank remaining round points
        if (roundPoints > 0) {
            players[pi].score += roundPoints;
            Logger.log('PLAYER', `${players[pi].name} fick ${roundPoints}p (inga fler kort)`);
            roundPoints = 0;
        }
        // Check if all players are done
        if (allPlayersDone()) {
            endGame();
            return;
        }
        // Skip to next player who still has cards
        goToNextPlayer();
        return;
    }

    const totalLeft = myQuestions.length - qi;
    document.getElementById('current-question').textContent = qi + 1;
    document.getElementById('total-questions').textContent = myQuestions.length;
    document.getElementById('player-turn').textContent = players[pi].name;

    const q = myQuestions[qi];
    document.getElementById('card-category').textContent = q.category;
    document.getElementById('card-question').textContent = q.question;
    document.getElementById('card-hint').textContent = q.hint ? `Ledtråd: ${q.hint}` : '';

    // Show round points info
    const roundInfo = document.getElementById('round-points');
    if (roundInfo) {
        if (roundPoints > 0) {
            roundInfo.textContent = `${players[pi].name} riskerar ${roundPoints}p`;
            roundInfo.classList.remove('hidden');
        } else {
            roundInfo.classList.add('hidden');
        }
    }

    updateScoreboard();
    document.getElementById('result-area').classList.add('hidden');

    // Set waitingForAnswer BEFORE renderTimeline so slot buttons appear
    const waitingOverlay = document.getElementById('waiting-overlay');
    if (isOnlineGame && myPlayerIndex !== currentPlayerIndex) {
        if (waitingOverlay) waitingOverlay.classList.remove('hidden');
        const wfp = document.getElementById('waiting-for-player');
        if (wfp) wfp.textContent = players[pi].name;
        waitingForAnswer = false;
    } else {
        if (waitingOverlay) waitingOverlay.classList.add('hidden');
        waitingForAnswer = true;
    }

    renderTimeline();
}

function allPlayersDone() {
    for (let i = 0; i < players.length; i++) {
        if (playerQuestionIndex[i] < playerQuestions[i].length) return false;
    }
    return true;
}

function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    const timeline = playerTimelines[currentPlayerIndex];
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

    const timeline = playerTimelines[currentPlayerIndex];

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
    const pi = currentPlayerIndex;
    const qi = playerQuestionIndex[pi];
    const q = playerQuestions[pi][qi];
    const timeline = playerTimelines[pi];
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
        Logger.log('PLAYER', `${players[pi].name} RÄTT "${q.question}" (${q.answer}) | Riskerar: ${roundPoints}p`);
    } else {
        Logger.log('PLAYER', `${players[pi].name} FEL "${q.question}" (${q.answer}) | Förlorade ${roundPoints}p`);
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

    if (!resultArea || !resultText || !resultPoints) return;

    const wo = document.getElementById('waiting-overlay');
    if (wo) wo.classList.add('hidden');

    if (correct) {
        resultText.textContent = `Rätt! "${q.question}" hände ${q.answer}.`;
        resultPoints.textContent = `${roundPoints}p på spel`;
        resultPoints.className = 'points-perfect';

        const canControl = !isOnlineGame || isHost || myPlayerIndex === currentPlayerIndex;
        if (continueBtn) continueBtn.classList.toggle('hidden', !canControl);
        if (stopBtn) stopBtn.classList.toggle('hidden', !canControl);
        if (nextBtn) nextBtn.classList.add('hidden');
    } else {
        resultText.textContent = `Fel! "${q.question}" hände ${q.answer}. Du förlorade alla poäng från rundan!`;
        resultPoints.textContent = '0 poäng';
        resultPoints.className = 'points-far';

        if (continueBtn) continueBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');

        const hideNext = isOnlineGame && !isHost;
        if (nextBtn) nextBtn.classList.toggle('hidden', hideNext);
    }

    resultArea.classList.remove('hidden');
    renderTimeline();
    updateScoreboard();
}

// Player chooses to continue (risk more)
function continueRound() {
    playerQuestionIndex[currentPlayerIndex]++;

    if (isOnlineGame && typeof onlineContinueRound === 'function') {
        onlineContinueRound();
        return;
    }

    const pi = currentPlayerIndex;
    if (playerQuestionIndex[pi] >= playerQuestions[pi].length) {
        // No more questions - auto bank
        players[pi].score += roundPoints;
        Logger.log('PLAYER', `${players[pi].name} stannade (inga fler kort) +${roundPoints}p`);
        roundPoints = 0;
        if (allPlayersDone()) {
            endGame();
        } else {
            goToNextPlayer();
        }
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
    playerQuestionIndex[currentPlayerIndex]++;
    roundPoints = 0;

    // Find next player who still has cards
    let tried = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        tried++;
    } while (tried < players.length && playerQuestionIndex[currentPlayerIndex] >= playerQuestions[currentPlayerIndex].length);

    if (allPlayersDone()) {
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
    playerTimelines = [];
    playerQuestions = [];
    playerQuestionIndex = [];
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
