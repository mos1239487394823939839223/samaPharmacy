import { describe, it, expect } from 'vitest';
import { code128Patterns, encodeCode128B, code128Svg } from './code128';

describe('code128', () => {
  it('every symbol is 11 modules wide (stop is 13) with 3 bars and 3 spaces', () => {
    const patterns = code128Patterns();
    expect(patterns).toHaveLength(107);
    patterns.forEach((p, i) => {
      const sum = p.split('').map(Number).reduce((a, b) => a + b, 0);
      expect(sum).toBe(i === 106 ? 13 : 11);
    });
    expect(new Set(patterns).size).toBe(107);
  });

  it('encodes start B, data, checksum and stop', () => {
    // "12": values 17, 18 → checksum (104 + 17·1 + 18·2) % 103 = 54.
    const widths = encodeCode128B('12');
    const symbols = [104, 17, 18, 54, 106].flatMap((s) => code128Patterns()[s]!.split('').map(Number));
    expect(widths).toEqual(symbols);
  });

  it('rejects characters outside printable ASCII', () => {
    expect(() => encodeCode128B('١٢')).toThrow();
  });

  it('renders an svg', () => {
    expect(code128Svg('62341')).toMatch(/^<svg/);
  });
});
