// Music module - "Gissa låten" using Deezer previews via SoundWarp proxy
const PROXY_BASE = 'https://soundwarp-api.semichel.workers.dev';

// Track database with Deezer IDs
const MUSIC_TRACKS = [
    // Pop
    { id: 916424, title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Pop' },
    { id: 1109731, title: 'Billie Jean', artist: 'Michael Jackson', genre: 'Pop' },
    { id: 3135556, title: 'Hey Jude', artist: 'The Beatles', genre: 'Pop' },
    { id: 1562814232, title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop' },
    { id: 2306435, title: 'Rolling in the Deep', artist: 'Adele', genre: 'Pop' },
    { id: 428988612, title: 'Shape of You', artist: 'Ed Sheeran', genre: 'Pop' },
    { id: 67238735, title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop' },
    { id: 424471, title: 'Smells Like Teen Spirit', artist: 'Nirvana', genre: 'Pop' },
    { id: 1152625, title: 'Like a Prayer', artist: 'Madonna', genre: 'Pop' },
    { id: 75680070, title: 'Somebody That I Used To Know', artist: 'Gotye', genre: 'Pop' },
    { id: 3157028, title: 'Hotel California', artist: 'Eagles', genre: 'Pop' },
    { id: 540938, title: 'Livin\' on a Prayer', artist: 'Bon Jovi', genre: 'Pop' },
    { id: 2279605, title: 'Take On Me', artist: 'a-ha', genre: 'Pop' },
    { id: 13788816, title: 'Poker Face', artist: 'Lady Gaga', genre: 'Pop' },
    { id: 637728, title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', genre: 'Pop' },
    { id: 917265, title: 'Don\'t Stop Believin\'', artist: 'Journey', genre: 'Pop' },
    { id: 466858622, title: 'Dance Monkey', artist: 'Tones and I', genre: 'Pop' },
    { id: 1238498052, title: 'Levitating', artist: 'Dua Lipa', genre: 'Pop' },
    { id: 476389672, title: 'bad guy', artist: 'Billie Eilish', genre: 'Pop' },
    { id: 2482195985, title: 'Flowers', artist: 'Miley Cyrus', genre: 'Pop' },

    // Svenska artister
    { id: 889850, title: 'Dancing Queen', artist: 'ABBA', genre: 'Svenska' },
    { id: 889842, title: 'Waterloo', artist: 'ABBA', genre: 'Svenska' },
    { id: 889838, title: 'Mamma Mia', artist: 'ABBA', genre: 'Svenska' },
    { id: 889848, title: 'The Winner Takes It All', artist: 'ABBA', genre: 'Svenska' },
    { id: 67364399, title: 'The Fox (What Does The Fox Say?)', artist: 'Ylvis', genre: 'Svenska' },
    { id: 14606498, title: 'Levels', artist: 'Avicii', genre: 'Svenska' },
    { id: 77457088, title: 'Wake Me Up', artist: 'Avicii', genre: 'Svenska' },
    { id: 910992, title: 'The Final Countdown', artist: 'Europe', genre: 'Svenska' },
    { id: 7339587, title: 'Scary Monsters and Nice Sprites', artist: 'Skrillex', genre: 'Svenska' },
    { id: 137813023, title: 'Lean On', artist: 'Major Lazer & DJ Snake', genre: 'Pop' },

    // Hip-Hop
    { id: 1109977, title: 'Lose Yourself', artist: 'Eminem', genre: 'Hip-Hop' },
    { id: 916414, title: 'Crazy in Love', artist: 'Beyoncé', genre: 'Hip-Hop' },
    { id: 2286664, title: 'In Da Club', artist: '50 Cent', genre: 'Hip-Hop' },
    { id: 66932046, title: 'Thrift Shop', artist: 'Macklemore', genre: 'Hip-Hop' },
    { id: 1283498782, title: 'SICKO MODE', artist: 'Travis Scott', genre: 'Hip-Hop' },
    { id: 561393872, title: 'God\'s Plan', artist: 'Drake', genre: 'Hip-Hop' },
    { id: 14882802, title: 'Stronger', artist: 'Kanye West', genre: 'Hip-Hop' },
    { id: 655577, title: 'Juicy', artist: 'The Notorious B.I.G.', genre: 'Hip-Hop' },
    { id: 915654, title: 'Gangsta\'s Paradise', artist: 'Coolio', genre: 'Hip-Hop' },
    { id: 1199023, title: 'California Love', artist: '2Pac', genre: 'Hip-Hop' },

    // EDM
    { id: 3604590, title: 'Titanium', artist: 'David Guetta ft. Sia', genre: 'EDM' },
    { id: 3135953, title: 'Sandstorm', artist: 'Darude', genre: 'EDM' },
    { id: 6284992, title: 'Scary Monsters and Nice Sprites', artist: 'Skrillex', genre: 'EDM' },
    { id: 116284382, title: 'Faded', artist: 'Alan Walker', genre: 'EDM' },
    { id: 917170, title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', genre: 'EDM' },
    { id: 68325564, title: 'Animals', artist: 'Martin Garrix', genre: 'EDM' },
    { id: 2482165, title: 'Around the World', artist: 'Daft Punk', genre: 'EDM' },
    { id: 14882610, title: 'Harder Better Faster Stronger', artist: 'Daft Punk', genre: 'EDM' },
    { id: 79828694, title: 'Firestone', artist: 'Kygo', genre: 'EDM' },
    { id: 14413860, title: 'Clarity', artist: 'Zedd', genre: 'EDM' },

    // Film & TV
    { id: 576375, title: 'My Heart Will Go On', artist: 'Celine Dion', genre: 'Film & TV' },
    { id: 562816112, title: 'Shallow', artist: 'Lady Gaga & Bradley Cooper', genre: 'Film & TV' },
    { id: 1040868, title: 'Eye of the Tiger', artist: 'Survivor', genre: 'Film & TV' },
    { id: 924793, title: 'Stayin\' Alive', artist: 'Bee Gees', genre: 'Film & TV' },
    { id: 66169812, title: 'Let It Go', artist: 'Idina Menzel', genre: 'Film & TV' },
    { id: 130025042, title: 'How Far I\'ll Go', artist: 'Auli\'i Cravalho', genre: 'Film & TV' },
    { id: 916420, title: 'I Will Always Love You', artist: 'Whitney Houston', genre: 'Film & TV' },
    { id: 86702036, title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', genre: 'Film & TV' },
    { id: 915652, title: 'Gangsta\'s Paradise', artist: 'Coolio', genre: 'Film & TV' },
    { id: 3165538, title: 'Gonna Fly Now (Rocky)', artist: 'Bill Conti', genre: 'Film & TV' },
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
    const previewUrl = `https://cdns-preview-d.dzcdn.net/stream/c-${trackId}`;
    // Try direct Deezer preview URL pattern first, then proxy
    const proxyUrl = `${PROXY_BASE}/proxy?url=${encodeURIComponent(`https://api.deezer.com/track/${trackId}`)}`;

    try {
        // Get track info to find preview URL
        const infoResp = await fetch(proxyUrl);
        if (!infoResp.ok) throw new Error('Failed to fetch track info');
        const trackInfo = await infoResp.json();

        if (!trackInfo.preview) throw new Error('No preview URL');

        // Fetch the actual audio through proxy
        const audioProxyUrl = `${PROXY_BASE}/proxy?url=${encodeURIComponent(trackInfo.preview)}`;
        const audioResp = await fetch(audioProxyUrl);
        if (!audioResp.ok) throw new Error('Failed to fetch audio');

        const arrayBuffer = await audioResp.arrayBuffer();
        if (arrayBuffer.byteLength === 0) throw new Error('Empty audio');

        const ctx = getAudioContext();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
        Logger.log('ERROR', `Kunde inte hämta ljud för track ${trackId}: ${err.message}`);
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
