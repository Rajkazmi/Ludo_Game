const mockEconomyCommand = jest.fn();

jest.mock('@firebase/functions', () => ({
  httpsCallable: jest.fn(() => (...args) => mockEconomyCommand(...args)),
}));

jest.mock('../Src/config/firebase', () => ({
  functions: { name: 'test-functions' },
}));

import {
  chargeMatchFee,
  claimDailyReward,
  confirmPlayPurchase,
  getEconomy,
  redeemEconomyItem,
} from '../Src/services/economyService';

describe('economy service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEconomyCommand.mockResolvedValue({ data: { gapes_balance: 100 } });
  });

  it('sends authenticated economy commands with their expected payloads', async () => {
    await getEconomy();
    await claimDailyReward();
    await chargeMatchFee('room-1');
    await redeemEconomyItem('classic_frame');
    await confirmPlayPurchase('gapes_099', 'purchase-token');

    expect(mockEconomyCommand.mock.calls.map(([payload]) => payload)).toEqual([
      { command: 'getEconomy' },
      { command: 'claimDailyReward' },
      { command: 'chargeMatchFee', game_mode_id: 'room-1' },
      { command: 'redeemItem', item_id: 'classic_frame' },
      {
        command: 'purchasePackage',
        product_id: 'gapes_099',
        purchase_token: 'purchase-token',
      },
    ]);
  });
});
