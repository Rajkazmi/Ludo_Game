const { randomInt } = require('node:crypto');

const SAFE_SPOTS = new Set([
  221, 222, 223, 224, 225, 14, 27, 331, 332, 333, 334, 335, 40, 441, 442,
  443, 444, 445, 1, 111, 112, 113, 114, 115,
]);
const STAR_SPOTS = new Set([9, 22, 35, 48]);
const STARTING_POINTS = [1, 14, 27, 40];
const TURNING_POINTS = [52, 13, 26, 39];
const VICTORY_STARTS = [111, 221, 331, 441];
const PLAYER_LETTERS = ['A', 'B', 'C', 'D'];

function getNextActivePlayer(playerNo, activePlayers, winners) {
  for (let offset = 1; offset <= 4; offset += 1) {
    const candidate = ((playerNo - 1 + offset) % 4) + 1;
    if (activePlayers.includes(candidate) && !winners.includes(candidate)) {
      return candidate;
    }
  }
  return playerNo;
}

function createInitialGameState(activePlayers) {
  const state = {
    chancePlayer: activePlayers[0] ?? 1,
    activePlayers,
    winners: [],
    diceNo: 1,
    isDiceRolled: false,
    pileSelectionPlayer: -1,
    cellSelectionPlayer: -1,
    touchDiceBlock: false,
    currentPositions: [],
    fireworks: false,
    winner: null,
  };

  PLAYER_LETTERS.forEach((letter, index) => {
    state[`player${index + 1}`] = Array.from({ length: 4 }, (_, pieceIndex) => ({
      id: `${letter}${pieceIndex + 1}`,
      pos: 0,
      travelCount: 0,
    }));
  });

  return state;
}

function updatePiece(state, playerNo, pieceId, pos, travelCount) {
  const pieces = state[`player${playerNo}`];
  const piece = pieces.find(item => item.id === pieceId);
  if (!piece) {
    throw new Error('That piece does not belong to the active player.');
  }

  piece.pos = pos;
  piece.travelCount = travelCount;
  refreshCurrentPositions(state);
}

function refreshCurrentPositions(state) {
  state.currentPositions = PLAYER_LETTERS.flatMap((letter, index) =>
    state[`player${index + 1}`]
      .filter(item => item.pos !== 0)
      .map(item => ({ id: item.id, pos: item.pos })),
  );
}

function clearDiceSelection(state) {
  state.isDiceRolled = false;
  state.touchDiceBlock = false;
  state.pileSelectionPlayer = -1;
  state.cellSelectionPlayer = -1;
}

function requireCurrentPlayer(state, playerNo) {
  if (
    !Number.isInteger(playerNo) ||
    state.chancePlayer !== playerNo ||
    !state.activePlayers.includes(playerNo) ||
    state.winners.includes(playerNo) ||
    state.winner !== null
  ) {
    throw new Error("It is not this player's turn.");
  }
}

function requirePieceId(playerNo, pieceId) {
  const expectedLetter = PLAYER_LETTERS[playerNo - 1];
  if (
    typeof pieceId !== 'string' ||
    !new RegExp(`^${expectedLetter}[1-4]$`).test(pieceId)
  ) {
    throw new Error('The selected piece is invalid.');
  }
}

function applyRoll(state, playerNo, diceValue) {
  requireCurrentPlayer(state, playerNo);
  if (state.isDiceRolled) {
    throw new Error('The current roll must be played first.');
  }

  const diceNo = diceValue ?? randomInt(1, 7);
  if (!Number.isInteger(diceNo) || diceNo < 1 || diceNo > 6) {
    throw new Error('Dice value must be between 1 and 6.');
  }

  state.diceNo = diceNo;
  state.isDiceRolled = true;
  state.pileSelectionPlayer = -1;
  state.cellSelectionPlayer = -1;
  const pieces = state[`player${playerNo}`];
  const hasMovablePiece = pieces.some(
    piece => piece.pos !== 0 && piece.travelCount + diceNo <= 57,
  );
  const hasLockedPiece = pieces.some(piece => piece.pos === 0);

  if (diceNo === 6 && hasLockedPiece) {
    state.touchDiceBlock = true;
    state.pileSelectionPlayer = playerNo;
  }
  if (hasMovablePiece) {
    state.touchDiceBlock = true;
    state.cellSelectionPlayer = playerNo;
  }
  if (!hasMovablePiece && !(diceNo === 6 && hasLockedPiece)) {
    state.chancePlayer = getNextActivePlayer(
      playerNo,
      state.activePlayers,
      state.winners,
    );
    clearDiceSelection(state);
  }
}

