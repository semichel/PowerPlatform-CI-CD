// Music module - "Gissa låten" using Deezer previews via SoundWarp proxy
const PROXY_BASE = 'https://soundwarp-api.semichel.workers.dev';

// Track database with verified Deezer IDs
const MUSIC_TRACKS = [
    // Pop
    { id: 568115892, title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Pop' },
    { id: 4603408, title: 'Billie Jean', artist: 'Michael Jackson', genre: 'Pop' },
    { id: 116348632, title: 'Hey Jude', artist: 'The Beatles', genre: 'Pop' },
    { id: 908604612, title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop' },
    { id: 1174602992, title: 'Rolling in the Deep', artist: 'Adele', genre: 'Pop' },
    { id: 139470659, title: 'Shape of You', artist: 'Ed Sheeran', genre: 'Pop' },
    { id: 701326562, title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop' },
    { id: 13693497, title: 'Smells Like Teen Spirit', artist: 'Nirvana', genre: 'Pop' },
    { id: 664507, title: 'Like a Prayer', artist: 'Madonna', genre: 'Pop' },
    { id: 119615552, title: 'Somebody That I Used To Know', artist: 'Gotye', genre: 'Pop' },
    { id: 426703682, title: 'Hotel California', artist: 'Eagles', genre: 'Pop' },
    { id: 538660022, title: "Livin' on a Prayer", artist: 'Bon Jovi', genre: 'Pop' },
    { id: 664107, title: 'Take On Me', artist: 'a-ha', genre: 'Pop' },
    { id: 734508762, title: 'Poker Face', artist: 'Lady Gaga', genre: 'Pop' },
    { id: 518458172, title: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: 'Pop' },
    { id: 625643, title: "Don't Stop Believin'", artist: 'Journey', genre: 'Pop' },
    { id: 739870792, title: 'Dance Monkey', artist: 'Tones and I', genre: 'Pop' },
    { id: 1124841682, title: 'Levitating', artist: 'Dua Lipa', genre: 'Pop' },
    { id: 655095912, title: 'bad guy', artist: 'Billie Eilish', genre: 'Pop' },
    { id: 2105158337, title: 'Flowers', artist: 'Miley Cyrus', genre: 'Pop' },

    // Svenska artister
    { id: 884025, title: 'Dancing Queen', artist: 'ABBA', genre: 'Svenska' },
    { id: 76376889, title: 'Waterloo', artist: 'ABBA', genre: 'Svenska' },
    { id: 884030, title: 'Mamma Mia', artist: 'ABBA', genre: 'Svenska' },
    { id: 884035, title: 'The Winner Takes It All', artist: 'ABBA', genre: 'Svenska' },
    { id: 14383880, title: 'Levels', artist: 'Avicii', genre: 'Svenska' },
    { id: 70266756, title: 'Wake Me Up', artist: 'Avicii', genre: 'Svenska' },
    { id: 858371, title: 'The Final Countdown', artist: 'Europe', genre: 'Svenska' },

    // Hip-Hop
    { id: 1109731, title: 'Lose Yourself', artist: 'Eminem', genre: 'Hip-Hop' },
    { id: 609244, title: 'Crazy in Love', artist: 'Beyonce', genre: 'Hip-Hop' },
    { id: 145429536, title: 'In Da Club', artist: '50 Cent', genre: 'Hip-Hop' },
    { id: 61424045, title: 'Thrift Shop', artist: 'Macklemore', genre: 'Hip-Hop' },
    { id: 536421002, title: 'SICKO MODE', artist: 'Travis Scott', genre: 'Hip-Hop' },
    { id: 533609232, title: "God's Plan", artist: 'Drake', genre: 'Hip-Hop' },
    { id: 630827242, title: 'Stronger', artist: 'Kanye West', genre: 'Hip-Hop' },
    { id: 2793753, title: 'Juicy', artist: 'The Notorious B.I.G.', genre: 'Hip-Hop' },
    { id: 1584416372, title: "Gangsta's Paradise", artist: 'Coolio', genre: 'Hip-Hop' },
    { id: 87960517, title: 'California Love', artist: '2Pac', genre: 'Hip-Hop' },

    // EDM
    { id: 62847142, title: 'Titanium', artist: 'David Guetta ft. Sia', genre: 'EDM' },
    { id: 11390027, title: 'Sandstorm', artist: 'Darude', genre: 'EDM' },
    { id: 140295501, title: 'Faded', artist: 'Alan Walker', genre: 'EDM' },
    { id: 89629797, title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', genre: 'EDM' },
    { id: 2102633427, title: 'Animals', artist: 'Martin Garrix', genre: 'EDM' },
    { id: 3129775, title: 'Around the World', artist: 'Daft Punk', genre: 'EDM' },
    { id: 3135556, title: 'Harder Better Faster Stronger', artist: 'Daft Punk', genre: 'EDM' },
    { id: 90726629, title: 'Firestone', artist: 'Kygo', genre: 'EDM' },
    { id: 60904700, title: 'Clarity', artist: 'Zedd', genre: 'EDM' },

    // Film & TV
    { id: 14552280, title: 'My Heart Will Go On', artist: 'Celine Dion', genre: 'Film & TV' },
    { id: 561856742, title: 'Shallow', artist: 'Lady Gaga & Bradley Cooper', genre: 'Film & TV' },
    { id: 576431, title: 'Eye of the Tiger', artist: 'Survivor', genre: 'Film & TV' },
    { id: 139138743, title: "Stayin' Alive", artist: 'Bee Gees', genre: 'Film & TV' },
    { id: 72371930, title: 'Let It Go', artist: 'Idina Menzel', genre: 'Film & TV' },
    { id: 136340808, title: "How Far I'll Go", artist: "Auli'i Cravalho", genre: 'Film & TV' },
    { id: 95813354, title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', genre: 'Film & TV' },
];

const MUSIC_GENRES = [...new Set(MUSIC_TRACKS.map(t => t.genre))];

// Audio state
let audioCtx = null;
let currentAudioSource = null;
let currentAudioBuffer = null;
let audioPlaying = false;
let audioProgressInterval = null;
let audioStartTime = 0;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

async function fetchDeezerPreview(trackId) {
    // Find track info from our local DB to search by name
    const trackInfo = MUSIC_TRACKS.find(t => t.id === trackId);
    if (!trackInfo) {
        Logger.log('ERROR', `Track ${trackId} inte hittad i databasen`);
        return null;
    }

    const searchQuery = `${trackInfo.artist} ${trackInfo.title}`;
    Logger.log('GAME', `Söker preview för: ${searchQuery}`);

    try {
        // Step 1: Search via proxy (same as SoundWarp) - try iTunes first, then Deezer
        let previewUrl = null;

        // iTunes (usually has previews, good quality)
        try {
            const itunesResp = await fetch(`${PROXY_BASE}/api/itunes/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=3`);
            if (itunesResp.ok) {
                const itunesData = await itunesResp.json();
                const match = (itunesData.results || []).find(t => t.previewUrl);
                if (match) {
                    previewUrl = match.previewUrl;
                    Logger.log('GAME', `iTunes match: ${match.trackName} - ${match.artistName}`);
                }
            }
        } catch (e) {
            Logger.log('GAME', 'iTunes sökning misslyckades, provar Deezer...');
        }

        // Deezer fallback
        if (!previewUrl) {
            const deezerResp = await fetch(`${PROXY_BASE}/api/deezer/search?q=${encodeURIComponent(searchQuery)}&limit=3`);
            if (deezerResp.ok) {
                const deezerData = await deezerResp.json();
                const match = (deezerData.data || []).find(t => t.preview);
                if (match) {
                    previewUrl = match.preview;
                    Logger.log('GAME', `Deezer match: ${match.title} - ${match.artist.name}`);
                }
            }
        }

        if (!previewUrl) throw new Error('Ingen preview hittades');

        // Step 2: Fetch audio through proxy (handles CORS)
        const audioResp = await fetch(`${PROXY_BASE}/api/preview?url=${encodeURIComponent(previewUrl)}`);
        if (!audioResp.ok) throw new Error(`Proxy error: ${audioResp.status}`);

        const arrayBuffer = await audioResp.arrayBuffer();
        if (arrayBuffer.byteLength === 0) throw new Error('Tomt ljud');

        Logger.log('GAME', `Ljud hämtat: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);

        const ctx = getAudioContext();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
        Logger.log('ERROR', `Kunde inte hämta ljud för "${trackInfo.title}": ${err.message}`);
        return null;
    }
}

function playAudioBuffer(buffer) {
    stopAudioPlayback();
    const ctx = getAudioContext();
    currentAudioSource = ctx.createBufferSource();
    currentAudioSource.buffer = buffer;
    currentAudioSource.connect(ctx.destination);
    currentAudioSource.start();
    audioPlaying = true;
    audioStartTime = ctx.currentTime;

    currentAudioSource.onended = () => {
        audioPlaying = false;
        updatePlayButton();
        clearInterval(audioProgressInterval);
    };

    updatePlayButton();
    startProgressTracking(buffer.duration);
}

function stopAudioPlayback() {
    if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch (e) { /* already stopped */ }
        currentAudioSource = null;
    }
    audioPlaying = false;
    clearInterval(audioProgressInterval);
}

function toggleAudioPlayback() {
    if (audioPlaying) {
        stopAudioPlayback();
        updatePlayButton();
    } else if (currentAudioBuffer) {
        playAudioBuffer(currentAudioBuffer);
    }
}

function updatePlayButton() {
    const btn = document.getElementById('play-btn');
    if (!btn) return;
    btn.innerHTML = audioPlaying ? '&#9646;&#9646; Pausa' : '&#9654; Spela';
}

function startProgressTracking(duration) {
    const bar = document.getElementById('audio-progress-bar');
    if (!bar) return;
    clearInterval(audioProgressInterval);
    audioProgressInterval = setInterval(() => {
        if (!audioPlaying || !audioCtx) {
            clearInterval(audioProgressInterval);
            return;
        }
        const elapsed = audioCtx.currentTime - audioStartTime;
        const pct = Math.min((elapsed / duration) * 100, 100);
        bar.style.width = pct + '%';
    }, 50);
}

// Generate a music question from the track DB
function generateMusicQuestion(correctTrack, allTracks) {
    // Pick 3 wrong answers from same genre if possible, otherwise random
    const sameGenre = allTracks.filter(t => t.genre === correctTrack.genre && t.id !== correctTrack.id);
    const others = allTracks.filter(t => t.id !== correctTrack.id);
    const pool = sameGenre.length >= 3 ? sameGenre : others;
    const shuffled = shuffleArray(pool);
    const wrongAnswers = shuffled.slice(0, 3).map(t => `${t.title} - ${t.artist}`);
    const correctAnswer = `${correctTrack.title} - ${correctTrack.artist}`;

    return {
        category: 'Musik',
        question: 'Vilken låt spelas?',
        options: [correctAnswer, ...wrongAnswers],
        answer: correctAnswer,
        trackId: correctTrack.id,
        isMusic: true
    };
}

// Generate N music questions
function generateMusicQuestions(count) {
    const shuffled = shuffleArray(MUSIC_TRACKS);
    const selected = shuffled.slice(0, count);
    return selected.map(track => generateMusicQuestion(track, MUSIC_TRACKS));
}
