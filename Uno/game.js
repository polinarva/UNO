const gameState = {
    deck: [],
    discardPile: [],
    players: [],
    currentPlayer: 0,
    direction: 1,
    currentColor: null,
    currentValue: null,
    waitingForColorSelect: false,
    drawCount: 0,
    unoCalled: false
};

const COLORS = ['red', 'blue', 'green', 'yellow', 'black'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','Skip','Reverse','Draw Two'];
const WILD_CARDS = ['Wild', 'Wild Draw Four'];

// DOM elements
const playerHandEl = document.getElementById('player-hand');
const opponentHandEl = document.getElementById('opponent-hand');
const drawPileEl = document.getElementById('draw-pile');
const discardPileEl = document.getElementById('discard-pile');
const topCardEl = document.getElementById('top-card');
const currentColorEl = document.getElementById('current-color');
const gameStatusEl = document.getElementById('game-status');
const gameMessageEl = document.getElementById('game-message');
const drawCardBtn = document.getElementById('draw-card-btn');
const unoBtn = document.getElementById('uno-btn');
const passBtn = document.getElementById('pass-btn');
const restartBtn = document.getElementById('restart-btn');
const setupModalEl = document.getElementById('setup-modal');
const playerCountEl = document.getElementById('player-count');
const playerNamesEl = document.getElementById('player-names');
const startGameBtn = document.getElementById('start-game-btn');

function init() {
    setupPlayerInputs();
    setupModals();
    setupEventListeners();
}

function setupPlayerInputs() {
    playerCountEl.addEventListener('change', () => {
        const count = parseInt(playerCountEl.value);
        playerNamesEl.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.innerHTML = `
                <label for="player-${i+1}" class="block mb-1">Player ${i+1} Name:</label>
                <input type="text" id="player-${i+1}" class="w-full p-2 bg-gray-700 rounded" required>
            `;
            playerNamesEl.appendChild(div);
        }
    });
    playerCountEl.dispatchEvent(new Event('change'));
}

function setupModals() {
    startGameBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', () => {
        setupModalEl.classList.remove('hidden');
    });
}

function setupEventListeners() {
    drawPileEl.addEventListener('click', drawCard);
    drawCardBtn.addEventListener('click', drawCard);
    passBtn.addEventListener('click', passTurn);
    unoBtn.addEventListener('click', callUno);
}

function startGame() {
    gameState.players = [];
    const count = parseInt(playerCountEl.value);
    for (let i = 0; i < count; i++) {
        const name = document.getElementById(`player-${i+1}`).value || `Player ${i+1}`;
        gameState.players.push({
            name: name,
            hand: [],
            isAI: i > 0
        });
    }

    gameState.currentPlayer = 0;
    gameState.direction = 1;
    gameState.deck = [];
    gameState.discardPile = [];
    gameState.currentColor = null;
    gameState.currentValue = null;
    gameState.drawCount = 0;
    gameState.waitingForColorSelect = false;
    gameState.unoCalled = false;

    createDeck();
    shuffleDeck();

    for (let i = 0; i < 7; i++) {
        for (let player of gameState.players) {
            player.hand.push(drawFromDeck());
        }
    }

    let firstCard;
    do {
        firstCard = drawFromDeck();
    } while (firstCard.color === 'black');
    gameState.discardPile.push(firstCard);
    gameState.currentColor = firstCard.color;
    gameState.currentValue = firstCard.value;

    setupModalEl.classList.add('hidden');
    updateUI();
    updateGameStatus();
}

