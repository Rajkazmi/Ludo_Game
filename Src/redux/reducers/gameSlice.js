import { createSlice } from '@reduxjs/toolkit';
import {
  getNextActivePlayer,
  getTurnAfterPlayerLeaves,
} from '../../helpers/GameTurn';
import { initialState } from './initialState';

export const gameSlice = createSlice({
  name: 'game',
  initialState: initialState,
  reducers: {
    resetGame: (_state, action) =>
      action.payload?.activePlayers
        ? { ...initialState, activePlayers: action.payload.activePlayers }
        : initialState,
    announceWinner: (state, action) => {
      if (!state.winners.includes(action.payload)) {
        state.winners.push(action.payload);
      }
      state.winner = action.payload;
    },
    dismissWinner: state => {
      if (state.winners.length >= state.activePlayers.length - 1) {
        return;
      }

      const completedPlayer = state.winner;
      state.winner = null;
      state.chancePlayer = getNextActivePlayer(
        completedPlayer,
        state.activePlayers,
        state.winners,
      );
      state.touchDiceBlock = false;
      state.isDiceRolled = false;
      state.pileSelectionPlayer = -1;
      state.cellSelectionPlayer = -1;
      state.fireworks = false;
    },
    setActivePlayers: (state, action) => {
      state.activePlayers = action.payload;
    },
    removeActivePlayer: (state, action) => {
      const {
        activePlayers,
        chancePlayer,
        turnChanged,
      } = getTurnAfterPlayerLeaves(
        action.payload,
        state.activePlayers,
        state.winners,
        state.chancePlayer,
      );
      state.activePlayers = activePlayers;
      if (turnChanged) {
        state.chancePlayer = chancePlayer;
        state.isDiceRolled = false;
        state.touchDiceBlock = false;
        state.pileSelectionPlayer = -1;
        state.cellSelectionPlayer = -1;
      }
    },
    replaceGameState: (_state, action) => action.payload,
    updateFireworks: (state, action) => {
      state.fireworks = action.payload;
    },
    updateDiceNo: (state, action) => {
      state.diceNo = action.payload.diceNo;
      state.isDiceRolled = true;
      state.pileSelectionPlayer = -1;
      state.cellSelectionPlayer = -1;
    },
    enablePileSelection: (state, action) => {
      state.touchDiceBlock = true;
      state.pileSelectionPlayer = action.payload.playerNo;
    },
    updatePlayerChance: (state, action) => {
      state.chancePlayer = action.payload.chancePlayer;
      state.touchDiceBlock = false;
      state.isDiceRolled = false;
      state.pileSelectionPlayer = -1;
      state.cellSelectionPlayer = -1;
    },
    enableCellSelection: (state, action) => {
      state.touchDiceBlock = true;
      state.cellSelectionPlayer = action.payload.playerNo;
    },
    unfreezeDice: state => {
      state.touchDiceBlock = false;
      state.isDiceRolled = false;
      state.pileSelectionPlayer = -1;
      state.cellSelectionPlayer = -1;
    },
    disableTouch: state => {
      state.touchDiceBlock = true;
      state.cellSelectionPlayer = -1;
      state.pileSelectionPlayer = -1;
    },
    
    updatePlayerPieceValue: (state, action) => {
      const { playerNo, pieceId, pos, travelCount } = action.payload;
      const playerPieces = state[playerNo];
      const piece = playerPieces.find(p => p.id === pieceId);
      state.pileSelectionPlayer = -1;
      if (piece) {
        piece.pos = pos;
        piece.travelCount = travelCount;

        const currentPositionIndex = state.currentPositions.findIndex(
          p => p.id === pieceId,
        );
        if (pos === 0) {
          if (currentPositionIndex !== -1) {
            state.currentPositions.splice(currentPositionIndex, 1);
          }
        } else {
          if (currentPositionIndex !== -1) {
            state.currentPositions[currentPositionIndex] = {
              id: pieceId,
              pos,
            };
          } else {
            state.currentPositions.push({ id: pieceId, pos });
          }
        }
      }
    },
  },
});

export const {
  resetGame,
  updatePlayerChance,
  enablePileSelection,
  updateDiceNo,
  announceWinner,
  dismissWinner,
  setActivePlayers,
  removeActivePlayer,
  replaceGameState,
  updateFireworks,
  enableCellSelection,
  updatePlayerPieceValue,
  unfreezeDice,
  disableTouch,
} = gameSlice.actions;

export default gameSlice.reducer;
