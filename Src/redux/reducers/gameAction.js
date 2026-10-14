import {
  SafeSpots,
  StarSpots,
  startingPoints,
  turningPoints,
  victoryStart,
} from '../../helpers/PlotData';
import { playSound } from '../../helpers/SoundUtility';
import { selectCurrentPositions, selectDiceNo } from './gameSelector';
import {
  announceWinner,
  disableTouch,
  enableCellSelection,
  enablePileSelection,
  unfreezeDice,
  updateDiceNo,
  updateFireworks,
  updatePlayerChance,
  updatePlayerPieceValue,
} from './gameSlice';
import { getNextActivePlayer } from '../../helpers/GameTurn';
import { sendRoomAction } from '../../services/OnlineGameService';
import { setOnlineError } from '../onlineSlice';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const MOVEMENT_SOUND_START_DELAY_MS = 50;
const MOVEMENT_STEP_DELAY_MS = 300;

export const handleDiceRollThunk =
  (playerNo, requestedDiceNo) => (dispatch, getState) => {
    const { game, online } = getState();
    if (online.roomCode) {
      if (online.playerNo !== playerNo) {
        return;
      }
      sendRoomAction(online.roomCode, { type: 'roll', playerNo }).catch(
        error => dispatch(setOnlineError(error.message)),
      );
      return;
    }

    const activePlayers = game.activePlayers ?? [1, 2, 3, 4];
    const winners = game.winners ?? [];
    if (
      game.winner !== null ||
      game.chancePlayer !== playerNo ||
      !activePlayers.includes(playerNo) ||
      winners.includes(playerNo) ||
      game.isDiceRolled
    ) {
      return;
    }

    const diceNo = requestedDiceNo ?? Math.floor(Math.random() * 6) + 1;
    dispatch(updateDiceNo({ diceNo }));

    const playerPieces = game[`player${playerNo}`];
    const hasMovablePiece = playerPieces.some(
      piece => piece.pos !== 0 && piece.travelCount + diceNo <= 57,
    );
    const hasLockedPiece = playerPieces.some(piece => piece.pos === 0);

    if (diceNo === 6 && hasLockedPiece) {
      dispatch(enablePileSelection({ playerNo }));
    }
    if (hasMovablePiece) {
      dispatch(enableCellSelection({ playerNo }));
    }
    if (!hasMovablePiece && !(diceNo === 6 && hasLockedPiece)) {
      dispatch(
        updatePlayerChance({
          chancePlayer: getNextActivePlayer(
            playerNo,
            activePlayers,
            winners,
          ),
        }),
      );
    }
  };

export const handleStartPieceThunk =
  (playerNo, pieceId) => async (dispatch, getState) => {
    const { game, online } = getState();
    if (online.roomCode) {
      if (online.playerNo !== playerNo) {
        return;
      }
      try {
        await sendRoomAction(online.roomCode, {
          type: 'startPiece',
          playerNo,
          pieceId,
        });
      } catch (error) {
        dispatch(setOnlineError(error.message));
      }
      return;
    }

    const piece = game[`player${playerNo}`].find(item => item.id === pieceId);
    const activePlayers = game.activePlayers ?? [1, 2, 3, 4];
    const winners = game.winners ?? [];
    if (
      !piece ||
      game.winner !== null ||
      game.chancePlayer !== playerNo ||
      !activePlayers.includes(playerNo) ||
      winners.includes(playerNo) ||
      game.diceNo !== 6 ||
      piece.pos !== 0
    ) {
      return;
    }

    await playSound('pile_move');
    await delay(MOVEMENT_SOUND_START_DELAY_MS);
    dispatch(
      updatePlayerPieceValue({
        playerNo: `player${playerNo}`,
        pieceId,
        pos: startingPoints[playerNo - 1],
        travelCount: 1,
      }),
    );
    dispatch(unfreezeDice());
  };

function checkWinningCriteria(pieces) {
  for (let piece of pieces) {
    if (piece.travelCount < 57) {
      return false; // if any piece has travelCount less than 57, return false
    }
  }
  return true; // if all pieces have travelCount >= 57, return true
}

