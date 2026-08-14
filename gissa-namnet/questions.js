// Bygger frågor från karaktärsdatan i characters.js
// Varje fråga visar en bild och fyra tydligt olika namnalternativ.
// De tre felaktiga är påhittade namn - varken det rätta namnet i felstavad
// form eller namnet på någon annan riktig figur. De sätts ihop av stavelser
// från riktiga namn så att de låter trovärdiga: bara ett av de fyra namnen
// finns på riktigt, och man måste veta vilket.

const WRONG_OPTIONS = 3; // tre påhittade namn + rätt svar = fyra alternativ

function normalizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Alla riktiga namn - ett påhittat namn får aldrig råka bli en riktig figur
function buildRealNameSet() {
    const set = new Set();
    POKEMON_GEN1.forEach(p => set.add(normalizeName(p.name)));
    NARUTO_CHARS.forEach(c => {
        set.add(normalizeName(c.name));
        // även varje enskilt ord, så vi inte hittar på "Sasuke Hatake"
        c.name.split(/\s+/).forEach(word => set.add(normalizeName(word)));
    });
    return set;
}

const REAL_NAMES = buildRealNameSet();

// Delar upp ett ord i stavelser: "charizard" -> ["cha", "ri", "zard"]
function splitSyllables(word) {
    const parts = word.match(/[^aeiouyåäö]*[aeiouyåäö]+/gi);
    if (!parts || parts.length === 0) return [word];
    const consumed = parts.join('').length;
    if (consumed < word.length) {
        parts[parts.length - 1] += word.slice(consumed);
    }
    return parts;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Bygger ett nytt namn av enstaka stavelser hämtade från olika riktiga namn.
// Att ta en stavelse i taget gör att inga igenkännbara ordbörjor som "Bulba"
// eller "Pika" följer med och avslöjar att namnet är ihopklippt.
// Konsonantkluster som fungerar i början av ett ord
const VALID_ONSET = /^(?:[bcdfgklpst]r|[bcfgkps]l|ch|sh|th|wh|sc|sk|sm|sn|sp|st|sw|tw|ph|[bcdfghjklmnpqrstvwxyz])?[aeiouy]/;

// Ett hopsatt namn måste gå att uttala. Utan den här kontrollen blir det
// "Ctrogeonsey" och "Rseavistoi" när två konsonantkluster hamnar bredvid varandra.
function isPronounceable(word) {
    if (/[^aeiouy]{3,}/.test(word)) return false;  // tre konsonanter i rad
    if (/[aeiouy]{3,}/.test(word)) return false;   // tre vokaler i rad
    return VALID_ONSET.test(word);
}

function composeName(syllablePool) {
    const count = 2 + Math.floor(Math.random() * 2); // två eller tre stavelser
    let word = '';
    for (let i = 0; i < count; i++) {
        word += pickRandom(syllablePool);
    }
    if (word.length < 5 || word.length > 11) return null;
    if (!isPronounceable(word)) return null;
    return capitalize(word);
}

// Alla stavelser som förekommer i en uppsättning namn
function buildSyllablePool(names) {
    const pool = [];
    names.forEach(name => {
        splitSyllables(name.toLowerCase()).forEach(syllable => {
            if (syllable.length >= 2 && syllable.length <= 4) pool.push(syllable);
        });
    });
    return pool;
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function shuffleList(list) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Skapar påhittade namn som ska stå bredvid det rätta svaret
function makeFakeNames(answer, sourceNames, count) {
    const answerKey = normalizeName(answer);
    const others = sourceNames.filter(n => normalizeName(n) !== answerKey);
    const pool = buildSyllablePool(others);
    const chosen = [];
    const usedKeys = new Set([answerKey]);
    const usedInitials = new Set([answer[0].toUpperCase()]);

    for (let attempt = 0; attempt < 600 && chosen.length < count; attempt++) {
        const fake = composeName(pool);
        if (!fake) continue;

        const key = normalizeName(fake);
        if (usedKeys.has(key) || REAL_NAMES.has(key)) continue;

        // Får inte likna det rätta svarets början - då ser det ut som en
        // felstavning i stället för ett eget namn
        if (key.slice(0, 3) === answerKey.slice(0, 3)) continue;

        // Olika begynnelsebokstav gör att de fyra alternativen ser
        // tydligt olika ut. Kravet släpps om det blir för svårt att uppfylla.
        const initial = fake[0].toUpperCase();
        if (attempt < 400 && usedInitials.has(initial)) continue;

        usedKeys.add(key);
        usedInitials.add(initial);
        chosen.push(fake);
    }

    // Nödutgång om kompositionen inte gav tillräckligt
    let n = 0;
    while (chosen.length < count) {
        const fallback = capitalize(pickRandom(pool) + pickRandom(pool) + 'ra'.repeat(++n));
        if (!REAL_NAMES.has(normalizeName(fallback))) chosen.push(fallback);
    }

    return chosen;
}

// Naruto-figurerna har för- och efternamn - då hittar vi på båda delarna
function makeFakeNarutoNames(answer, count) {
    const firstNames = NARUTO_CHARS.map(c => c.name.split(/\s+/)[0]);
    const lastNames = NARUTO_CHARS
        .map(c => c.name.split(/\s+/)[1])
        .filter(Boolean)
        .filter(word => /^[A-Za-z]+$/.test(word));

    const hasSurname = answer.split(/\s+/).length > 1;
    const fakeFirst = makeFakeNames(answer.split(/\s+/)[0], firstNames, count);

    if (!hasSurname || lastNames.length < 2) return fakeFirst;

    const fakeLast = makeFakeNames(answer.split(/\s+/)[1], lastNames, count);
    return fakeFirst.map((first, i) => first + ' ' + (fakeLast[i] || fakeLast[0]));
}

function buildQuestions() {
    const questions = [];
    const pokeNames = POKEMON_GEN1.map(p => p.name);

    POKEMON_GEN1.forEach(p => {
        questions.push({
            id: 'pokemon-' + p.id,
            category: 'Pokémon',
            question: 'Vad heter denna Pokémon?',
            image: 'img/pokemon/' + p.id + '.png',
            options: shuffleList([p.name, ...makeFakeNames(p.name, pokeNames, WRONG_OPTIONS)]),
            answer: p.name
        });
    });

    NARUTO_CHARS.forEach(c => {
        questions.push({
            id: 'naruto-' + c.id,
            category: 'Naruto',
            question: 'Vem är denna karaktär?',
            image: c.img,
            options: shuffleList([c.name, ...makeFakeNarutoNames(c.name, WRONG_OPTIONS)]),
            answer: c.name
        });
    });

    return questions;
}

const QUESTIONS = buildQuestions();
const CATEGORIES = ['Pokémon', 'Naruto'];
