// Gissa Namnet - enspelarläge med plånbok
// Start: 500 kr. Rätt svar ger 100 kr, fel svar kostar 500 kr.
// Plånboken kan aldrig gå under 500 kr - det är alltid golvet.
// Efter varje svar väljer du själv om du vill fortsätta eller sluta.
// Maxsumman får du genom att svara rätt på alla frågor utan ett enda fel.

const START_MONEY = 500;
const MONEY_PER_CORRECT = 100;
const QUESTION_TIME_MS = 10000; // tio sekunder per fråga

// Straffet väljs på startskärmen innan spelet börjar
const PENALTY_CHOICES = [100, 200, 500, 1000];
let wrongPenalty = 500;

let timerId = null;
let timerDeadline = 0;

let money = START_MONEY;
let streak = 0;
let mistakes = 0;
let questionNumber = 0;
let deck = [];
let deckIndex = 0;
let currentQuestion = null;
let waitingForAnswer = false;
let lastLoss = 0; // hur mycket senaste felsvaret faktiskt kostade
let lastTickSecond = -1;
let transitionId = null;

// Kort paus mellan frågorna så att man hinner se svaret innan nästa bild
const BREATHING_ROOM_MS = 900;
const TIMER_GRACE_MS = 700; // titta på bilden innan klockan startar

// Alla frågor är med - maxsumman är alla rätt utan fel
const TOTAL_QUESTIONS = QUESTIONS.length;
const MAX_SCORE = START_MONEY + MONEY_PER_CORRECT * TOTAL_QUESTIONS;

function formatMoney(amount) {
    return amount.toLocaleString('sv-SE') + ' kr';
}

// Frågehistorik - osedda frågor kommer först
function getQuestionKey(q) {
    return q.category + ':' + (q.id || q.question);
}

function getSeenQuestions() {
    try {
        return new Set(JSON.parse(localStorage.getItem('seenQuestionsGissa') || '[]'));
    } catch { return new Set(); }
}

function markQuestionSeen(q) {
    const seen = getSeenQuestions();
    seen.add(getQuestionKey(q));
    localStorage.setItem('seenQuestionsGissa', JSON.stringify([...seen]));
}

// Bästa resultat sparas mellan spelomgångar
function getBestMoney() {
    const value = parseInt(localStorage.getItem('bestMoneyGissa') || '0', 10);
    return isNaN(value) ? 0 : value;
}

function saveBestMoney(amount) {
    if (amount > getBestMoney()) {
        localStorage.setItem('bestMoneyGissa', String(amount));
    }
}