function createDeck() {
    for (let color of COLORS) {
        if (color === 'black') continue;
        gameState.deck.push({ color, value: '0' });
        for (let i = 0; i < 2; i++) {
            for (let value of VALUES.filter(v => v !== '0')) {
                gameState.deck.push({ color, value });
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        for (let wild of WILD_CARDS) {
            gameState.deck.push({ color: 'black', value: wild });
        }
    }
}

function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

function drawFromDeck() {
    if (gameState.deck.length === 0) {
        const topCard = gameState.discardPile.pop();
        gameState.deck = [...gameState.discardPile];
        gameState.discardPile = [topCard];
        shuffleDeck();
    }
    return gameState.deck.pop();
}

function drawCard() {
    if (gameState.waitingForColorSelect) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    const drawnCard = drawFromDeck();

    if (gameState.drawCount > 0) {
        currentPlayer.hand.push(drawnCard);
        gameState.drawCount--;
        if (gameState.drawCount > 0) {
            updateUI();
            updateGameStatus();
            return;
        }
    } else {
        currentPlayer.hand.push(drawnCard);
    }

    if (gameState.drawCount === 0 && !currentPlayer.isAI) {
        if (canPlayCard(drawnCard)) {
            setTimeout(() => {
                const cardIndex = currentPlayer.hand.length - 1;
                highlightPlayableCard(cardIndex);
            }, 300);
        }
    }

    updateUI();
    updateGameStatus();

    if (currentPlayer.isAI && canPlay()) {
        setTimeout(makeAIMove, 1000);
    }
}

function canPlayCard(card) {
    if (gameState.drawCount > 0) {
        return card.value.endsWith('Draw') && (card.color === gameState.currentColor || card.color === 'black');
    }
    if (card.color === 'black') return true;
    return card.color === gameState.currentColor || card.value === gameState.currentValue;
}

function canPlay() {
    return gameState.players[gameState.currentPlayer].hand.some(card => canPlayCard(card));
}

function playCard(cardIndex) {
    if (gameState.waitingForColorSelect) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    const card = currentPlayer.hand[cardIndex];

    if (!canPlayCard(card)) {
        gameMessageEl.textContent = "Invalid move!";
        setTimeout(() => gameMessageEl.textContent = "", 2000);
        return;
    }

    currentPlayer.hand.splice(cardIndex, 1);

    if (currentPlayer.hand.length === 1 && !currentPlayer.isAI) {
        unoBtn.classList.remove('hidden');
    } else {
        unoBtn.classList.add('hidden');
    }

    if (currentPlayer.hand.length === 1 && !gameState.unoCalled) {
        currentPlayer.hand.push(drawFromDeck());
        currentPlayer.hand.push(drawFromDeck());
        gameMessageEl.textContent = `${currentPlayer.name} forgot to call UNO! Draw 2 cards.`;
        setTimeout(() => gameMessageEl.textContent = "", 3000);
    }

    if (card.color === 'black') {
        gameState.waitingForColorSelect = true;
        showColorPicker();
    } else {
        gameState.currentColor = card.color;
        gameState.currentValue = card.value;
        gameState.unoCalled = false;
        handleSpecialCard(card);
    }

    gameState.discardPile.push(card);
    updateUI();
    updateGameStatus();

    if (currentPlayer.hand.length === 0) {
        announceWinner(currentPlayer);
        return;
    }

    if (!currentPlayer.isAI && !gameState.waitingForColorSelect) {
        passTurn();
    }

    if (currentPlayer.isAI && canPlay() && !gameState.waitingForColorSelect) {
        setTimeout(makeAIMove, 1000);
    }
}

function handleSpecialCard(card) {
    switch (card.value) {
        case 'Skip':
            gameMessageEl.textContent = `${gameState.players[gameState.currentPlayer].name} skipped the next player!`;
            setTimeout(() => gameMessageEl.textContent = "", 2000);
            nextPlayer();
            break;
        case 'Reverse':
            gameState.direction *= -1;
            gameMessageEl.textContent = "Direction reversed!";
            setTimeout(() => gameMessageEl.textContent = "", 2000);
            break;
        case 'Draw Two':
            gameState.drawCount += 2;
            gameMessageEl.textContent = `${nextPlayerName()} must draw 2 cards!`;
            setTimeout(() => gameMessageEl.textContent = "", 2000);
            break;
        case 'Wild Draw Four':
            gameState.drawCount += 4;
            gameMessageEl.textContent = `${nextPlayerName()} must draw 4 cards!`;
            setTimeout(() => gameMessageEl.textContent = "", 2000);
            break;
    }
}

function showColorPicker() {
    gameMessageEl.innerHTML = `
        <span class="block mb-2">Choose a color:</span>
        <div class="flex justify-center gap-2">
            <button class="w-8 h-8 bg-red-500 rounded-full border-2 border-white" onclick="selectColor('red')"></button>
            <button class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white" onclick="selectColor('blue')"></button>
            <button class="w-8 h-8 bg-green-500 rounded-full border-2 border-white" onclick="selectColor('green')"></button>
            <button class="w-8 h-8 bg-yellow-500 rounded-full border-2 border-white" onclick="selectColor('yellow')"></button>
        </div>
    `;
}

function selectColor(color) {
    gameState.currentColor = color;
    gameState.waitingForColorSelect = false;
    gameMessageEl.textContent = "";
    gameState.unoCalled = false;

    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    if (topCard.value === 'Wild Draw Four') {
        gameState.drawCount += 4;
        gameMessageEl.textContent = `${nextPlayerName()} must draw 4 cards!`;
        setTimeout(() => gameMessageEl.textContent = "", 2000);
    }

    updateUI();
    updateGameStatus();

    if (!gameState.players[gameState.currentPlayer].isAI) {
        passTurn();
    }

    const nextPlayer = gameState.players[gameState.currentPlayer];
    if (nextPlayer.isAI && canPlay()) {
        setTimeout(makeAIMove, 1000);
    }
}

window.selectColor = selectColor;

function makeAIMove() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI) return;

    const playableCards = currentPlayer.hand.map((card, index) => ({ card, index }))
        .filter(({ card }) => canPlayCard(card));

    if (playableCards.length === 0) {
        drawCard();
        return;
    }

    const toPlay = playableCards[0];
    playCard(toPlay.index);
}

