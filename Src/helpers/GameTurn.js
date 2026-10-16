export const getNextActivePlayer = (playerNo, activePlayers, winners) => {
  for (let offset = 1; offset <= 4; offset += 1) {
    const candidate = ((playerNo - 1 + offset) % 4) + 1;
    if (activePlayers.includes(candidate) && !winners.includes(candidate)) {
      return candidate;
    }
  }

  return playerNo;
};

export const getTurnAfterPlayerLeaves = (
  playerNo,
  activePlayers,
  winners,
  chancePlayer,
) => {
  if (!activePlayers.includes(playerNo) || winners.includes(playerNo)) {
    return { activePlayers, chancePlayer, turnChanged: false };
  }

  const remainingPlayers = activePlayers.filter(
    activePlayer => activePlayer !== playerNo,
  );
  const turnChanged = chancePlayer === playerNo;

  return {
    activePlayers: remainingPlayers,
    chancePlayer: turnChanged
      ? getNextActivePlayer(playerNo, remainingPlayers, winners)
      : chancePlayer,
    turnChanged,
  };
};

export const getPlayerPlacement = (winners, playerNo) =>
  Math.max(winners.indexOf(playerNo) + 1, 1);

export const isFinalPlacement = (winners, activePlayers) =>
  winners.length >= activePlayers.length - 1;
