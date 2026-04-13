export const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const reshuffleAvoidingRepeat = <T,>(
  items: T[],
  lastItem: T | null | undefined,
  getKey: (item: T) => string | number = (item) =>
    (item as { id?: string | number }).id ?? String(item),
) => {
  if (items.length <= 1) return [...items];
  const order = shuffle(items);
  if (!lastItem) return order;
  const lastKey = getKey(lastItem);
  if (getKey(order[0]) !== lastKey) return order;
  const swapIndex = order.findIndex((item) => getKey(item) !== lastKey);
  if (swapIndex <= 0) return order;
  [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
  return order;
};

export const shuffleOptionsWithAnswerIndex = (
  options: string[],
  answerIndex: number,
) => {
  const correct = options[answerIndex];
  const shuffled = shuffle(options);
  const nextIndex = Math.max(0, shuffled.indexOf(correct));
  return { options: shuffled, answerIndex: nextIndex };
};

export const shuffleOptionsWithCorrect = <T,>(options: T[], correct: T) => {
  const shuffled = shuffle(options);
  if (!shuffled.includes(correct)) {
    shuffled[0] = correct;
  }
  return { options: shuffled, correct };
};
