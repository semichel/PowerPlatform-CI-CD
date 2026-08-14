// Gissa Namnet - enspelarläge med plånbok
// Start: 500 kr. Rätt svar ger 100 kr, fel svar kostar 500 kr.
// Plånboken kan aldrig gå under 500 kr - det är alltid golvet.
// Efter varje svar väljer du själv om du vill fortsätta eller sluta.
// Maxsumman får du genom att svara rätt på alla frågor utan ett enda fel.

const START_MONEY = 500;
const MONEY_PER_CORRECT = 100;
const WRONG_PENALTY = 500;
const QUESTION_TIME_MS = 10000; // tio sekunder per fråga

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const maxEl = document.getElementById('rules-max');
    if (maxEl) maxEl.textContent = formatMoney(MAX_SCORE);
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

    Logger.log('GAME', `Spel startat! ${formatMoney(money)} | Max: ${formatMoney(MAX_SCORE)} (${TOTAL_QUESTIONS} frågor)`);
    showScreen('game-screen');
    showQuestion();
}

function continueGame() {
    showQuestion();
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

    // Dölj figuren tills svaret avslöjas. Pokémon-bilderna har genomskinlig
    // bakgrund och blir riktiga silhuetter; Naruto-bilderna har bakgrund
    // och döljs med oskärpa i stället.
    cardImage.classList.remove('reveal');
    cardImage.classList.toggle('silhouette', currentQuestion.category === 'Pokémon');
    cardImage.classList.toggle('obscured', currentQuestion.category !== 'Pokémon');

    updateWallet();
    document.getElementById('result-area').classList.add('hidden');
    waitingForAnswer = true;
    renderOptions(currentQuestion);
    startTimer();
}

// Tidsgräns - hinner man inte svara räknas det som fel
function startTimer() {
    stopTimer();
    timerDeadline = Date.now() + QUESTION_TIME_MS;
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
    const left = Math.max(0, timerDeadline - Date.now());
    const bar = document.getElementById('timer-bar');
    const text = document.getElementById('timer-text');

    if (bar) bar.style.width = (left / QUESTION_TIME_MS * 100) + '%';
    if (text) text.textContent = Math.ceil(left / 1000) + 's';
    if (bar) bar.classList.toggle('timer-danger', left <= 3000);

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
    money = Math.max(START_MONEY, money - WRONG_PENALTY);
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
        Logger.log('PLAYER', `RÄTT (${q.answer}) | ${formatMoney(money)} | ${streak} i rad`);
    } else {
        applyWrongAnswer();
        Logger.log('PLAYER', `FEL - svarade ${selectedOption}, rätt: ${q.answer} | -${formatMoney(lastLoss)} | ${formatMoney(money)}`);
    }

    showResult(q, correct, selectedOption, false);
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

    // Avslöja figuren
    const cardImage = document.getElementById('card-image');
    cardImage.classList.remove('silhouette', 'obscured');
    cardImage.classList.add('reveal');

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
    const emoji = document.getElementById('end-emoji');
    const title = document.getElementById('end-title');
    const summary = document.getElementById('end-summary');
    const record = document.getElementById('end-record');

    const answered = questionNumber;
    const correctCount = answered - mistakes;
    const perfect = mistakes === 0 && answered === TOTAL_QUESTIONS;

    if (perfect) {
        emoji.textContent = '\u{1F451}';
        title.textContent = 'Perfekt spel!';
        summary.innerHTML = `Alla ${TOTAL_QUESTIONS} rätt utan ett enda fel &#x2013; maxsumman <strong>${formatMoney(money)}</strong>!`;
    } else if (reason === 'finished') {
        emoji.textContent = '\u{1F3C1}';
        title.textContent = 'Alla frågor klara!';
        summary.innerHTML = `Du slutade på <strong>${formatMoney(money)}</strong> med ${correctCount} rätt av ${answered}.`;
    } else {
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
