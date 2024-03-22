import { test, expect, mock } from 'bun:test';
import * as RedisClientModule from '../../db/redis/RedisClient';
import { BaseState } from '../../state/BaseState';

// Simplified and adjusted mock setup
const mockedRedisClient = {
  set: mock(async () => 'mocked set'),
  get: mock(async () => JSON.stringify({ key: 'mocked get' })),
  publish: mock(async () => 'mocked publish'),
  subscribe: mock(async () => 'mocked subscribe'),
  getPublisher: () => mockedRedisClient,
};

mock.module('../../db/redis/RedisClient', () => ({
  redisClient: mockedRedisClient,
  redisPubClient: mockedRedisClient,
  redisSubClient: mockedRedisClient,
}));

test('RedisClient class mock', async () => {
  // Assuming you've imported redisClient in the test context
  const { redisClient } = RedisClientModule;
  expect(redisClient).toBeDefined();

  // Now, redisClient is your mocked instance.
  // You can proceed with your test cases.
});

test('BaseState', async () => {
  const baseState = new BaseState('test', { isReady: false });
  expect(baseState).toBeDefined();
});

test('BaseState initializes with state from Redis', async () => {
  // Arrange
  const initialState = { isReady: true };
  mockedRedisClient.get.mockResolvedValue(JSON.stringify(initialState));

  // Act
  const baseState = new BaseState('test', { isReady: true });
  await new Promise(process.nextTick); // Ensures async operations complete

  // Assert
  expect(baseState.state).toEqual(initialState);
});

test('BaseState updates local state', async () => {
  const baseState = new BaseState('test', { isReady: false });
  const newState = { isReady: true };

  // Act: Update the state
  baseState.state = newState;

  // Assert: The internal state reflects the new state
  expect(baseState.state).toEqual(newState);
});

test('BaseState synchronizes state with Redis', async () => {
  const prefix = 'test';
  const baseState = new BaseState(prefix, { isReady: false });
  const newState = { isReady: true };

  // Reset mocks to clear any prior calls
  mockedRedisClient.set.mockClear();

  // Act: Update the state
  baseState.state = newState;
  await new Promise(process.nextTick);
  // Assert: Redis `set` was called with the correct key and serialized state
  expect(mockedRedisClient.set).toHaveBeenCalledWith(
    baseState.prefixKey,
    JSON.stringify(newState)
  );
});

test('BaseState publishes state changes', async () => {
  const baseState = new BaseState('test', { isReady: false });
  const newState = { isReady: true };

  // Reset mocks to ensure a clean state for publication assertions
  mockedRedisClient.getPublisher().publish.mockClear();

  // Act: Update the state
  baseState.state = newState;

  // Assert: The new state was published to the correct channel
  expect(mockedRedisClient.getPublisher().publish).toHaveBeenCalledWith(
    baseState.channelName,
    JSON.stringify(newState)
  );
});
