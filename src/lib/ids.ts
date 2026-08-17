export type EntityPrefix =
  | 'SHOP'
  | 'USER'
  | 'PROD'
  | 'CUST'
  | 'SUP'
  | 'PUR'
  | 'SALE'
  | 'PAY'
  | 'STK'
  | 'LED'
  | 'AUDIT'
  | 'SYNC';

export function createId(prefix: EntityPrefix): string {
  const random = crypto.randomUUID().replaceAll('-', '').toUpperCase();
  return `${prefix}-${random}`;
}

export function createOperationId(): string {
  return `OP-${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`;
}