function renderBestRecord() {
    const el = document.getElementById('best-record');
    if (!el) return;
    const best = getBestMoney();
    if (best > 0) {
        el.textContent = 'Ditt rekord: ' + formatMoney(best);
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// Straffväljare på startskärmen
function renderPenaltyButtons() {
    const container = document.getElementById('penalty-buttons');
    if (!container) return;
    container.innerHTML = PENALTY_CHOICES.map(value =>
        `<button class="cat-btn${value === wrongPenalty ? ' selected' : ''}" onclick="setPenalty(${value})">${formatMoney(value)}</button>`
    ).join('');

    const rulesPenalty = document.getElementById('rules-penalty');
    if (rulesPenalty) rulesPenalty.textContent = formatMoney(wrongPenalty);
}

function setPenalty(value) {
    wrongPenalty = value;
    renderPenaltyButtons();
    Logger.log('GAME', `Straff satt till ${formatMoney(value)}`);
}

// Ljud på/av
function renderSoundButtons() {
    const on = Sound.isEnabled();
    document.querySelectorAll('.btn-sound').forEach(btn => {
        btn.textContent = on ? '\u{1F50A}' : '\u{1F507}';
        btn.title = on ? 'Stäng av ljudet' : 'Sätt på ljudet';
    });
}

function toggleSound() {
    Sound.init();
    Sound.setEnabled(!Sound.isEnabled());
    renderSoundButtons();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const maxEl = document.getElementById('rules-max');
    if (maxEl) maxEl.textContent = formatMoney(MAX_SCORE);
    Sound.loadPreference();
    renderSoundButtons();
    renderPenaltyButtons();
    renderBestRecord();
});

// Flip screen upside down
function toggleFlip() {
    document.getElementById('app').classList.toggle('flipped');
}

// Kortlek med alla frågor - osedda först, sedan resten
function buildDeck() {
    const seen = getSeenQuestions();
    const unseen = QUESTIONS.filter(q => !seen.has(getQuestionKey(q)));
    const rest = QUESTIONS.filter(q => seen.has(getQuestionKey(q)));
    Logger.log('GAME', `Kortlek byggd: ${QUESTIONS.length} frågor (${unseen.length} osedda)`);
    return [...shuffleArray(unseen), ...shuffleArray(rest)];
}

function startGame() {
    money = START_MONEY;
    streak = 0;
    mistakes = 0;
    questionNumber = 0;
    deck = buildDeck();
    deckIndex = 0;

    document.getElementById('question-total').textContent = TOTAL_QUESTIONS;
    document.getElementById('wallet-goal').textContent = 'Max: ' + formatMoney(MAX_SCORE);

    Sound.init();
    Sound.start();

    Logger.log('GAME', `Spel startat! ${formatMoney(money)} | Straff: ${formatMoney(wrongPenalty)} | Max: ${formatMoney(MAX_SCORE)} (${TOTAL_QUESTIONS} frågor)`);
    showScreen('game-screen');
    showQuestion();
}

// Andrum: tona ut kortet, kort paus, och först därefter nästa fråga
function continueGame() {
    if (transitionId) return;
    Sound.click();

    const card = document.getElementById('question-card');
    const options = document.getElementById('options-container');
    const result = document.getElementById('result-area');

    card.classList.add('leaving');
    options.classList.add('leaving');
    result.classList.add('hidden');

    transitionId = setTimeout(() => {
        transitionId = null;
        card.classList.remove('leaving');
        options.classList.remove('leaving');
        showQuestion();
    }, BREATHING_ROOM_MS);
}

function stopGame() {
    endGame('stopped');
}

function showQuestion() {
    // Alla frågor besvarade - spelet är slut
    if (deckIndex >= deck.length) {
        endGame('finished');
        return;
    }

    currentQuestion = deck[deckIndex];
    deckIndex++;
    questionNumber++;

    document.getElementById('question-count').textContent = questionNumber;
    document.getElementById('card-category').textContent = '';
    document.getElementById('card-question').textContent = currentQuestion.question;

    const cardImage = document.getElementById('card-image');
    const cardFrame = document.getElementById('card-image-frame');
    if (currentQuestion.image) {
        cardImage.onload = () => Logger.log('GAME', `Bild laddad: ${currentQuestion.image.substring(0, 60)}...`);
        cardImage.onerror = () => {
            Logger.log('ERROR', `Bild kunde inte laddas: ${currentQuestion.image}`);
            cardImage.alt = '[Bild kunde inte laddas]';
        };
        cardImage.src = currentQuestion.image;
        cardImage.alt = 'Frågebild';
        cardFrame.classList.remove('hidden');
    } else {
        cardFrame.classList.add('hidden');
        cardImage.removeAttribute('src');
    }

    // Musiken byter tema efter kategori
    Sound.playTheme(currentQuestion.category === 'Naruto' ? 'naruto' : 'pokemon');

    updateWallet();
    document.getElementById('result-area').classList.add('hidden');
    waitingForAnswer = true;
    renderOptions(currentQuestion);

    const card = document.getElementById('question-card');
    card.classList.remove('entering');
    void card.offsetWidth; // starta om animationen
    card.classList.add('entering');

    startTimer();
    preloadUpcomingImages();
}

// Hämtar hem nästa bilder i förväg så att de visas direkt när frågan byts
function preloadUpcomingImages() {
    for (let i = deckIndex; i < Math.min(deckIndex + 3, deck.length); i++) {
        const next = deck[i];
        if (next && next.image) {
            const img = new Image();
            img.src = next.image;
        }
    }
}

// Tidsgräns - hinner man inte svara räknas det som fel
function startTimer() {
    stopTimer();
    lastTickSecond = -1;
    // Klockan börjar först efter en kort stund, så att man hinner
    // titta på bilden innan tiden tickar
    timerDeadline = Date.now() + QUESTION_TIME_MS + TIMER_GRACE_MS;
    updateTimer();
    timerId = setInterval(updateTimer, 100);
}

function stopTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}

