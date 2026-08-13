// WCAG relative-luminance helpers used to keep palette-derived text readable.

const hexToRgb = (hex: string) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (match, r, g, b) => (void match, r + r + g + g + b + b));
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const contrastRatio = (fg: string, bg: string) => {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Return `fg` if it clears a minimum contrast ratio against `bg`;
 * otherwise fall back to whichever of white/near-black reads better.
 * Sanity's palette foregrounds are usually fine, but some swatches pair
 * e.g. #fff over a pale background.
 */
export const ensureReadableText = (fg: string, bg: string, minRatio = 3) => {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  return contrastRatio('#ffffff', bg) >= contrastRatio('#1a1a1a', bg) ? '#ffffff' : '#1a1a1a';
};
