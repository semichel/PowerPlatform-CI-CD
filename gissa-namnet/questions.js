// Bygger frågor från karaktärsdatan i characters.js
// Varje fråga visar en bild och sex namnalternativ. De fem felaktiga är
// felstavningar av det rätta namnet - aldrig namn på andra figurer.
// Nidorina får alltså sällskap av Nidorena, Nidorona, Nidirina och så vidare.

const WRONG_OPTIONS = 5; // fem felstavningar + rätt svar = sex alternativ

const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y'];

// Konsonanter som lätt förväxlas när man stavar
const CONSONANT_SWAPS = {
    b: ['p'], p: ['b'], d: ['t'], t: ['d'], g: ['k', 'j'], k: ['c', 'g'],
    c: ['k', 's'], s: ['z', 'c'], z: ['s'], v: ['w', 'f'], w: ['v'],
    f: ['v'], m: ['n'], n: ['m'], r: ['l'], l: ['r'], j: ['g'], h: ['k']
};

function normalizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const isLetter = ch => /[a-zA-Z]/.test(ch);

// Alla riktiga namn - en felstavning får aldrig råka bli en annan figur
function buildRealNameSet() {
    const set = new Set();
    POKEMON_GEN1.forEach(p => set.add(normalizeName(p.name)));
    NARUTO_CHARS.forEach(c => set.add(normalizeName(c.name)));
    return set;
}

const REAL_NAMES = buildRealNameSet();

// Skapar rimliga felstavningar av ett namn.
// Första bokstaven lämnas i fred så att namnet fortfarande ser rätt ut.
// Lägre siffra = svårare att upptäcka. En utbytt bokstav är mycket
// lurigare än en dubblerad, som syns direkt på ordets längd.
const SUBTLETY = { substitution: 0, transposition: 1, doubling: 2, deletion: 2 };

function generateMisspellings(name) {
    const variants = [];
    let position = 0;
    const push = (value, kind) => {
        if (value && value.length > 2) variants.push({ value, kind, position });
    };

    for (let i = 1; i < name.length; i++) {
        const ch = name[i];
        if (!isLetter(ch)) continue;
        // Rör inte bokstaven som inleder ett ord - "Mr. ime" ser trasigt ut,
        // inte felstavat
        if (!isLetter(name[i - 1])) continue;

        const before = name.slice(0, i);
        const after = name.slice(i + 1);
        const lower = ch.toLowerCase();
        position = i;

        // Byt ut en vokal mot en annan: Nidorina -> Nidorena
        if (VOWELS.includes(lower)) {
            VOWELS.forEach(v => {
                if (v !== lower) push(before + v + after, 'substitution');
            });
        }

        // Dubblera en bokstav: Nidorina -> Nidorinna
        push(before + ch + ch + after, 'doubling');

        // Ta bort en bokstav: Nidorina -> Nidorna
        if (name.length > 4) push(before + after, 'deletion');

        // Kasta om två bokstäver: Nidorina -> Nidorian
        if (i + 1 < name.length && isLetter(name[i + 1]) && name[i + 1].toLowerCase() !== lower) {
            push(before + name[i + 1] + ch + name.slice(i + 2), 'transposition');
        }

        // Byt mot en konsonant som låter likt: Pidgey -> Bidgey
        (CONSONANT_SWAPS[lower] || []).forEach(swap => {
            push(before + swap + after, 'substitution');
        });
    }

    // Rensa bort dubbletter, det rätta namnet och allt som är ett riktigt namn
    const correct = normalizeName(name);
    const seen = new Set();
    const unique = variants.filter(variant => {
        const key = normalizeName(variant.value);
        if (key === correct || REAL_NAMES.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Subtilaste varianterna först
    return unique.sort((a, b) => SUBTLETY[a.kind] - SUBTLETY[b.kind]);
}

function shuffleOptions(list) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function pickMisspelledOptions(name, count) {
    // Lotta ur de subtilaste, men ta ett större urval än vi behöver så att
    // samma figur inte visar identiska alternativ varje gång
    const pool = shuffleOptions(generateMisspellings(name).slice(0, Math.max(count * 3, 14)));
    const chosen = [];
    const usedPositions = new Set();

    // Först en variant per position, så att felen sprids över hela namnet
    // i stället för att alla ändrar samma bokstav
    pool.forEach(variant => {
        if (chosen.length < count && !usedPositions.has(variant.position)) {
            usedPositions.add(variant.position);
            chosen.push(variant.value);
        }
    });

    // Fyll på med resten om positionerna inte räckte
    pool.forEach(variant => {
        if (chosen.length < count && !chosen.includes(variant.value)) {
            chosen.push(variant.value);
        }
    });

    // Nödutgång för namn som är för korta för att varieras tillräckligt
    let suffix = 0;
    while (chosen.length < count) {
        chosen.push(name + 'a'.repeat(++suffix));
    }

    return chosen;
}

function buildQuestions() {
    const questions = [];

    POKEMON_GEN1.forEach(p => {
        questions.push({
            id: 'pokemon-' + p.id,
            category: 'Pokémon',
            question: 'Vad heter denna Pokémon?',
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + p.id + '.png',
            options: [p.name, ...pickMisspelledOptions(p.name, WRONG_OPTIONS)],
            answer: p.name
        });
    });

    NARUTO_CHARS.forEach(c => {
        questions.push({
            id: 'naruto-' + c.id,
            category: 'Naruto',
            question: 'Vem är denna karaktär?',
            image: c.img,
            options: [c.name, ...pickMisspelledOptions(c.name, WRONG_OPTIONS)],
            answer: c.name
        });
    });

    return questions;
}

const QUESTIONS = buildQuestions();
const CATEGORIES = ['Pokémon', 'Naruto'];