function applyStartPiece(state, playerNo, pieceId) {
  requireCurrentPlayer(state, playerNo);
  requirePieceId(playerNo, pieceId);
  if (state.diceNo !== 6 || !state.isDiceRolled) {
    throw new Error('A six is required to start a piece.');
  }

  const piece = state[`player${playerNo}`].find(item => item.id === pieceId);
  if (!piece || piece.pos !== 0) {
    throw new Error('The selected piece is not in its base.');
  }

  updatePiece(
    state,
    playerNo,
    pieceId,
    STARTING_POINTS[playerNo - 1],
    1,
  );
  clearDiceSelection(state);
}

function applyMovePiece(state, playerNo, pieceId) {
  requireCurrentPlayer(state, playerNo);
  requirePieceId(playerNo, pieceId);
  if (!state.isDiceRolled) {
    throw new Error('Roll the dice before moving a piece.');
  }

  const piece = state[`player${playerNo}`].find(item => item.id === pieceId);
  if (
    !piece ||
    piece.pos === 0 ||
    piece.travelCount + state.diceNo > 57
  ) {
    throw new Error('That piece cannot move by the current dice value.');
  }

  let finalPath = piece.pos;
  const travelCount = piece.travelCount + state.diceNo;
  for (let step = 0; step < state.diceNo; step += 1) {
    let path = piece.pos + 1;
    if (
      TURNING_POINTS.includes(path) &&
      TURNING_POINTS[playerNo - 1] === path
    ) {
      path = VICTORY_STARTS[playerNo - 1];
    }
    if (path === 53) {
      path = 1;
    }
    piece.pos = path;
    piece.travelCount += 1;
    finalPath = path;
  }
  refreshCurrentPositions(state);

  const piecesAtDestination = PLAYER_LETTERS.flatMap((letter, index) =>
    state[`player${index + 1}`]
      .filter(item => item.pos === finalPath)
      .map(item => ({ ...item })),
  );
  const hasOpponent = piecesAtDestination.some(
    item => item.id[0] !== pieceId[0],
  );

  if (
    hasOpponent &&
    !SAFE_SPOTS.has(finalPath) &&
    !STAR_SPOTS.has(finalPath)
  ) {
    const enemyPiece = piecesAtDestination.find(
      item => item.id[0] !== pieceId[0],
    );
    const enemyPlayerNo = PLAYER_LETTERS.indexOf(enemyPiece.id[0]) + 1;
    updatePiece(state, enemyPlayerNo, enemyPiece.id, 0, 0);
    clearDiceSelection(state);
    return;
  }

  clearDiceSelection(state);
  const isFinishedPlayer = state[`player${playerNo}`].every(
    item => item.travelCount >= 57,
  );
  if (travelCount === 57 && isFinishedPlayer) {
    if (!state.winners.includes(playerNo)) {
      state.winners.push(playerNo);
    }
    state.winner = playerNo;
    return;
  }

  if (state.diceNo === 6 || travelCount === 57) {
    state.chancePlayer = playerNo;
    state.fireworks = travelCount === 57;
    return;
  }

  state.chancePlayer = getNextActivePlayer(
    playerNo,
    state.activePlayers,
    state.winners,
  );
}

function applyContinue(state) {
  if (state.winner === null) {
    throw new Error('There is no winner to continue from.');
  }
  if (state.winners.length >= state.activePlayers.length - 1) {
    throw new Error('The match has finished.');
  }

  const completedPlayer = state.winner;
  state.winner = null;
  state.chancePlayer = getNextActivePlayer(
    completedPlayer,
    state.activePlayers,
    state.winners,
  );
  state.fireworks = false;
  clearDiceSelection(state);
}

function cloneGameState(state) {
  return {
    ...state,
    activePlayers: [...state.activePlayers],
    winners: [...state.winners],
    currentPositions: state.currentPositions.map(position => ({ ...position })),
    player1: state.player1.map(piece => ({ ...piece })),
    player2: state.player2.map(piece => ({ ...piece })),
    player3: state.player3.map(piece => ({ ...piece })),
    player4: state.player4.map(piece => ({ ...piece })),
  };
}

function applyGameAction(state, playerNo, action, diceValue) {
  const nextState = cloneGameState(state);
  if (action.type === 'roll') {
    applyRoll(nextState, playerNo, diceValue);
  } else if (action.type === 'startPiece') {
    applyStartPiece(nextState, playerNo, action.pieceId);
  } else if (action.type === 'movePiece') {
    applyMovePiece(nextState, playerNo, action.pieceId);
  } else if (action.type === 'continue') {
    applyContinue(nextState);
  } else {
    throw new Error('Unsupported game action.');
  }
  return nextState;
}

module.exports = {
  applyGameAction,
  createInitialGameState,
  getNextActivePlayer,
};
