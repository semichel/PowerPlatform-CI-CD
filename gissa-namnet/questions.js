// Bygger frågor från karaktärsdatan i characters.js
// Varje fråga visar en bild och fyra namnalternativ - ett rätt och tre fel.
// Felalternativen väljs bland de namn som liknar det rätta mest, så att
// gissningarna blir rimliga (Pikachu/Raichu, Sasuke Uchiha/Itachi Uchiha)
// istället för slumpade och uppenbart fel.

const SIMILAR_POOL_SIZE = 7; // hur många liknande namn vi lottar de tre felen ur

function normalizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Sørensen-Dice på teckenpar: hur mycket två namn överlappar
function diceCoefficient(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const pairs = new Map();
    for (let i = 0; i < a.length - 1; i++) {
        const pair = a.slice(i, i + 2);
        pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }

    let hits = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const pair = b.slice(i, i + 2);
        const count = pairs.get(pair) || 0;
        if (count > 0) {
            pairs.set(pair, count - 1);
            hits++;
        }
    }

    return (2 * hits) / (a.length - 1 + b.length - 1);
}

function sharedPrefixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
}

function sharedSuffixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
}

// Högre poäng = namnen liknar varandra mer.
// Ändelser väger tyngst: -saur, -chu, -eon hos Pokémon och efternamn som
// Uchiha eller Hyuga hos Naruto gör alternativen riktigt lurendrejande.
function nameSimilarity(nameA, nameB) {
    const a = normalizeName(nameA);
    const b = normalizeName(nameB);
    const longest = Math.max(a.length, b.length);
    if (longest === 0) return 0;

    return diceCoefficient(a, b)
        + 0.6 * (sharedSuffixLength(a, b) / longest)
        + 0.35 * (sharedPrefixLength(a, b) / longest);
}

// Pokémon som ligger nära varandra i pokédexen hör oftast ihop - samma
// utvecklingskedja eller samma sorts figur. Det gör dem till bra fällor
// även när namnen inte alls liknar varandra (Eevee/Vaporeon, Mewtwo/Mew).
function dexProximityBonus(idA, idB) {
    if (typeof idA !== 'number' || typeof idB !== 'number') return 0;
    const distance = Math.abs(idA - idB);
    if (distance === 0) return 0;
    if (distance <= 2) return 0.7;
    if (distance <= 4) return 0.35;
    return 0;
}

function pickSimilarWrongOptions(correct, pool, count) {
    const ranked = pool
        .filter(entry => entry.name !== correct.name)
        .map(entry => ({
            name: entry.name,
            score: nameSimilarity(correct.name, entry.name)
                + dexProximityBonus(correct.id, entry.id)
        }))
        .sort((x, y) => y.score - x.score);

    // Lotta ur de mest lika så att samma figur inte får identiska
    // alternativ varje gång man spelar
    const candidates = ranked.slice(0, Math.max(count, SIMILAR_POOL_SIZE)).map(r => r.name);

    const chosen = [];
    while (chosen.length < count && candidates.length > 0) {
        const i = Math.floor(Math.random() * candidates.length);
        chosen.push(candidates.splice(i, 1)[0]);
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
            options: [p.name, ...pickSimilarWrongOptions(p, POKEMON_GEN1, 3)],
            answer: p.name
        });
    });

    NARUTO_CHARS.forEach(c => {
        questions.push({
            id: 'naruto-' + c.id,
            category: 'Naruto',
            question: 'Vem är denna karaktär?',
            image: c.img,
            options: [c.name, ...pickSimilarWrongOptions(c, NARUTO_CHARS, 3)],
            answer: c.name
        });
    });

    return questions;
}

const QUESTIONS = buildQuestions();
const CATEGORIES = ['Pokémon', 'Naruto'];
