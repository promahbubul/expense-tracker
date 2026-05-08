import type { ClientSession, Connection } from 'mongoose';

const UNSUPPORTED_TRANSACTION_MESSAGES = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'Transaction support is not available',
  'transactions are not supported',
];

export async function runWithOptionalTransaction<T>(
  connection: Connection,
  transactionalWork: (session: ClientSession) => Promise<T>,
  fallbackWork: () => Promise<T>,
) {
  const session = await connection.startSession();

  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await transactionalWork(session);
    });

    if (typeof result === 'undefined') {
      return await fallbackWork();
    }

    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return await fallbackWork();
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupported(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return UNSUPPORTED_TRANSACTION_MESSAGES.some((fragment) => message.includes(fragment));
}
