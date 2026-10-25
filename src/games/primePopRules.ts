export const isPrimeNumber = (value: number): boolean => {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
};

/** Keep at least two prime opportunities in circulation, even with unlucky RNG. */
export const choosePrimePopValue = (maxNumber: number, primeChance: number, activeValues: number[], random = Math.random): number => {
  const prime = activeValues.filter(isPrimeNumber).length < 2 || random() < primeChance;
  const pool = Array.from({length: maxNumber - 1}, (_, index) => index + 2)
    .filter(value => isPrimeNumber(value) === prime);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
};

/** Percent coordinates must use the rendered pixel radius, not the art-size token. */
export const crossedPrimePopLine = (y: number, diameterPx: number, fieldHeight: number, lineY: number): boolean =>
  y - (diameterPx / 2 / Math.max(1, fieldHeight) * 100) <= lineY;
