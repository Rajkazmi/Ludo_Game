const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyGameAction,
  createInitialGameState,
} = require('../game');

test('a roll uses the server value and enables a valid move', () => {
  const state = createInitialGameState([1, 2]);
  state.player1[0] = { id: 'A1', pos: 1, travelCount: 1 };

  const nextState = applyGameAction(state, 1, { type: 'roll' }, 3);

  assert.equal(nextState.diceNo, 3);
  assert.equal(nextState.isDiceRolled, true);
  assert.equal(nextState.cellSelectionPlayer, 1);
  assert.equal(state.isDiceRolled, false);
});

test('a move advances the piece and turn using the stored dice value', () => {
  const state = createInitialGameState([1, 2]);
  state.player1[0] = { id: 'A1', pos: 1, travelCount: 1 };
  state.diceNo = 2;
  state.isDiceRolled = true;

  const nextState = applyGameAction(state, 1, {
    type: 'movePiece',
    pieceId: 'A1',
    position: 50,
  });

  assert.deepEqual(nextState.player1[0], {
    id: 'A1',
    pos: 3,
    travelCount: 3,
  });
  assert.equal(nextState.chancePlayer, 2);
  assert.deepEqual(nextState.currentPositions, [{ id: 'A1', pos: 3 }]);
});

test('a six can bring a piece out of its base', () => {
  const state = createInitialGameState([1, 2]);
  state.diceNo = 6;
  state.isDiceRolled = true;

  const nextState = applyGameAction(state, 1, {
    type: 'startPiece',
    pieceId: 'A1',
  });

  assert.deepEqual(nextState.player1[0], {
    id: 'A1',
    pos: 1,
    travelCount: 1,
  });
  assert.equal(nextState.isDiceRolled, false);
  assert.deepEqual(nextState.currentPositions, [{ id: 'A1', pos: 1 }]);
});

test('a move captures an opponent on an unprotected square', () => {
  const state = createInitialGameState([1, 2]);
  state.player1[0] = { id: 'A1', pos: 10, travelCount: 10 };
  state.player2[0] = { id: 'B1', pos: 11, travelCount: 11 };
  state.diceNo = 1;
  state.isDiceRolled = true;

  const nextState = applyGameAction(state, 1, {
    type: 'movePiece',
    pieceId: 'A1',
  });

  assert.deepEqual(nextState.player2[0], {
    id: 'B1',
    pos: 0,
    travelCount: 0,
  });
  assert.deepEqual(nextState.currentPositions, [{ id: 'A1', pos: 11 }]);
  assert.equal(nextState.chancePlayer, 1);
});

test('a player follows the existing board turning point into its home lane', () => {
  const state = createInitialGameState([1, 2]);
  state.player1[0] = { id: 'A1', pos: 51, travelCount: 51 };
  state.diceNo = 1;
  state.isDiceRolled = true;

  const nextState = applyGameAction(state, 1, {
    type: 'movePiece',
    pieceId: 'A1',
  });

  assert.equal(nextState.player1[0].pos, 111);
  assert.equal(nextState.player1[0].travelCount, 52);
});

test('an invalid player turn cannot change the game state', () => {
  const state = createInitialGameState([1, 2]);
  assert.throws(
    () => applyGameAction(state, 2, { type: 'roll' }, 6),
    /not this player's turn/,
  );
});

test('a non-six roll with no legal move passes the turn', () => {
  const state = createInitialGameState([1, 2]);
  state.player1[0] = { id: 'A1', pos: 2, travelCount: 56 };

  const nextState = applyGameAction(state, 1, { type: 'roll' }, 2);

  assert.equal(nextState.chancePlayer, 2);
  assert.equal(nextState.isDiceRolled, false);
});
