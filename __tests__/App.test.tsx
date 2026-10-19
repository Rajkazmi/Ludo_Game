/**
 * @format
 */

import React, { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestRenderer as TestRenderer } from 'react-test-renderer';

jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../Src/redux/store', () => ({
  persistor: {},
  store: {},
}));

jest.mock('../Src/Navigation/Navigation', () => () => 'Navigation');

import App from '../App';

test('renders correctly', async () => {
  let renderer: TestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  if (!renderer) {
    throw new Error('Renderer did not initialize');
  }

  expect(renderer.toJSON()).toBe('Navigation');
});
