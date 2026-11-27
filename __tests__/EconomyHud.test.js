import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';

const mockGetEconomy = jest.fn();
const mockUseIAP = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => () => null);

jest.mock('react-native-iap', () => ({
  ErrorCode: { UserCancelled: 'user-cancelled' },
  finishTransaction: jest.fn(),
  useIAP: (...args) => mockUseIAP(...args),
}));

jest.mock('../Src/services/economyService', () => ({
  claimDailyReward: jest.fn(),
  confirmPlayPurchase: jest.fn(),
  getEconomy: (...args) => mockGetEconomy(...args),
  PLAY_STORE_PACKAGES: [
    { productId: 'gapes_099', gapes: 1000 },
    { productId: 'gapes_499', gapes: 10000 },
  ],
  redeemEconomyItem: jest.fn(),
}));

import EconomyHud from '../Src/Components/EconomyHud';

const economy = {
  gapes_balance: 100,
  claimed_today: false,
  next_login_reward_day: 1,
  last_login_reward_day: 0,
  login_rewards: [50, 100, 150, 200, 250, 300, 500],
  inventory: {},
  catalog: [
    { id: 'classic_frame', name: 'Classic Frame', price: 250 },
  ],
};

describe('EconomyHud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'loop').mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    }));
    mockGetEconomy.mockResolvedValue(economy);
    mockUseIAP.mockReturnValue({
      connected: false,
      products: [],
      availablePurchases: [],
      fetchProducts: jest.fn().mockResolvedValue(),
      getAvailablePurchases: jest.fn().mockResolvedValue(),
      requestPurchase: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the Lobby and provides the five requested navigation destinations', async () => {
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EconomyHud isAuthenticated username="LudoPlayer">
          <></>
        </EconomyHud>,
      );
    });

    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Navigate to Skin' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Navigate to Events' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Navigate to Lobby' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Navigate to Social' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Navigate to Store' }),
    ).toBeTruthy();

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Navigate to Store' })
        .props.onPress();
    });
    expect(renderer.root.findAllByProps({ children: 'WEEKLY LOGIN BOARD' })
      .length).toBeGreaterThan(0);
  });

  it('opens the weekly reward and store modal from the Gapes badge', async () => {
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <EconomyHud isAuthenticated username="LudoPlayer">
          <></>
        </EconomyHud>,
      );
    });

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: 'Add Gapes' })
        .props.onPress();
    });

    expect(mockGetEconomy).toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ children: 'Gapes & Rewards' }))
      .not.toHaveLength(0);
    expect(renderer.root.findAllByProps({ children: 'BUY GAPES' }))
      .not.toHaveLength(0);
  });
});
