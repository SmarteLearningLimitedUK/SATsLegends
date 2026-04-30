const normalizeMathWhitespace = (text: string) => (
  text
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
);

/**
 * Display normalizer for math operators across the UI.
 * - Percent: "50 percent" / "50 per cent" -> "50%"
 * - Division: " / " -> " ÷ " (conservative: avoids rewriting fractions like "3/4")
 * - Multiplication: ×, *, · -> x
 */
export const formatMathOperatorsDisplay = (text: string) => {
  const normalizedEncoding = text
    .replace(/Ã—/g, '×')
    .replace(/Ã·/g, '÷');

  const withPercent = normalizedEncoding.replace(
    /(\d+(?:\.\d+)?)\s*(?:percent|per\s*cent)\b/gi,
    '$1%',
  );

  const withDivision = withPercent.replaceAll(' / ', ' ÷ ');
  const withMultiplication = withDivision.replace(/[×*·]/g, ' x ');

  return normalizeMathWhitespace(withMultiplication);
};

// Backwards-compatible export (many games call this today).
export const formatMultiplicationDisplay = (text: string) => (
  formatMathOperatorsDisplay(text)
);

