// Online multiplayer using PeerJS
let peer = null;
let connections = []; // host: array of connections to guests
let hostConnection = null; // guest: connection to host
let isHost = false;
let roomCode = '';
let lobbyPlayers = []; // { name, peerId }
let myName = '';
let connectionTimeout = null;

const PEER_CONFIG = {
    debug: 1,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ]
    }
};

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getMyName() {
    const input = document.getElementById('online-player-name');
    return input.value.trim() || 'Spelare';
}

function setStatus(msg) {
    const el = document.getElementById('lobby-status');
    if (el) el.textContent = msg;
    Logger.log('GAME', msg);
}

// HOST: Create a room
function createRoom() {
    myName = getMyName();
    if (!myName) {
        alert('Skriv ditt namn först!');
        return;
    }

    roomCode = generateRoomCode();
    isHost = true;
    isOnlineGame = true;

    lobbyPlayers = [{ name: myName, peerId: '' }];
    showLobby();
    setStatus('Ansluter till server...');

    const peerId = 'quiz' + roomCode;
    peer = new Peer(peerId, PEER_CONFIG);

    connectionTimeout = setTimeout(() => {
        if (!peer || peer.disconnected) {
            setStatus('Kunde inte ansluta. Försök igen.');
            Logger.log('ERROR', 'Timeout vid anslutning till PeerJS-server');
        }
    }, 10000);

    peer.on('open', (id) => {
        clearTimeout(connectionTimeout);
        Logger.log('GAME', `Värd ansluten med ID: ${id}`);
        lobbyPlayers[0].peerId = id;
        setStatus('Rum skapat! Dela koden med dina vänner.');
    });

    peer.on('connection', (conn) => {
        Logger.log('GAME', `Ny anslutning från: ${conn.peer}`);
        connections.push(conn);

        conn.on('open', () => {
            Logger.log('GAME', `Anslutning öppnad: ${conn.peer}`);
            conn.on('data', (data) => handleHostMessage(conn, data));
        });

        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            lobbyPlayers = lobbyPlayers.filter(p => p.peerId !== conn.peer);
            updateLobbyUI();
            setStatus('En spelare lämnade rummet.');
        });

        conn.on('error', (err) => {
            Logger.log('ERROR', `Anslutningsfel med gäst: ${err}`);
        });
    });

    peer.on('disconnected', () => {
        Logger.log('ERROR', 'Tappade anslutning till server, försöker igen...');
        setStatus('Tappade anslutning, försöker igen...');
        peer.reconnect();
    });

    peer.on('error', (err) => {
        clearTimeout(connectionTimeout);
        Logger.log('ERROR', `PeerJS: ${err.type}: ${err.message}`);
        if (err.type === 'unavailable-id') {
            roomCode = generateRoomCode();
            setStatus('Koden var upptagen, försöker med ny kod...');
            document.getElementById('room-code').textContent = roomCode;
            peer.destroy();
            const newPeerId = 'quiz' + roomCode;
            peer = new Peer(newPeerId, PEER_CONFIG);
            peer.on('open', () => {
                lobbyPlayers[0].peerId = peer.id;
                setStatus('Rum skapat! Dela koden med dina vänner.');
            });
            peer.on('connection', (conn) => {
                connections.push(conn);
                conn.on('open', () => {
                    conn.on('data', (data) => handleHostMessage(conn, data));
                });
                conn.on('close', () => {
                    connections = connections.filter(c => c !== conn);
                    lobbyPlayers = lobbyPlayers.filter(p => p.peerId !== conn.peer);
                    updateLobbyUI();
                });
            });
        } else if (err.type === 'network' || err.type === 'server-error') {
            setStatus('Serverfel. Kontrollera din internetanslutning.');
        }
    });
}

// GUEST: Join a room
function showJoinRoom() {
    document.getElementById('join-input').classList.remove('hidden');
    document.getElementById('room-code-input').focus();
}

