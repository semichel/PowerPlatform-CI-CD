// Bygger frågor från karaktärsdatan i characters.js
// Varje fråga visar en bild och fyra namnalternativ - ett rätt och tre slumpade fel

function pickWrongOptions(correctName, pool, count) {
    const others = pool.filter(n => n !== correctName);
    const wrong = [];
    while (wrong.length < count && others.length > 0) {
        const i = Math.floor(Math.random() * others.length);
        wrong.push(others.splice(i, 1)[0]);
    }
    return wrong;
}

function buildQuestions() {
    const questions = [];

    const pokeNames = POKEMON_101.map(p => p.name);
    POKEMON_101.forEach(p => {
        questions.push({
            id: 'pokemon-' + p.id,
            category: 'Pokémon',
            question: 'Vad heter denna Pokémon?',
            image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + p.id + '.png',
            options: [p.name, ...pickWrongOptions(p.name, pokeNames, 3)],
            answer: p.name
        });
    });

    const narutoNames = NARUTO_CHARS.map(c => c.name);
    NARUTO_CHARS.forEach(c => {
        questions.push({
            id: 'naruto-' + c.id,
            category: 'Naruto',
            question: 'Vem är denna karaktär?',
            image: c.img,
            options: [c.name, ...pickWrongOptions(c.name, narutoNames, 3)],
            answer: c.name
        });
    });

    return questions;
}

const QUESTIONS = buildQuestions();
const CATEGORIES = ['Pokémon', 'Naruto'];
