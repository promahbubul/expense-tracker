import { ConflictException } from '@nestjs/common';

export function assertNotStale(currentUpdatedAt: Date | string | undefined, expectedUpdatedAt?: string) {
  if (!expectedUpdatedAt) {
    return;
  }

  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.valueOf())) {
    return;
  }

  const current = currentUpdatedAt ? new Date(currentUpdatedAt) : null;
  if (!current || current.toISOString() !== expected.toISOString()) {
    throw new ConflictException('Record changed on another device. Refresh and try again.');
  }
}
