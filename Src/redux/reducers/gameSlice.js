import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './initialState';

export const gameSlice = createSlice({
  name: 'game',
  initialState: initialState,
  reducers: {
    resetGame: () => initialState,
    announceWinner: (state, action) => {
      state.winner = action.payload;
    },
    updateFireworks: (state, action) => {
      state.firworks = action.payload;
    },
    updateDiceNo: (state, action) => {
      state.diceNo = action.payload.diceNo;
      state.isDiceRolled = true;
    },
    enablePileSelection: (state, action) => {
      state.touchDiceBlock = true;
      state.pileSelectionPlayer = action.payload.playerNo;
    },
    updatePlayerChance: (state, action) => {
      state.chancePlayer = action.payload.chancePlayer;
      state.touchDiceBlock = false;
      state.isDiceRolled = false;
    },
    enableCellSelection: (state, action) => {
      state.touchDiceBlock = true;
      state.cellSelectionPlayer = action.payload.playerNo;
    },
    unfreezeDice: state => {
      state.touchDiceBlock = false;
      state.isDiceRolled = false;
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
  updateFireworks,
  enableCellSelection,
  updatePlayerPieceValue,
  unfreezeDice,
  disableTouch,
} = gameSlice.actions;

export default gameSlice.reducer;