export const handleForwardThunk =
  (playerNo, id, pos) => async (dispatch, getState) => {
    const rootState = getState();
    const state = rootState.game;
    const online = rootState.online;
    if (online.roomCode) {
      if (
        online.playerNo !== playerNo ||
        state.chancePlayer !== playerNo ||
        !state.isDiceRolled
      ) {
        return;
      }
      try {
        await sendRoomAction(online.roomCode, {
          type: 'movePiece',
          playerNo,
          pieceId: id,
          position: pos,
        });
      } catch (error) {
        dispatch(setOnlineError(error.message));
      }
      return;
    }

    const activePlayers = state.activePlayers ?? [1, 2, 3, 4];
    const winners = state.winners ?? [];
    if (
      state.winner !== null ||
      state.chancePlayer !== playerNo ||
      !activePlayers.includes(playerNo) ||
      winners.includes(playerNo) ||
      !state.isDiceRolled
    ) {
      return;
    }
    const plottedPieces = selectCurrentPositions(rootState);
    const diceNo = selectDiceNo(rootState);
    const piecesAtPosition = plottedPieces.filter(item => item.pos === pos);
    const piece = piecesAtPosition.find(item => item.id === id);
    if (!piece) {
      return;
    }

    dispatch(disableTouch());
    let finalPath = piece.pos;
    const beforePlayerPiece = state[`player${playerNo}`].find(
      item => item.id === id,
    );
    if (
      !beforePlayerPiece ||
      beforePlayerPiece.pos !== pos ||
      beforePlayerPiece.travelCount + diceNo > 57
    ) {
      dispatch(unfreezeDice());
      return;
    }
    let travelCount = beforePlayerPiece.travelCount;
    for (let i = 0; i < diceNo; i++) {
      const updatePosition = getState();
      const playerPiece = updatePosition.game[`player${playerNo}`].find(
        item => item.id === id,
      );
      let path = playerPiece.pos + 1;

      if (turningPoints.includes(path) && turningPoints[playerNo - 1] === path) {
        path = victoryStart[playerNo - 1];
      }
      if (path === 53) {
        path = 1;
      }
      finalPath = path;
      travelCount += 1;

      await playSound('pile_move');
      await delay(MOVEMENT_SOUND_START_DELAY_MS);
      dispatch(
        updatePlayerPieceValue({
          playerNo: `player${playerNo}`,
          pieceId: playerPiece.id,
          pos: path,
          travelCount: travelCount,
        }),
      );

      await delay(MOVEMENT_STEP_DELAY_MS);
    }

    //Ensure state is updated after movement
    const updatedState = getState();
    const updatedPlottedPieces = selectCurrentPositions(updatedState);

    //CheckColliding
    const finalPlot = updatedPlottedPieces.filter(
      item => item.pos === finalPath,
    );
    const ids = finalPlot?.map(item => item.id[0]);
    const uniqueIds = new Set(ids);
    const areDifferentIds = uniqueIds.size > 1;

    if (SafeSpots.includes(finalPath) || StarSpots.includes(finalPath)) {
      playSound('safe_spot');
    }
    if (
      areDifferentIds &&
      !SafeSpots.includes(finalPath) &&
      !StarSpots.includes(finalPath)
    ) {
      const enemyPiece = finalPlot.find(finalPiece => finalPiece.id[0] !== id[0]);
      const enemyId = enemyPiece.id[0];
      const no =
        enemyId === 'A' ? 1 : enemyId === 'B' ? 2 : enemyId === 'C' ? 3 : 4;

      playSound('collide');
      dispatch(
        updatePlayerPieceValue({
          playerNo: `player${no}`,
          pieceId: enemyPiece.id,
          pos: 0,
          travelCount: 0,
        }),
      );

      dispatch(unfreezeDice());
      return;
    }
    //Check Six Dice
    if (diceNo === 6 || travelCount === 57) {
      dispatch(updatePlayerChance({ chancePlayer: playerNo }));
      if (travelCount === 57) {
        playSound('home_win');
        const finalPlayerState = getState();
        const playerAllPieces = finalPlayerState.game[`player${playerNo}`];
        if (checkWinningCriteria(playerAllPieces)) {
          dispatch(announceWinner(playerNo));
          playSound(`cheer`, true);
          return;
        }
        dispatch(updateFireworks(true));
        dispatch(unfreezeDice());
        return;
      }
    } else {
      const latestGameState = getState().game;
      const chancePlayer = getNextActivePlayer(
        playerNo,
        latestGameState.activePlayers ?? [1, 2, 3, 4],
        latestGameState.winners ?? [],
      );
      dispatch(updatePlayerChance({ chancePlayer }));
    }
  };
