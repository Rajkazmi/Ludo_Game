import {
  getNextActivePlayer,
  getPlayerPlacement,
  getTurnAfterPlayerLeaves,
  isFinalPlacement,
} from '../Src/helpers/GameTurn';

describe('player placement progression', () => {
  it('keeps the four-player game open for first and second place', () => {
    const activePlayers = [1, 2, 3, 4];
    const winners = [1, 2];

    expect(isFinalPlacement(winners, activePlayers)).toBe(false);
    expect(getNextActivePlayer(2, activePlayers, winners)).toBe(3);
    expect(getPlayerPlacement(winners, 1)).toBe(1);
    expect(getPlayerPlacement(winners, 2)).toBe(2);
  });

  it('ends when the third of four players finishes and leaves one last place', () => {
    const activePlayers = [1, 2, 3, 4];
    const winners = [1, 2, 3];

    expect(isFinalPlacement(winners, activePlayers)).toBe(true);
    expect(getPlayerPlacement(winners, 3)).toBe(3);
    expect(activePlayers.filter(player => !winners.includes(player))).toEqual([
      4,
    ]);
  });

  it('skips finished and inactive seats when selecting the next player', () => {
    expect(getNextActivePlayer(4, [1, 2, 4], [1, 4])).toBe(2);
    expect(getNextActivePlayer(2, [1, 2, 3], [2])).toBe(3);
  });

  it('ends a two-player match after the first player finishes', () => {
    expect(isFinalPlacement([3], [1, 3])).toBe(true);
    expect(getPlayerPlacement([3], 3)).toBe(1);
    expect(getNextActivePlayer(3, [1, 3], [3])).toBe(1);
  });

  it('removes a leaving player and advances their pending turn', () => {
    expect(
      getTurnAfterPlayerLeaves(2, [1, 2, 3], [], 2),
    ).toEqual({
      activePlayers: [1, 3],
      chancePlayer: 3,
      turnChanged: true,
    });
  });

  it('preserves the placement order when a finished player leaves', () => {
    expect(
      getTurnAfterPlayerLeaves(2, [1, 2, 3], [2], 1),
    ).toEqual({
      activePlayers: [1, 2, 3],
      chancePlayer: 1,
      turnChanged: false,
    });
  });

  it('does not change turns for a player who is already absent', () => {
    expect(
      getTurnAfterPlayerLeaves(2, [1, 3], [], 1),
    ).toEqual({
      activePlayers: [1, 3],
      chancePlayer: 1,
      turnChanged: false,
    });
  });
});