function joinRoom() {
    myName = getMyName();
    if (!myName) {
        alert('Skriv ditt namn först!');
        return;
    }

    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!code) {
        alert('Ange en rumskod!');
        return;
    }

    roomCode = code;
    isHost = false;
    isOnlineGame = true;

    lobbyPlayers = [{ name: myName, peerId: '' }];
    showLobby();
    setStatus('Ansluter till rum ' + roomCode + '...');

    peer = new Peer(PEER_CONFIG);

    connectionTimeout = setTimeout(() => {
        setStatus('Anslutningen tog för lång tid. Kolla rumskoden och försök igen.');
        Logger.log('ERROR', 'Timeout vid anslutning');
    }, 15000);

    peer.on('open', () => {
        Logger.log('GAME', `Gäst ansluten med ID: ${peer.id}`);
        setStatus('Ansluter till rum ' + roomCode + '...');

        const hostId = 'quiz' + roomCode;
        hostConnection = peer.connect(hostId, { reliable: true, serialization: 'json' });

        hostConnection.on('open', () => {
            clearTimeout(connectionTimeout);
            Logger.log('GAME', 'Ansluten till värd!');
            setStatus('Ansluten! Väntar på att värden startar...');
            hostConnection.send({ type: 'join', name: myName, peerId: peer.id });
        });

        hostConnection.on('data', (data) => handleGuestMessage(data));

        hostConnection.on('close', () => {
            Logger.log('ERROR', 'Anslutningen till värden bröts');
            setStatus('Anslutningen till värden bröts.');
            alert('Anslutningen till värden bröts.');
            resetGame();
        });

        hostConnection.on('error', (err) => {
            clearTimeout(connectionTimeout);
            Logger.log('ERROR', `Anslutningsfel: ${err}`);
            setStatus('Kunde inte ansluta. Kolla koden och försök igen.');
        });
    });

    peer.on('error', (err) => {
        clearTimeout(connectionTimeout);
        Logger.log('ERROR', `PeerJS: ${err.type}: ${err.message}`);
        if (err.type === 'peer-unavailable') {
            setStatus('Kunde inte hitta rummet. Kolla koden.');
            alert('Rummet "' + roomCode + '" hittades inte. Kolla att koden stämmer och att värden fortfarande är inne.');
        } else if (err.type === 'network' || err.type === 'server-error') {
            setStatus('Nätverksfel. Kontrollera din internetanslutning.');
        } else {
            setStatus('Fel: ' + err.type);
        }
    });

    peer.on('disconnected', () => {
        Logger.log('ERROR', 'Tappade anslutning, försöker igen...');
        setStatus('Tappade anslutning, försöker igen...');
        peer.reconnect();
    });
}

// Lobby
function showLobby() {
    showScreen('lobby-screen');
    document.getElementById('room-code').textContent = roomCode;
    selectedCategories = new Set(CATEGORIES);

    if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
        document.getElementById('guest-waiting').classList.add('hidden');
        renderCategoryButtons('lobby-category-buttons');
    } else {
        document.getElementById('host-controls').classList.add('hidden');
        document.getElementById('guest-waiting').classList.remove('hidden');
    }

    updateLobbyUI();
}

function updateLobbyUI() {
    const list = document.getElementById('lobby-player-list');
    list.innerHTML = lobbyPlayers.map((p, i) =>
        `<div class="lobby-player">
            <span class="lobby-player-name">${p.name}</span>
            ${i === 0 && isHost ? '<span class="lobby-host-badge">Värd</span>' : ''}
        </div>`
    ).join('');

    if (lobbyPlayers.length > 0) {
        const statusEl = document.getElementById('lobby-status');
        if (!statusEl.textContent.includes('Ansluter')) {
            statusEl.textContent = `${lobbyPlayers.length} spelare i rummet`;
        }
    }

    if (isHost) {
        broadcastToGuests({ type: 'lobby-update', players: lobbyPlayers });
    }
}

function copyRoomCode() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(roomCode).catch(() => {
            fallbackCopy(roomCode);
        });
    } else {
        fallbackCopy(roomCode);
    }
    const btn = document.querySelector('.btn-small');
    btn.textContent = 'Kopierad!';
    setTimeout(() => { btn.textContent = 'Kopiera'; }, 1500);
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function leaveLobby() {
    cleanupOnline();
    showScreen('start-screen');
}

// HOST: Handle messages from guests
function handleHostMessage(conn, data) {
    Logger.log('GAME', `Värd fick: ${data.type}`);

    switch (data.type) {
        case 'join':
            lobbyPlayers.push({ name: data.name, peerId: data.peerId });
            setStatus(`${data.name} anslöt! ${lobbyPlayers.length} spelare i rummet.`);
            updateLobbyUI();
            conn.send({ type: 'lobby-update', players: lobbyPlayers });
            break;

        case 'select-answer':
            processAnswer(data.selectedOption);
            broadcastToGuests({
                type: 'answer-result',
                selectedOption: data.selectedOption,
                players: players,
                roundPoints: roundPoints,
                playerQuestionIndex: playerQuestionIndex,
                currentPlayerIndex: currentPlayerIndex
            });
            break;

        case 'continue-round':
            continueRound();
            break;

        case 'stop-round':
            stopRound();
            break;
    }
}

// GUEST: Handle messages from host
function handleGuestMessage(data) {
    Logger.log('GAME', `Gäst fick: ${data.type}`);

    switch (data.type) {
        case 'lobby-update':
            lobbyPlayers = data.players;
            setStatus(`${lobbyPlayers.length} spelare i rummet`);
            updateLobbyUI();
            break;

        case 'game-start':
            players = data.players;
            myPlayerIndex = data.yourIndex;
            playerQuestions = data.playerQuestions;
            isOnlineGame = true;
            Logger.log('GAME', `Jag är spelare ${myPlayerIndex}: ${players[myPlayerIndex].name}`);
            prepareAndStartGame(data.playerQuestions);
            showQuestion();
            break;

        case 'answer-result': {
            players = data.players;
            roundPoints = data.roundPoints;
            playerQuestionIndex = data.playerQuestionIndex;
            currentPlayerIndex = data.currentPlayerIndex;

            const pi = data.currentPlayerIndex;
            const qi = data.playerQuestionIndex[pi] || 0;
            const q = playerQuestions[pi][qi];
            const correct = data.selectedOption === q.answer;
            showResult(q, correct, data.selectedOption);
            break;
        }

        case 'continue':
            playerQuestionIndex = data.playerQuestionIndex;
            roundPoints = data.roundPoints;
            showQuestion();
            break;

        case 'stop':
            players = data.players;
            playerQuestionIndex = data.playerQuestionIndex;
            currentPlayerIndex = data.currentPlayerIndex;
            roundPoints = 0;
            if (data.gameOver) {
                endGame();
            } else {
                showQuestion();
            }
            break;

        case 'next-turn':
            playerQuestionIndex = data.playerQuestionIndex;
            currentPlayerIndex = data.currentPlayerIndex;
            roundPoints = 0;
            if (data.gameOver) {
                endGame();
            } else {
                showQuestion();
            }
            break;
    }
}

