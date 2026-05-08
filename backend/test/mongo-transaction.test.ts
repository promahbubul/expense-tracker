import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithOptionalTransaction } from '../src/common/utils/mongo-transaction';

test('runWithOptionalTransaction returns transactional result when transactions are supported', async () => {
  let ended = false;
  const session = {
    async withTransaction(callback: () => Promise<void>) {
      await callback();
    },
    async endSession() {
      ended = true;
    },
  };

  const result = await runWithOptionalTransaction(
    { startSession: async () => session } as never,
    async () => 'transactional-result',
    async () => 'fallback-result',
  );

  assert.equal(result, 'transactional-result');
  assert.equal(ended, true);
});

test('runWithOptionalTransaction falls back on standalone Mongo deployments', async () => {
  const session = {
    async withTransaction() {
      throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
    },
    async endSession() {
      return undefined;
    },
  };

  const result = await runWithOptionalTransaction(
    { startSession: async () => session } as never,
    async () => 'transactional-result',
    async () => 'fallback-result',
  );

  assert.equal(result, 'fallback-result');
});
