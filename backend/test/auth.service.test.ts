import test from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

function setMailEnv() {
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@example.com';
  process.env.SMTP_PASS = 'password';
  process.env.MAIL_FROM = 'App <test@example.com>';
  process.env.APP_PUBLIC_WEB_URL = 'http://localhost:3000';
}

function createService(users: Record<string, unknown>) {
  return new AuthService(users as never, {} as never, {} as never, { sign: () => 'token', verify: () => ({}) } as never, {} as never);
}

test('login blocks local accounts until email is verified', async () => {
  const password = await bcrypt.hash('secret123', 10);
  const service = createService({
    findOne: async () => ({
      _id: { toString: () => 'user-1' },
      email: 'user@example.com',
      name: 'User',
      password,
      isActive: true,
      emailVerified: false,
      authProvider: 'LOCAL',
    }),
  });

  await assert.rejects(() => service.login({ email: 'user@example.com', password: 'secret123' }), (error) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.match(error.message, /verify your email/i);
    return true;
  });
});

test('forgotPassword returns a generic success response when the user does not exist', async () => {
  setMailEnv();
  const service = createService({
    findOne: async () => null,
  });

  const response = await service.forgotPassword({ email: 'missing@example.com' });

  assert.equal(response.success, true);
  assert.match(response.message, /if the account exists/i);
});
