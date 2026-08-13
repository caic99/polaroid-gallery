import { describe, expect, it } from 'vitest';
import { getOptimizedImageUrl } from './api';

describe('getOptimizedImageUrl', () => {
  it('appends width, format, and quality params', () => {
    expect(getOptimizedImageUrl('https://cdn.sanity.io/images/x/y/a-100x100.jpg', 400))
      .toBe('https://cdn.sanity.io/images/x/y/a-100x100.jpg?w=400&fm=webp&q=80');
  });

  it('uses & when the URL already has a query string', () => {
    expect(getOptimizedImageUrl('https://example.com/img.jpg?rect=1', 800))
      .toBe('https://example.com/img.jpg?rect=1&w=800&fm=webp&q=80');
  });

  it('returns empty string for empty input', () => {
    expect(getOptimizedImageUrl('', 400)).toBe('');
  });

  it('defaults to width 800', () => {
    expect(getOptimizedImageUrl('https://example.com/img.jpg')).toContain('w=800');
  });
});
