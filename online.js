// Online multiplayer using PeerJS
let peer = null;
let connections = []; // host: array of connections to guests
let hostConnection = null; // guest: connection to host
let isHost = false;
let roomCode = '';
let lobbyPlayers = []; // { name, peerId }
let myName = '';

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getMyName() {
    const input = document.getElementById('online-player-name');
    return input.value.trim() || 'Spelare';
}

// HOST: Create a room
function createRoom() {
    myName = getMyName();
    roomCode = generateRoomCode();
    isHost = true;
    isOnlineGame = true;

    Logger.log('GAME', `Skapar rum: ${roomCode}`);

    const peerId = 'narDa-' + roomCode;
    peer = new Peer(peerId);

    peer.on('open', () => {
        Logger.log('GAME', `Ansluten som värd: ${peerId}`);
        lobbyPlayers = [{ name: myName, peerId: peer.id }];
        showLobby();
    });

    peer.on('connection', (conn) => {
        conn.on('open', () => {
            conn.on('data', (data) => handleHostMessage(conn, data));
        });
        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            lobbyPlayers = lobbyPlayers.filter(p => p.peerId !== conn.peer);
            updateLobbyUI();
            Logger.log('GAME', `Spelare lämnade`);
        });
        connections.push(conn);
    });

    peer.on('error', (err) => {
        Logger.log('ERROR', `PeerJS: ${err.type}: ${err.message}`);
        if (err.type === 'unavailable-id') {
            alert('Rumskoden används redan. Försök igen.');
            showScreen('online-setup');
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
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!code) {
        alert('Ange en rumskod!');
        return;
    }

    roomCode = code;
    isHost = false;
    isOnlineGame = true;

    Logger.log('GAME', `Ansluter till rum: ${roomCode}`);

    peer = new Peer();

    peer.on('open', () => {
        const hostId = 'narDa-' + roomCode;
        hostConnection = peer.connect(hostId, { reliable: true });

        hostConnection.on('open', () => {
            Logger.log('GAME', 'Ansluten till värd!');
            hostConnection.send({ type: 'join', name: myName, peerId: peer.id });
        });

        hostConnection.on('data', (data) => handleGuestMessage(data));

        hostConnection.on('close', () => {
            Logger.log('ERROR', 'Anslutningen till värden bröts');
            alert('Anslutningen till värden bröts.');
            resetGame();
        });

        hostConnection.on('error', (err) => {
            Logger.log('ERROR', `Anslutningsfel: ${err}`);
        });
    });

    peer.on('error', (err) => {
        Logger.log('ERROR', `PeerJS: ${err.type}: ${err.message}`);
        if (err.type === 'peer-unavailable') {
            alert('Kunde inte hitta rummet. Kolla koden och försök igen.');
            showScreen('online-setup');
        }
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
            ${i === 0 ? '<span class="lobby-host-badge">Värd</span>' : ''}
        </div>`
    ).join('');

    document.getElementById('lobby-status').textContent =
        `${lobbyPlayers.length} spelare i rummet`;

    // Broadcast lobby update to all guests
    if (isHost) {
        broadcastToGuests({ type: 'lobby-update', players: lobbyPlayers });
    }
}

function copyRoomCode() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(roomCode);
    } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = roomCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }
    const btn = document.querySelector('.btn-small');
    btn.textContent = 'Kopierad!';
    setTimeout(() => { btn.textContent = 'Kopiera'; }, 1500);
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
            updateLobbyUI();
            // Send lobby state to the new player
            conn.send({ type: 'lobby-update', players: lobbyPlayers });
            break;

        case 'place-event':
            // A guest placed an event - process it
            processPlacement(data.slotIndex);
            // Broadcast result to all
            broadcastToGuests({
                type: 'placement-result',
                slotIndex: data.slotIndex,
                players: players,
                timeline: timeline,
                currentQuestionIndex: currentQuestionIndex,
                currentPlayerIndex: currentPlayerIndex
            });
            break;
    }
}

// GUEST: Handle messages from host
function handleGuestMessage(data) {
    Logger.log('GAME', `Gäst fick: ${data.type}`);

    switch (data.type) {
        case 'lobby-update':
            lobbyPlayers = data.players;
            updateLobbyUI();
            break;

        case 'game-start':
            players = data.players;
            myPlayerIndex = data.yourIndex;
            gameQuestions = data.questions;
            isOnlineGame = true;
            Logger.log('GAME', `Jag är spelare ${myPlayerIndex}: ${players[myPlayerIndex].name}`);
            prepareAndStartGame(data.questions);
            // Override timeline with host's
            timeline = data.timeline;
            showQuestion();
            break;

        case 'placement-result':
            players = data.players;
            timeline = data.timeline;
            currentQuestionIndex = data.currentQuestionIndex;
            currentPlayerIndex = data.currentPlayerIndex;
            const q = gameQuestions[currentQuestionIndex];
            const sorted = [...data.timeline].sort((a, b) => a.answer - b.answer);
            // Determine if correct
            const lastAdded = data.timeline[data.timeline.length - 1];
            const slotIdx = data.slotIndex;
            let correct = false;
            const prevTimeline = data.timeline.slice(0, -1).sort((a, b) => a.answer - b.answer);
            if (slotIdx === 0) {
                correct = lastAdded.answer <= prevTimeline[0].answer;
            } else if (slotIdx >= prevTimeline.length) {
                correct = lastAdded.answer >= prevTimeline[prevTimeline.length - 1].answer;
            } else {
                correct = lastAdded.answer >= prevTimeline[slotIdx - 1].answer && lastAdded.answer <= prevTimeline[slotIdx].answer;
            }
            const pts = correct ? 2 : 0;
            showResult(lastAdded, correct, pts);
            break;

        case 'next-turn':
            currentQuestionIndex = data.currentQuestionIndex;
            currentPlayerIndex = data.currentPlayerIndex;
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

    // Set up players
    players = lobbyPlayers.map(p => ({ name: p.name, score: 0 }));
    myPlayerIndex = 0; // Host is always player 0

    const filtered = QUESTIONS.filter(q => selectedCategories.has(q.category));
    const allQuestions = shuffleArray(filtered).slice(0, players.length * QUESTIONS_PER_PLAYER + 1);

    isOnlineGame = true;

    // Send game start to each guest with their player index
    connections.forEach((conn, i) => {
        const guestIndex = lobbyPlayers.findIndex(p => p.peerId === conn.peer);
        conn.send({
            type: 'game-start',
            players: players,
            yourIndex: guestIndex,
            questions: allQuestions,
            timeline: [allQuestions[0]]
        });
    });

    // Start locally
    prepareAndStartGame(allQuestions);
}

// Online game actions
function onlinePlaceEvent(slotIndex) {
    if (isHost) {
        // Host placed - process directly
        processPlacement(slotIndex);
        broadcastToGuests({
            type: 'placement-result',
            slotIndex: slotIndex,
            players: players,
            timeline: timeline,
            currentQuestionIndex: currentQuestionIndex,
            currentPlayerIndex: currentPlayerIndex
        });
    } else {
        // Guest - send to host
        hostConnection.send({ type: 'place-event', slotIndex: slotIndex });
    }
}

function onlineNextTurn() {
    if (!isHost) return;

    currentQuestionIndex++;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

    const gameOver = currentQuestionIndex >= gameQuestions.length;

    broadcastToGuests({
        type: 'next-turn',
        currentQuestionIndex: currentQuestionIndex,
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
