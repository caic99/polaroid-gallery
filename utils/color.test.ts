import { describe, expect, it } from 'vitest';
import { contrastRatio, ensureReadableText } from './color';

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1 for identical colors', () => {
    expect(contrastRatio('#bf3e2d', '#bf3e2d')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(contrastRatio('#fedcba', '#123456'), 10);
  });

  it('handles shorthand hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });
});

describe('ensureReadableText', () => {
  it('keeps a foreground that already reads well', () => {
    expect(ensureReadableText('#ffffff', '#bf3e2d')).toBe('#ffffff');
  });

  it('replaces white-on-pale with a dark fallback', () => {
    expect(ensureReadableText('#ffffff', '#f0ead6')).toBe('#1a1a1a');
  });

  it('replaces near-black-on-dark with white', () => {
    expect(ensureReadableText('#222222', '#151520')).toBe('#ffffff');
  });
});
