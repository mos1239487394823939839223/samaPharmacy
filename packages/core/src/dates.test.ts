import { describe, it, expect } from 'vitest';
import { formatExpiry, parseExpiry } from './dates';

describe('parseExpiry (expiry typed on purchase / opening stock lines)', () => {
  it.each([
    ['1227', '2027-12-31'],
    ['12/27', '2027-12-31'],
    ['12-2027', '2027-12-31'],
    ['02/28', '2028-02-29'],
    ['022027', '2027-02-28'],
    ['15/12/2027', '2027-12-15'],
    ['15122027', '2027-12-15'],
    ['2027-12-15', '2027-12-15'],
    ['١٢/٢٧', '2027-12-31'],
    ['12ظ27', '2027-12-31'],
    ['15ظ12ظ2027', '2027-12-15'],
    ['12.27', '2027-12-31'],
    ['12 / 27', '2027-12-31'],
    ['2027/12', '2027-12-31'],
    ['2027/12/15', '2027-12-15'],
  ])('%s → %s', (raw, iso) => expect(parseExpiry(raw)).toBe(iso));

  it.each(['', '1', '12', '122', '13/27', '00/27', '31/02/2027', 'abc', '12/2'])('rejects %s', (raw) =>
    expect(parseExpiry(raw)).toBeNull()
  );

  it('round-trips through formatExpiry', () => {
    expect(formatExpiry('2027-12-31')).toBe('12/2027');
    expect(formatExpiry('2027-12-15')).toBe('15/12/2027');
    expect(parseExpiry(formatExpiry('2027-12-15'))).toBe('2027-12-15');
    expect(parseExpiry(formatExpiry('2027-12-31'))).toBe('2027-12-31');
  });
});
