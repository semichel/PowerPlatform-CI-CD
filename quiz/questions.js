// Combines all category question files into one QUESTIONS array
const QUESTIONS = [
    ...Q_GEOGRAFI,
    ...Q_VETENSKAP,
    ...Q_SPORT,
    ...Q_HISTORIA,
    ...Q_KULTUR,
    ...Q_SVERIGE,
    ...Q_SPEL,
    ...Q_ANIME,
    ...Q_FILMER,
    ...Q_SERIER,
    ...Q_MAT,
];

const CATEGORIES = [...new Set([...QUESTIONS.map(q => q.category), ...IMAGE_CATEGORIES])];
