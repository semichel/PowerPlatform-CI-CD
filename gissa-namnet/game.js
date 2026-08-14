// Gissa Namnet - enspelarläge med plånbok
// Du börjar på 500 kr, varje rätt svar ger 100 kr och målet är 5 000 kr.
// Ett fel svar tar dig tillbaka till startsumman igen.

const START_MONEY = 500;
const MONEY_PER_CORRECT = 100;
const GOAL_MONEY = 5000;

let money = START_MONEY;
let streak = 0;
let questionNumber = 0;
let deck = [];
let deckIndex = 0;
let currentQuestion = null;
let waitingForAnswer = false;
let selectedCategories = new Set(CATEGORIES);

// Antal rätt i rad som krävs för att nå målet
const CORRECT_NEEDED = Math.ceil((GOAL_MONEY - START_MONEY) / MONEY_PER_CORRECT);

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

function resetQuestionHistory() {
    localStorage.removeItem('seenQuestionsGissa');
    alert('Frågehistorik nollställd!');
    Logger.log('GAME', 'Frågehistorik nollställd manuellt');
}

// Bästa resultat sparas mellan spelomgångar
function getBestMoney() {
    const value = parseInt(localStorage.getItem('bestMoneyGissa') || '0', 10);
    return isNaN(value) ? 0 : value;
}

function saveBestMoney(amount) {
    if (amount > getBestMoney()) {
        localStorage.setItem('bestMoneyGissa', String(amount));
        return true;
    }
    return false;
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
    renderCategoryButtons('category-buttons');
    renderBestRecord();
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

// Flip screen upside down
function toggleFlip() {
    document.getElementById('app').classList.toggle('flipped');
}

// Bygg en kortlek: osedda frågor först, resten efter
function buildDeck() {
    const cats = [...selectedCategories];
    const pool = QUESTIONS.filter(q => cats.includes(q.category));
    const seen = getSeenQuestions();
    const unseen = pool.filter(q => !seen.has(getQuestionKey(q)));
    const rest = pool.filter(q => seen.has(getQuestionKey(q)));
    Logger.log('GAME', `Kortlek byggd: ${pool.length} frågor (${unseen.length} osedda)`);
    return [...shuffleArray(unseen), ...shuffleArray(rest)];
}

function startGame() {
    if (selectedCategories.size === 0) {
        alert('Välj minst en kategori!');
        return;
    }

    money = START_MONEY;
    streak = 0;
    questionNumber = 0;
    deck = buildDeck();
    deckIndex = 0;

    if (deck.length === 0) {
        alert('Inga frågor att spela!');
        return;
    }

    Logger.log('GAME', `Spel startat! Plånbok: ${formatMoney(money)} | Mål: ${formatMoney(GOAL_MONEY)} (${CORRECT_NEEDED} rätt i rad)`);
    showScreen('game-screen');
    showQuestion();
}

function nextQuestion() {
    showQuestion();
}

function showQuestion() {
    // Kortleken tar slut - blanda om och börja från början igen
    if (deckIndex >= deck.length) {
        deck = shuffleArray(deck);
        deckIndex = 0;
        Logger.log('GAME', 'Kortleken slut - blandar om');
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

    const progress = Math.min(100, (money / GOAL_MONEY) * 100);
    document.getElementById('wallet-progress-bar').style.width = progress + '%';

    const streakEl = document.getElementById('streak-info');
    if (streakEl) {
        streakEl.textContent = streak > 0 ? `${streak} rätt i rad` : '';
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
        money = Math.min(GOAL_MONEY, money + MONEY_PER_CORRECT);
        streak++;
        Logger.log('PLAYER', `RÄTT (${q.answer}) | Plånbok: ${formatMoney(money)} | ${streak} i rad`);
    } else {
        Logger.log('PLAYER', `FEL - svarade ${selectedOption}, rätt: ${q.answer} | Tappade ${formatMoney(money)} - börjar om`);
        money = START_MONEY;
        streak = 0;
    }

    saveBestMoney(money);
    showResult(q, correct, selectedOption);
}

function showResult(q, correct, selectedOption) {
    const resultArea = document.getElementById('result-area');
    const resultText = document.getElementById('result-text');
    const resultPoints = document.getElementById('result-points');

    document.getElementById('card-category').textContent = q.category;

    document.querySelectorAll('.option-btn').forEach(btn => {
        const val = btn.dataset.value;
        btn.onclick = null;
        if (val === String(q.answer)) {
            btn.classList.add('correct');
        } else if (val === String(selectedOption) && !correct) {
            btn.classList.add('wrong');
        }
        btn.classList.add('disabled');
    });

    updateWallet();

    // Målet nått!
    if (correct && money >= GOAL_MONEY) {
        endGame(true);
        return;
    }

    if (correct) {
        resultText.textContent = `Rätt! Det är ${q.answer}.`;
        resultPoints.textContent = `+${formatMoney(MONEY_PER_CORRECT)}`;
        resultPoints.className = 'points-perfect';
    } else {
        resultText.textContent = `Fel! Det är ${q.answer}. Du börjar om från ${formatMoney(START_MONEY)}.`;
        resultPoints.textContent = formatMoney(START_MONEY);
        resultPoints.className = 'points-far';
    }

    resultArea.classList.remove('hidden');
}

function quitGame() {
    endGame(false);
}

function endGame(won) {
    const best = getBestMoney();
    const emoji = document.getElementById('end-emoji');
    const title = document.getElementById('end-title');
    const summary = document.getElementById('end-summary');
    const record = document.getElementById('end-record');

    if (won) {
        emoji.textContent = '\u{1F3C6}';
        title.textContent = 'Du klarade det!';
        summary.innerHTML = `Du nådde <strong>${formatMoney(GOAL_MONEY)}</strong> på ${streak} rätt i rad!`;
        Logger.log('GAME', `MÅLET NÅTT! ${formatMoney(money)} på ${streak} rätt i rad`);
    } else {
        emoji.textContent = '\u{1F44B}';
        title.textContent = 'Spelet är slut!';
        summary.innerHTML = `Du slutade med <strong>${formatMoney(money)}</strong> efter ${questionNumber} frågor.`;
        Logger.log('GAME', `Spel avslutat med ${formatMoney(money)} efter ${questionNumber} frågor`);
    }

    record.textContent = best > 0 ? 'Ditt rekord: ' + formatMoney(best) : '';
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
