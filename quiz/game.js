// Game State
let playerCount = 2;
let players = [];
let currentPlayerIndex = 0;
let playerQuestions = []; // per-player question decks
let playerQuestionIndex = []; // per-player current question index
let selectedCategories = new Set(CATEGORIES);
const QUESTIONS_PER_PLAYER = 10;
let waitingForAnswer = false;
let isOnlineGame = false;
let myPlayerIndex = -1;
let roundPoints = 0;

// Question history - avoid repeats using localStorage
function getQuestionKey(q) {
    if (q.isMusic) return 'music:' + q.trackId;
    return q.category + ':' + q.question;
}

function getSeenQuestions() {
    try {
        return new Set(JSON.parse(localStorage.getItem('seenQuestions') || '[]'));
    } catch { return new Set(); }
}

function markQuestionSeen(q) {
    const seen = getSeenQuestions();
    seen.add(getQuestionKey(q));
    localStorage.setItem('seenQuestions', JSON.stringify([...seen]));
}

function filterSeenQuestions(questions) {
    const seen = getSeenQuestions();
    const unseen = questions.filter(q => !seen.has(getQuestionKey(q)));
    if (unseen.length === 0) {
        Logger.log('GAME', 'Alla frågor sedda - nollställer historik!');
        localStorage.removeItem('seenQuestions');
        return questions;
    }
    Logger.log('GAME', `${unseen.length}/${questions.length} osedda frågor`);
    return unseen;
}

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

// Reset question history
function resetQuestionHistory() {
    localStorage.removeItem('seenQuestions');
    alert('Frågehistorik nollställd!');
    Logger.log('GAME', 'Frågehistorik nollställd manuellt');
}

// Music duration setting
function changeMusicDuration(delta) {
    musicDurationLimit = Math.max(1, Math.min(30, musicDurationLimit + delta));
    const displays = document.querySelectorAll('#music-duration-display, #lobby-music-duration-display');
    displays.forEach(d => { if (d) d.textContent = musicDurationLimit + 's'; });
}

// Mode selection
function showLocalSetup() {
    showScreen('local-setup');
}

function showOnlineSetup() {
    showScreen('online-setup');
}

// Test image questions only
function startImageTest() {
    isOnlineGame = false;
    players = [{ name: 'Testare', score: 0 }];
    const allImages = shuffleArray(filterSeenQuestions([...IMAGE_QUESTIONS]));
    playerQuestions = [allImages];
    playerQuestionIndex = [0];
    currentPlayerIndex = 0;
    waitingForAnswer = false;
    roundPoints = 0;
    Logger.log('GAME', `Bildtest startat! ${allImages.length} bildfrågor`);
    showScreen('game-screen');
    showQuestion();
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
function prepareAndStartGame(providedPlayerQuestions) {
    if (providedPlayerQuestions) {
        playerQuestions = providedPlayerQuestions;
    } else {
        const cats = [...selectedCategories];
        const filtered = QUESTIONS.filter(q => cats.includes(q.category));
        const imageFiltered = IMAGE_QUESTIONS.filter(q => cats.includes(q.category));
        const allPool = filterSeenQuestions([...filtered, ...imageFiltered]);
        Logger.log('GAME', `Frågor: ${allPool.length} osedda (kategorier: ${cats.join(', ')})`);
        const allRegular = shuffleArray(allPool);

        // Generate music questions matching selected categories
        const allMusic = generateMusicQuestionsForCategories(cats);
        const musicQs = shuffleArray(filterSeenQuestions(allMusic));

        playerQuestions = [];
        for (let i = 0; i < players.length; i++) {
            const start = i * QUESTIONS_PER_PLAYER;
            let playerCards = allRegular.slice(start, start + QUESTIONS_PER_PLAYER);

            // Mix in 2-3 music questions per player (if available)
            if (musicQs.length > 0) {
                const musicPerPlayer = Math.min(3, musicQs.length);
                const myMusic = musicQs.splice(0, musicPerPlayer);
                const regularCount = QUESTIONS_PER_PLAYER - musicPerPlayer;
                playerCards = playerCards.slice(0, regularCount);
                playerCards = shuffleArray([...playerCards, ...myMusic]);
            }

            if (playerCards.length < 1) {
                alert('Inte tillräckligt med frågor för alla spelare!');
                return;
            }
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
            Logger.log('PLAYER', `${players[pi].name} fick ${roundPoints}p (inga fler frågor)`);
            roundPoints = 0;
        }
        if (allPlayersDone()) {
            endGame();
            return;
        }
        goToNextPlayer();
        return;
    }

    document.getElementById('current-question').textContent = qi + 1;
    document.getElementById('total-questions').textContent = myQuestions.length;
    document.getElementById('player-turn').textContent = players[pi].name;

    const q = myQuestions[qi];
    document.getElementById('card-category').textContent = '';
    document.getElementById('card-question').textContent = q.question;

    // Handle image questions
    const cardImage = document.getElementById('card-image');
    if (q.image) {
        cardImage.onload = () => Logger.log('GAME', `Bild laddad: ${q.image.substring(0, 60)}...`);
        cardImage.onerror = () => {
            Logger.log('ERROR', `Bild kunde inte laddas: ${q.image}`);
            cardImage.alt = '[Bild kunde inte laddas]';
        };
        cardImage.src = q.image;
        cardImage.alt = 'Frågebild';
        cardImage.classList.remove('hidden');
    } else {
        cardImage.classList.add('hidden');
        cardImage.removeAttribute('src');
    }

    // Handle music questions - show/hide audio player
    const audioPlayer = document.getElementById('audio-player');
    if (q.isMusic) {
        audioPlayer.classList.remove('hidden');
        document.getElementById('audio-status').textContent = 'Laddar ljud...';
        document.getElementById('audio-progress-bar').style.width = '0%';
        stopAudioPlayback();
        currentAudioBuffer = null;

        fetchDeezerPreview(q.trackId).then(buffer => {
            if (buffer) {
                currentAudioBuffer = buffer;
                document.getElementById('audio-status').textContent = 'Tryck Spela för att lyssna!';
                Logger.log('GAME', `Ljud laddat för: ${q.answer}`);
            } else {
                document.getElementById('audio-status').textContent = 'Kunde inte ladda ljud';
            }
        });
    } else {
        audioPlayer.classList.add('hidden');
        stopAudioPlayback();
        currentAudioBuffer = null;
    }

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

    // Set waitingForAnswer
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

    renderOptions(q);
}

function allPlayersDone() {
    for (let i = 0; i < players.length; i++) {
        if (playerQuestionIndex[i] < playerQuestions[i].length) return false;
    }
    return true;
}

function renderOptions(q) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const canInteract = !isOnlineGame || myPlayerIndex === currentPlayerIndex;
    const isMusic = q.isMusic;
    const isTextOptions = typeof q.options[0] === 'string';

    // Shuffle options for display
    const shuffledOptions = shuffleArray(q.options);

    shuffledOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn' + ((isMusic || isTextOptions) ? ' option-text' : '');
        btn.textContent = option;
        btn.dataset.value = String(option);
        if (canInteract && waitingForAnswer) {
            btn.onclick = () => selectAnswer(option);
        } else {
            btn.classList.add('disabled');
        }
        container.appendChild(btn);
    });

    // Single column for music (many options) or meme questions (8 options)
    if (isMusic || q.options.length > 4) {
        container.classList.add('options-single-col');
    } else {
        container.classList.remove('options-single-col');
    }
}

