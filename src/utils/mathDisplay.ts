export const formatMultiplicationDisplay = (text: string) => (
  text
    .replace(/[×*]/g, ' x ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
);