function updateTimer() {
    const left = Math.max(0, Math.min(QUESTION_TIME_MS, timerDeadline - Date.now()));
    const bar = document.getElementById('timer-bar');
    const text = document.getElementById('timer-text');
    const seconds = Math.ceil(left / 1000);

    if (bar) {
        bar.style.width = (left / QUESTION_TIME_MS * 100) + '%';
        bar.classList.toggle('timer-danger', left <= 3000);
    }
    if (text) text.textContent = seconds + 's';

    // Ett tick per sekund de sista tre
    if (left <= 3000 && left > 0 && seconds !== lastTickSecond) {
        lastTickSecond = seconds;
        Sound.tick();
    }

    if (left <= 0) {
        stopTimer();
        timeUp();
    }
}

function timeUp() {
    if (!waitingForAnswer) return;
    waitingForAnswer = false;
    Logger.log('PLAYER', `TIDEN UT - rätt svar var ${currentQuestion.answer}`);
    applyWrongAnswer();
    Sound.timeout();
    shakeScreen();
    showResult(currentQuestion, false, null, true);
}

function updateWallet() {
    document.getElementById('wallet-amount').textContent = formatMoney(money);

    const progress = Math.max(0, Math.min(100, (money / MAX_SCORE) * 100));
    document.getElementById('wallet-progress-bar').style.width = progress + '%';

    const streakEl = document.getElementById('streak-info');
    if (streakEl) {
        streakEl.textContent = streak > 1 ? `${streak} rätt i rad` : '';
    }
}

function renderOptions(q) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    shuffleArray(q.options).forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn option-text';
        btn.textContent = option;
        btn.dataset.value = String(option);
        if (waitingForAnswer) {
            btn.onclick = () => selectAnswer(option);
        } else {
            btn.classList.add('disabled');
        }
        container.appendChild(btn);
    });

    container.classList.toggle('options-single-col', q.options.length > 4);
}

// 500 kr är golvet - man kan aldrig hamna under startsumman
function applyWrongAnswer() {
    const before = money;
    money = Math.max(START_MONEY, money - wrongPenalty);
    lastLoss = before - money;
    streak = 0;
    mistakes++;
    markQuestionSeen(currentQuestion);
    saveBestMoney(money);
}

function selectAnswer(selectedOption) {
    if (!waitingForAnswer) return;
    waitingForAnswer = false;
    stopTimer();

    const q = currentQuestion;
    const correct = selectedOption === q.answer;

    if (correct) {
        money += MONEY_PER_CORRECT;
        streak++;
        markQuestionSeen(q);
        saveBestMoney(money);
        Sound.correct();
        burstConfetti();
        Logger.log('PLAYER', `RÄTT (${q.answer}) | ${formatMoney(money)} | ${streak} i rad`);
    } else {
        applyWrongAnswer();
        Sound.wrong();
        shakeScreen();
        Logger.log('PLAYER', `FEL - svarade ${selectedOption}, rätt: ${q.answer} | -${formatMoney(lastLoss)} | ${formatMoney(money)}`);
    }

    showResult(q, correct, selectedOption, false);
}

// Konfetti vid rätt svar
function burstConfetti() {
    const colors = ['#ee1515', '#ffcb05', '#3b4cca', '#4caf50', '#ff8f3b'];
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';

    for (let i = 0; i < 26; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = (10 + Math.random() * 80) + '%';
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = (Math.random() * 0.2) + 's';
        piece.style.setProperty('--drift', (Math.random() * 140 - 70) + 'px');
        piece.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
        layer.appendChild(piece);
    }

    document.getElementById('app').appendChild(layer);
    setTimeout(() => layer.remove(), 1600);
}