// HOST: Start the online game
function startOnlineGame() {
    if (selectedCategories.size === 0) {
        alert('Välj minst en kategori!');
        return;
    }
    if (lobbyPlayers.length < 2) {
        alert('Det behövs minst 2 spelare!');
        return;
    }

    players = lobbyPlayers.map(p => ({ name: p.name, score: 0 }));
    myPlayerIndex = 0;
    isOnlineGame = true;

    const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
    const shuffled = shuffleArray(filtered);

    playerQuestions = [];
    for (let i = 0; i < players.length; i++) {
        const start = i * QUESTIONS_PER_PLAYER;
        const playerCards = shuffled.slice(start, start + QUESTIONS_PER_PLAYER);
        playerQuestions.push(playerCards);
    }

    playerQuestionIndex = players.map(() => 0);

    connections.forEach((conn) => {
        const guestIndex = lobbyPlayers.findIndex(p => p.peerId === conn.peer);
        if (conn.open) {
            conn.send({
                type: 'game-start',
                players: players,
                yourIndex: guestIndex,
                playerQuestions: playerQuestions
            });
        }
    });

    currentPlayerIndex = 0;
    waitingForAnswer = false;
    roundPoints = 0;

    const playerNames = players.map(p => p.name).join(', ');
    Logger.log('GAME', `Spel startat! Spelare: ${playerNames}`);

    showScreen('game-screen');
    showQuestion();
}

// Online game actions
function onlineSelectAnswer(selectedOption) {
    if (isHost) {
        processAnswer(selectedOption);
        broadcastToGuests({
            type: 'answer-result',
            selectedOption: selectedOption,
            players: players,
            roundPoints: roundPoints,
            playerQuestionIndex: playerQuestionIndex,
            currentPlayerIndex: currentPlayerIndex
        });
    } else {
        if (hostConnection && hostConnection.open) {
            hostConnection.send({ type: 'select-answer', selectedOption: selectedOption });
        } else {
            alert('Tappade anslutningen till värden.');
        }
    }
}

function onlineContinueRound() {
    if (isHost) {
        playerQuestionIndex[currentPlayerIndex]++;
        broadcastToGuests({
            type: 'continue',
            playerQuestionIndex: playerQuestionIndex,
            roundPoints: roundPoints
        });
        showQuestion();
    } else {
        hostConnection.send({ type: 'continue-round' });
    }
}

function onlineStopRound() {
    if (isHost) {
        players[currentPlayerIndex].score += roundPoints;
        roundPoints = 0;
        playerQuestionIndex[currentPlayerIndex]++;

        let tried = 0;
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            tried++;
        } while (tried < players.length && playerQuestionIndex[currentPlayerIndex] >= playerQuestions[currentPlayerIndex].length);

        const gameOver = allPlayersDone();
        broadcastToGuests({
            type: 'stop',
            players: players,
            playerQuestionIndex: playerQuestionIndex,
            currentPlayerIndex: currentPlayerIndex,
            gameOver: gameOver
        });
        if (gameOver) { endGame(); } else { showQuestion(); }
    } else {
        hostConnection.send({ type: 'stop-round' });
    }
}

function onlineNextTurn() {
    if (!isHost) return;

    roundPoints = 0;
    playerQuestionIndex[currentPlayerIndex]++;

    let tried = 0;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        tried++;
    } while (tried < players.length && playerQuestionIndex[currentPlayerIndex] >= playerQuestions[currentPlayerIndex].length);

    const gameOver = allPlayersDone();

    broadcastToGuests({
        type: 'next-turn',
        playerQuestionIndex: playerQuestionIndex,
        currentPlayerIndex: currentPlayerIndex,
        gameOver: gameOver
    });

    if (gameOver) {
        endGame();
    } else {
        showQuestion();
    }
}

function broadcastToGuests(data) {
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}

function cleanupOnline() {
    clearTimeout(connectionTimeout);
    if (peer) {
        peer.destroy();
        peer = null;
    }
    connections = [];
    hostConnection = null;
    lobbyPlayers = [];
    isHost = false;
    isOnlineGame = false;
    myPlayerIndex = -1;
}
