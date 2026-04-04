// Music module - "Gissa låten" using Deezer previews via SoundWarp proxy
const PROXY_BASE = 'https://soundwarp-api.semichel.workers.dev';

// Track database - each track belongs to a quiz category
// genre is kept for generating tricky wrong answers (same genre = harder)
const MUSIC_TRACKS = [
    // === Kultur (pop, hip-hop, edm - allmän musik) ===
    { id: 568115892, title: 'Bohemian Rhapsody', artist: 'Queen', category: 'Kultur', genre: 'Pop' },
    { id: 4603408, title: 'Billie Jean', artist: 'Michael Jackson', category: 'Kultur', genre: 'Pop' },
    { id: 116348632, title: 'Hey Jude', artist: 'The Beatles', category: 'Kultur', genre: 'Pop' },
    { id: 908604612, title: 'Blinding Lights', artist: 'The Weeknd', category: 'Kultur', genre: 'Pop' },
    { id: 1174602992, title: 'Rolling in the Deep', artist: 'Adele', category: 'Kultur', genre: 'Pop' },
    { id: 139470659, title: 'Shape of You', artist: 'Ed Sheeran', category: 'Kultur', genre: 'Pop' },
    { id: 701326562, title: 'Happy', artist: 'Pharrell Williams', category: 'Kultur', genre: 'Pop' },
    { id: 13693497, title: 'Smells Like Teen Spirit', artist: 'Nirvana', category: 'Kultur', genre: 'Pop' },
    { id: 664507, title: 'Like a Prayer', artist: 'Madonna', category: 'Kultur', genre: 'Pop' },
    { id: 119615552, title: 'Somebody That I Used To Know', artist: 'Gotye', category: 'Kultur', genre: 'Pop' },
    { id: 426703682, title: 'Hotel California', artist: 'Eagles', category: 'Kultur', genre: 'Pop' },
    { id: 538660022, title: "Livin' on a Prayer", artist: 'Bon Jovi', category: 'Kultur', genre: 'Pop' },
    { id: 664107, title: 'Take On Me', artist: 'a-ha', category: 'Kultur', genre: 'Pop' },
    { id: 734508762, title: 'Poker Face', artist: 'Lady Gaga', category: 'Kultur', genre: 'Pop' },
    { id: 518458172, title: "Sweet Child O' Mine", artist: "Guns N' Roses", category: 'Kultur', genre: 'Pop' },
    { id: 625643, title: "Don't Stop Believin'", artist: 'Journey', category: 'Kultur', genre: 'Pop' },
    { id: 739870792, title: 'Dance Monkey', artist: 'Tones and I', category: 'Kultur', genre: 'Pop' },
    { id: 1124841682, title: 'Levitating', artist: 'Dua Lipa', category: 'Kultur', genre: 'Pop' },
    { id: 655095912, title: 'bad guy', artist: 'Billie Eilish', category: 'Kultur', genre: 'Pop' },
    { id: 2105158337, title: 'Flowers', artist: 'Miley Cyrus', category: 'Kultur', genre: 'Pop' },
    { id: 1109731, title: 'Lose Yourself', artist: 'Eminem', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 609244, title: 'Crazy in Love', artist: 'Beyonce', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 145429536, title: 'In Da Club', artist: '50 Cent', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 61424045, title: 'Thrift Shop', artist: 'Macklemore', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 536421002, title: 'SICKO MODE', artist: 'Travis Scott', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 533609232, title: "God's Plan", artist: 'Drake', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 630827242, title: 'Stronger', artist: 'Kanye West', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 2793753, title: 'Juicy', artist: 'The Notorious B.I.G.', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 1584416372, title: "Gangsta's Paradise", artist: 'Coolio', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 87960517, title: 'California Love', artist: '2Pac', category: 'Kultur', genre: 'Hip-Hop' },
    { id: 62847142, title: 'Titanium', artist: 'David Guetta ft. Sia', category: 'Kultur', genre: 'EDM' },
    { id: 11390027, title: 'Sandstorm', artist: 'Darude', category: 'Kultur', genre: 'EDM' },
    { id: 140295501, title: 'Faded', artist: 'Alan Walker', category: 'Kultur', genre: 'EDM' },
    { id: 89629797, title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', category: 'Kultur', genre: 'EDM' },
    { id: 2102633427, title: 'Animals', artist: 'Martin Garrix', category: 'Kultur', genre: 'EDM' },
    { id: 3129775, title: 'Around the World', artist: 'Daft Punk', category: 'Kultur', genre: 'EDM' },
    { id: 3135556, title: 'Harder Better Faster Stronger', artist: 'Daft Punk', category: 'Kultur', genre: 'EDM' },
    { id: 90726629, title: 'Firestone', artist: 'Kygo', category: 'Kultur', genre: 'EDM' },
    { id: 60904700, title: 'Clarity', artist: 'Zedd', category: 'Kultur', genre: 'EDM' },

    // === Sverige ===
    { id: 884025, title: 'Dancing Queen', artist: 'ABBA', category: 'Sverige', genre: 'Svenska' },
    { id: 76376889, title: 'Waterloo', artist: 'ABBA', category: 'Sverige', genre: 'Svenska' },
    { id: 884030, title: 'Mamma Mia', artist: 'ABBA', category: 'Sverige', genre: 'Svenska' },
    { id: 884035, title: 'The Winner Takes It All', artist: 'ABBA', category: 'Sverige', genre: 'Svenska' },
    { id: 14383880, title: 'Levels', artist: 'Avicii', category: 'Sverige', genre: 'Svenska' },
    { id: 70266756, title: 'Wake Me Up', artist: 'Avicii', category: 'Sverige', genre: 'Svenska' },
    { id: 858371, title: 'The Final Countdown', artist: 'Europe', category: 'Sverige', genre: 'Svenska' },

    // === Filmer ===
    { id: 14552280, title: 'My Heart Will Go On', artist: 'Celine Dion', category: 'Filmer', genre: 'Soundtrack' },
    { id: 561856742, title: 'Shallow', artist: 'Lady Gaga & Bradley Cooper', category: 'Filmer', genre: 'Soundtrack' },
    { id: 72371930, title: 'Let It Go', artist: 'Idina Menzel', category: 'Filmer', genre: 'Soundtrack' },
    { id: 136340808, title: "How Far I'll Go", artist: "Auli'i Cravalho", category: 'Filmer', genre: 'Soundtrack' },
    { id: 95813354, title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', category: 'Filmer', genre: 'Soundtrack' },
    { id: 139138743, title: "Stayin' Alive", artist: 'Bee Gees', category: 'Filmer', genre: 'Soundtrack' },

    // === Serier ===
    { id: 3613070, title: "I'll Be There for You", artist: 'The Rembrandts', category: 'Serier', genre: 'TV' },
    { id: 67440765, title: 'Woke Up This Morning', artist: 'Alabama 3', category: 'Serier', genre: 'TV' },
    { id: 15417862, title: 'California', artist: 'Phantom Planet', category: 'Serier', genre: 'TV' },
    { id: 1562814, title: "I Don't Want to Miss a Thing", artist: 'Aerosmith', category: 'Serier', genre: 'TV' },
    { id: 916424, title: 'My Way', artist: 'Frank Sinatra', category: 'Serier', genre: 'TV' },

    // === Sport ===
    { id: 576431, title: 'Eye of the Tiger', artist: 'Survivor', category: 'Sport', genre: 'Sport' },
    { id: 12075, title: 'We Will Rock You', artist: 'Queen', category: 'Sport', genre: 'Sport' },
    { id: 1171164, title: 'Thunderstruck', artist: 'AC/DC', category: 'Sport', genre: 'Sport' },
    { id: 727824, title: 'Seven Nation Army', artist: 'The White Stripes', category: 'Sport', genre: 'Sport' },
    { id: 12080, title: 'We Are the Champions', artist: 'Queen', category: 'Sport', genre: 'Sport' },
    { id: 3604843, title: "Wavin' Flag", artist: "K'naan", category: 'Sport', genre: 'Sport' },
    { id: 916072, title: 'Born to Run', artist: 'Bruce Springsteen', category: 'Sport', genre: 'Sport' },

    // === Spel ===
    { id: 95064670, title: 'Megalovania', artist: 'Toby Fox', category: 'Spel', genre: 'Game' },
    { id: 129338192, title: 'Sweden', artist: 'C418', category: 'Spel', genre: 'Game' },
    { id: 4362498, title: 'Still Alive', artist: 'Jonathan Coulton', category: 'Spel', genre: 'Game' },
    { id: 71570764, title: 'Dragonborn', artist: 'Jeremy Soule', category: 'Spel', genre: 'Game' },
    { id: 548936301, title: 'Jump Up, Super Star!', artist: 'Kate Davis', category: 'Spel', genre: 'Game' },

    // === Anime ===
    { id: 73248888, title: 'A Cruel Angel\'s Thesis', artist: 'Yoko Takahashi', category: 'Anime', genre: 'Anime' },
    { id: 107448062, title: 'Unravel', artist: 'TK from Ling Tosite Sigure', category: 'Anime', genre: 'Anime' },
    { id: 810786472, title: 'Gurenge', artist: 'LiSA', category: 'Anime', genre: 'Anime' },
    { id: 4259671, title: 'Blue Bird', artist: 'Ikimono-gakari', category: 'Anime', genre: 'Anime' },
    { id: 1643498142, title: 'The Rumbling', artist: 'SiM', category: 'Anime', genre: 'Anime' },
    { id: 4368498, title: 'Cha-La Head-Cha-La', artist: 'Hironobu Kageyama', category: 'Anime', genre: 'Anime' },
];

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

// Generate tricky wrong answers
function generateTrickyOptions(correctTrack, allTracks) {
    const correctAnswer = `${correctTrack.title} - ${correctTrack.artist}`;
    const wrongSet = new Set();

    // 1. Right song, wrong artist (very tricky)
    const otherArtists = allTracks.filter(t => t.artist !== correctTrack.artist);
    const shuffledArtists = shuffleArray(otherArtists);
    if (shuffledArtists.length > 0) {
        wrongSet.add(`${correctTrack.title} - ${shuffledArtists[0].artist}`);
    }
    if (shuffledArtists.length > 1) {
        wrongSet.add(`${correctTrack.title} - ${shuffledArtists[1].artist}`);
    }

    // 2. Right artist, wrong song (tricky)
    const sameArtist = allTracks.filter(t => t.artist === correctTrack.artist && t.id !== correctTrack.id);
    if (sameArtist.length > 0) {
        wrongSet.add(`${sameArtist[0].title} - ${correctTrack.artist}`);
    }
    const otherSongs = allTracks.filter(t => t.id !== correctTrack.id);
    const shuffledSongs = shuffleArray(otherSongs);
    for (const t of shuffledSongs) {
        if (wrongSet.size >= 3) break;
        const fake = `${t.title} - ${correctTrack.artist}`;
        if (fake !== correctAnswer) wrongSet.add(fake);
    }

    // 3. Same genre, normal wrong answers
    const sameGenre = shuffleArray(allTracks.filter(t => t.genre === correctTrack.genre && t.id !== correctTrack.id));
    for (const t of sameGenre) {
        if (wrongSet.size >= 5) break;
        const opt = `${t.title} - ${t.artist}`;
        if (opt !== correctAnswer) wrongSet.add(opt);
    }

    // 4. Fill remaining with random tracks
    const allOthers = shuffleArray(allTracks.filter(t => t.id !== correctTrack.id));
    for (const t of allOthers) {
        if (wrongSet.size >= 7) break;
        const opt = `${t.title} - ${t.artist}`;
        if (opt !== correctAnswer) wrongSet.add(opt);
    }

    return [...wrongSet].slice(0, 7);
}

// Generate a music question from the track DB
function generateMusicQuestion(correctTrack, allTracks) {
    const correctAnswer = `${correctTrack.title} - ${correctTrack.artist}`;
    const wrongAnswers = generateTrickyOptions(correctTrack, allTracks);

    return {
        category: correctTrack.category,
        question: 'Vilken låt spelas?',
        options: [correctAnswer, ...wrongAnswers],
        answer: correctAnswer,
        trackId: correctTrack.id,
        isMusic: true
    };
}

// Generate music questions for specific categories
function generateMusicQuestionsForCategories(categories) {
    const matching = MUSIC_TRACKS.filter(t => categories.includes(t.category));
    const shuffled = shuffleArray(matching);
    return shuffled.map(track => generateMusicQuestion(track, MUSIC_TRACKS));
}
