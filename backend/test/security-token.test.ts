import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSecurityToken } from '../src/common/utils/security-token';

test('hashSecurityToken returns a stable sha256 hash', () => {
  const token = 'sample-token';
  const first = hashSecurityToken(token);
  const second = hashSecurityToken(token);

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, token);
});
