export const parseDimension = (text: string): number | null => {
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 && value <= 9999 ? value : null;
};
export const checkScaledDimensions = (length: string, width: string, baseLength: number, baseWidth: number, factor: number) => {
  const l = parseDimension(length), w = parseDimension(width);
  return { complete: l !== null && w !== null, lengthCorrect: l !== null && Math.abs(l - baseLength * factor) < .000001, widthCorrect: w !== null && Math.abs(w - baseWidth * factor) < .000001 };
};
