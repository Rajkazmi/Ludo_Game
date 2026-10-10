/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-redux', () => ({
  Provider: ({ children }) => children,
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }) => children,
}));

jest.mock('../Src/redux/store', () => ({
  persistor: {},
  store: {},
}));

jest.mock('../Src/Navigation/Navigation', () => () => 'Navigation');

import App from '../App';

test('renders correctly', async () => {
  let renderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer.toJSON()).toBe('Navigation');
});
