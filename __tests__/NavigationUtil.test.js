jest.mock('../Src/Navigation/Navigation', () => ({
  NavigationRef: {
    canGoBack: jest.fn(),
    dispatch: jest.fn(),
    isReady: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    goBack: () => ({ type: 'GO_BACK' }),
  },
  StackActions: {},
}));

import { NavigationRef } from '../Src/Navigation/Navigation';
import { goBack } from '../Src/helpers/NavigationUtil';

describe('goBack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NavigationRef.isReady.mockReturnValue(true);
    NavigationRef.canGoBack.mockReturnValue(false);
  });

  it('does not dispatch when the navigator has no previous screen', async () => {
    await expect(goBack()).resolves.toBe(false);
    expect(NavigationRef.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches a back action when the navigator can go back', async () => {
    NavigationRef.canGoBack.mockReturnValue(true);

    await expect(goBack()).resolves.toBe(true);
    expect(NavigationRef.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GO_BACK' }),
    );
  });
});