// Skakning vid fel svar
function shakeScreen() {
    const card = document.getElementById('question-card');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 600);
}

// Sätter en bock eller ett kryss framför namnet när svaret avslöjas
function markOption(btn, symbol) {
    const icon = document.createElement('span');
    icon.className = 'option-icon';
    icon.textContent = symbol;
    btn.prepend(icon);
}

function showResult(q, correct, selectedOption, timedOut) {
    document.getElementById('card-category').textContent = q.category;

    document.querySelectorAll('.option-btn').forEach(btn => {
        const val = btn.dataset.value;
        btn.onclick = null;
        if (val === String(q.answer)) {
            btn.classList.add('correct');
            markOption(btn, '✔');
        } else if (val === String(selectedOption) && !correct) {
            btn.classList.add('wrong');
            markOption(btn, '✖');
        }
        btn.classList.add('disabled');
    });

    updateWallet();

    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');

    if (correct) {
        resultText.textContent = `Rätt! Det är ${q.answer}.`;
        resultPoints.textContent = '+' + formatMoney(MONEY_PER_CORRECT);
        resultPoints.className = 'points-perfect';
    } else {
        resultText.textContent = timedOut
            ? `Tiden tog slut! Det är ${q.answer}.`
            : `Fel! Det är ${q.answer}.`;
        // Redan nere på golvet - felet kostade ingenting
        resultPoints.textContent = lastLoss > 0
            ? '-' + formatMoney(lastLoss)
            : 'Du står kvar på ' + formatMoney(START_MONEY);
        resultPoints.className = 'points-far';
    }

    // Sista frågan - inget mer att fortsätta med
    const isLastQuestion = deckIndex >= deck.length;
    const prompt = document.getElementById('continue-prompt');
    const continueBtn = document.getElementById('continue-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (isLastQuestion) {
        prompt.textContent = 'Det var sista frågan!';
        continueBtn.classList.add('hidden');
        stopBtn.textContent = 'Se resultatet';
    } else {
        prompt.textContent = 'Vill du fortsätta?';
        continueBtn.classList.remove('hidden');
        stopBtn.textContent = 'Nej, sluta';
    }

    const resultArea = document.getElementById('result-area');
    resultArea.classList.remove('hidden');
    // Se till att svaret och knapparna syns utan att man behöver scrolla
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function endGame(reason) {
    stopTimer();
    Sound.stopMusic();
    const emoji = document.getElementById('end-emoji');
    const title = document.getElementById('end-title');
    const summary = document.getElementById('end-summary');
    const record = document.getElementById('end-record');

    const answered = questionNumber;
    const correctCount = answered - mistakes;
    const perfect = mistakes === 0 && answered === TOTAL_QUESTIONS;

    if (perfect) {
        Sound.win();
        burstConfetti();
        setTimeout(burstConfetti, 400);
        emoji.textContent = '\u{1F451}';
        title.textContent = 'Perfekt spel!';
        summary.innerHTML = `Alla ${TOTAL_QUESTIONS} rätt utan ett enda fel &#x2013; maxsumman <strong>${formatMoney(money)}</strong>!`;
    } else if (reason === 'finished') {
        emoji.textContent = '\u{1F3C1}';
        title.textContent = 'Alla frågor klara!';
        summary.innerHTML = `Du slutade på <strong>${formatMoney(money)}</strong> med ${correctCount} rätt av ${answered}.`;
    } else {
        Sound.gameOver();
        emoji.textContent = '\u{1F44B}';
        title.textContent = 'Bra spelat!';
        summary.innerHTML = `Du slutade på <strong>${formatMoney(money)}</strong> med ${correctCount} rätt av ${answered}.`;
    }

    saveBestMoney(money);
    const best = getBestMoney();
    record.textContent = best > 0 ? 'Ditt rekord: ' + formatMoney(best) : '';

    Logger.log('GAME', `Slut (${reason}): ${formatMoney(money)} | ${correctCount}/${answered} rätt | ${mistakes} fel`);
    showScreen('end-screen');
}

function resetGame() {
    Logger.log('GAME', 'Tillbaka till start');
    renderBestRecord();
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
