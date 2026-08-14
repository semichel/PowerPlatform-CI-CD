// Gissa Namnet - enspelarläge med plånbok
// Start: 500 kr. Rätt svar ger 100 kr, fel svar kostar 500 kr.
// Efter varje svar väljer du själv om du vill fortsätta eller sluta.
// Maxsumman får du genom att svara rätt på alla frågor utan ett enda fel.

const START_MONEY = 500;
const MONEY_PER_CORRECT = 100;
const WRONG_PENALTY = 500;

let money = START_MONEY;
let streak = 0;
let mistakes = 0;
let questionNumber = 0;
let deck = [];
let deckIndex = 0;
let currentQuestion = null;
let waitingForAnswer = false;

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
    if (currentQuestion.image) {
        cardImage.onload = () => Logger.log('GAME', `Bild laddad: ${currentQuestion.image.substring(0, 60)}...`);
        cardImage.onerror = () => {
            Logger.log('ERROR', `Bild kunde inte laddas: ${currentQuestion.image}`);
            cardImage.alt = '[Bild kunde inte laddas]';
        };
        cardImage.src = currentQuestion.image;
        cardImage.alt = 'Frågebild';
        cardImage.classList.remove('hidden');
    } else {
        cardImage.classList.add('hidden');
        cardImage.removeAttribute('src');
    }

    updateWallet();
    document.getElementById('result-area').classList.add('hidden');
    waitingForAnswer = true;
    renderOptions(currentQuestion);
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

function selectAnswer(selectedOption) {
    if (!waitingForAnswer) return;
    waitingForAnswer = false;

    const q = currentQuestion;
    const correct = selectedOption === q.answer;
    markQuestionSeen(q);

    if (correct) {
        money += MONEY_PER_CORRECT;
        streak++;
        Logger.log('PLAYER', `RÄTT (${q.answer}) | ${formatMoney(money)} | ${streak} i rad`);
    } else {
        money -= WRONG_PENALTY;
        streak = 0;
        mistakes++;
        Logger.log('PLAYER', `FEL - svarade ${selectedOption}, rätt: ${q.answer} | -${formatMoney(WRONG_PENALTY)} | ${formatMoney(money)}`);
    }

    saveBestMoney(money);
    showResult(q, correct, selectedOption);
}

// Sätter en bock eller ett kryss framför namnet när svaret avslöjas
function markOption(btn, symbol) {
    const icon = document.createElement('span');
    icon.className = 'option-icon';
    icon.textContent = symbol;
    btn.prepend(icon);
}

function showResult(q, correct, selectedOption) {
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

    // Pengarna är slut
    if (money <= 0) {
        endGame('broke');
        return;
    }

    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');

    if (correct) {
        resultText.textContent = `Rätt! Det är ${q.answer}.`;
        resultPoints.textContent = '+' + formatMoney(MONEY_PER_CORRECT);
        resultPoints.className = 'points-perfect';
    } else {
        resultText.textContent = `Fel! Det är ${q.answer}.`;
        resultPoints.textContent = '-' + formatMoney(WRONG_PENALTY);
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
    const emoji = document.getElementById('end-emoji');
    const title = document.getElementById('end-title');
    const summary = document.getElementById('end-summary');
    const record = document.getElementById('end-record');

    const answered = questionNumber;
    const correctCount = answered - mistakes;
    const perfect = mistakes === 0 && answered === TOTAL_QUESTIONS;
    const questionWord = answered === 1 ? 'fråga' : 'frågor';

    if (perfect) {
        emoji.textContent = '\u{1F451}';
        title.textContent = 'Perfekt spel!';
        summary.innerHTML = `Alla ${TOTAL_QUESTIONS} rätt utan ett enda fel &#x2013; maxsumman <strong>${formatMoney(money)}</strong>!`;
    } else if (reason === 'broke') {
        emoji.textContent = '\u{1F4B8}';
        title.textContent = 'Pengarna tog slut!';
        summary.innerHTML = `Du hamnade på <strong>${formatMoney(money)}</strong> efter ${answered} ${questionWord}.`;
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