function selectAnswer(selectedOption) {
    if (!waitingForAnswer) return;
    waitingForAnswer = false;

    // In online mode, send choice to host
    if (isOnlineGame && typeof onlineSelectAnswer === 'function') {
        onlineSelectAnswer(selectedOption);
        return;
    }

    processAnswer(selectedOption);
}

function processAnswer(selectedOption) {
    const pi = currentPlayerIndex;
    const qi = playerQuestionIndex[pi];
    const q = playerQuestions[pi][qi];

    const correct = selectedOption === q.answer;
    markQuestionSeen(q);

    if (correct) {
        roundPoints += 2;
        Logger.log('PLAYER', `${players[pi].name} RÄTT "${q.question}" (${q.answer}) | Riskerar: ${roundPoints}p`);
    } else {
        Logger.log('PLAYER', `${players[pi].name} FEL "${q.question}" svarade ${selectedOption}, rätt: ${q.answer} | Förlorade ${roundPoints}p`);
        roundPoints = 0;
    }

    showResult(q, correct, selectedOption);
}

function showResult(q, correct, selectedOption) {
    const resultArea = document.getElementById('result-area');
    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');
    const continueBtn = document.getElementById('continue-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextBtn = document.getElementById('next-btn');

    if (!resultArea || !resultText || !resultPoints) return;

    const wo = document.getElementById('waiting-overlay');
    if (wo) wo.classList.add('hidden');

    // Show category in result
    document.getElementById('card-category').textContent = q.category;

    // Stop music if playing
    stopAudioPlayback();

    // Highlight correct/wrong in option buttons
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        const val = btn.dataset.value;
        btn.onclick = null;
        if (val === String(q.answer)) {
            btn.classList.add('correct');
        } else if (val === String(selectedOption) && !correct) {
            btn.classList.add('wrong');
        }
        btn.classList.add('disabled');
    });

    if (correct) {
        resultText.textContent = q.isMusic ? `Rätt! Det var ${q.answer}.` : `Rätt! Svaret är ${q.answer}.`;
        resultPoints.textContent = `${roundPoints}p på spel`;
        resultPoints.className = 'points-perfect';

        const canControl = !isOnlineGame || isHost || myPlayerIndex === currentPlayerIndex;
        if (continueBtn) continueBtn.classList.toggle('hidden', !canControl);
        if (stopBtn) stopBtn.classList.toggle('hidden', !canControl);
        if (nextBtn) nextBtn.classList.add('hidden');
    } else {
        resultText.textContent = q.isMusic
            ? `Fel! Rätt svar var ${q.answer}. Du förlorade alla poäng från rundan!`
            : `Fel! Rätt svar är ${q.answer}. Du förlorade alla poäng från rundan!`;
        resultPoints.textContent = '0 poäng';
        resultPoints.className = 'points-far';

        if (continueBtn) continueBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');

        const hideNext = isOnlineGame && !isHost;
        if (nextBtn) nextBtn.classList.toggle('hidden', hideNext);
    }

    resultArea.classList.remove('hidden');
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
        players[pi].score += roundPoints;
        Logger.log('PLAYER', `${players[pi].name} stannade (inga fler frågor) +${roundPoints}p`);
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

// Wrong answer -> next player
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
    stopAudioPlayback();
    currentAudioBuffer = null;
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