function nextPlayerName() {
    let next = (gameState.currentPlayer + gameState.direction) % gameState.players.length;
    if (next < 0) next = gameState.players.length - 1;
    return gameState.players[next].name;
}

function nextPlayer() {
    gameState.currentPlayer = (gameState.currentPlayer + gameState.direction) % gameState.players.length;
    if (gameState.currentPlayer < 0) gameState.currentPlayer = gameState.players.length - 1;
}

function passTurn() {
    if (gameState.waitingForColorSelect) return;
    if (gameState.drawCount > 0 && canPlay()) {
        gameMessageEl.textContent = "You must play a Draw card or draw the penalty!";
        setTimeout(() => gameMessageEl.textContent = "", 2000);
        return;
    }
    if (gameState.drawCount === 0) {
        gameState.unoCalled = false;
        nextPlayer();
        updateUI();
        updateGameStatus();
        const currentPlayer = gameState.players[gameState.currentPlayer];
        if (currentPlayer.isAI && canPlay()) {
            setTimeout(makeAIMove, 1000);
        }
    }
}

function callUno() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.hand.length === 1) {
        gameState.unoCalled = true;
        gameMessageEl.textContent = `${currentPlayer.name} called UNO!`;
        setTimeout(() => gameMessageEl.textContent = "", 2000);
        unoBtn.classList.add('hidden');
    }
}

function announceWinner(winner) {
    gameMessageEl.textContent = `${winner.name} wins!`;
    gameStatusEl.textContent = `Game over - ${winner.name} wins!`;
}

function highlightPlayableCard(index) {
    const cardEl = playerHandEl.children[index];
    if (cardEl) {
        cardEl.classList.add('card-play');
        setTimeout(() => cardEl.classList.remove('card-play'), 500);
    }
}

function updateUI() {
    playerHandEl.innerHTML = '';
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI) {
        currentPlayer.hand.forEach((card, index) => {
            const canPlay = canPlayCard(card);
            const cardEl = createCardElement(card, index, canPlay);
            playerHandEl.appendChild(cardEl);
        });
    }

    opponentHandEl.innerHTML = '';
    gameState.players.forEach((player, playerIndex) => {
        if (playerIndex !== gameState.currentPlayer) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'flex flex-col items-center mb-4';
            playerDiv.innerHTML = `
                <div class="text-sm mb-1">${player.name} (${player.hand.length})</div>
                <div class="flex flex-wrap justify-center gap-1 max-w-xs">
                    ${Array(player.hand.length).fill().map(() => 
                        `<img src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f64fc964-c3b1-43e0-a6af-cd7b61a84950.png " alt="Back of UNO card" class="h-[80px] w-[60px] rounded" />`
                    ).join('')}
                </div>
            `;
            opponentHandEl.appendChild(playerDiv);
        }
    });

    if (gameState.discardPile.length > 0) {
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        topCardEl.className = `h-[120px] w-[80px] rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-xl card-${topCard.color}`;
        topCardEl.style.color = topCard.color === 'black' || topCard.color === 'yellow' ? 'white' : 'black';
        topCardEl.textContent = topCard.value;
    }

    currentColorEl.className = `h-12 w-12 rounded-full border-2 border-white mt-2 mb-4 bg-${gameState.currentColor}-500`;
    unoBtn.classList.add('hidden');
}

function createCardElement(card, index, isPlayable) {
    const cardEl = document.createElement('div');
    cardEl.className = `card rounded-lg shadow-lg flex items-center justify-center font-bold text-xl card-${card.color} ${isPlayable ? 'cursor-pointer' : 'opacity-70'}`;
    cardEl.style.color = card.color === 'black' || card.color === 'yellow' ? 'black' : 'white';
    cardEl.textContent = card.value;
    if (isPlayable) {
        cardEl.addEventListener('click', () => playCard(index));
    }
    return cardEl;
}

function updateGameStatus() {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    let status = `${currentPlayer.name}'s turn`;
    if (currentPlayer.isAI && !gameState.waitingForColorSelect) {
        status += " (AI)";
    }
    if (gameState.drawCount > 0) {
        status += ` - ${gameState.drawCount} cards to draw`;
    }
    gameStatusEl.textContent = status;
}

document.addEventListener('DOMContentLoaded', init);