import masterBank from './externalQuestionBanks/sats_2017_2025_answer_keyed_master_question_bank.json';
import { reshuffleAvoidingRepeat } from '../../utils/questionShuffle';

export type AnswerKeyedMode = 'multipleChoice' | 'open';

export type AnswerKeyedQuestionRow = {
  id: string;
  sourceYear?: string;
  sourcePaper?: string;
  sourceQuestion?: string;
  gameKey: string;
  question: string;
  answerMode: AnswerKeyedMode;
  correctAnswer: string;
  answers: string[];
  marks?: string;
  needsReview?: boolean;
};

const rows = masterBank as unknown as AnswerKeyedQuestionRow[];

type QueueState<T> = {
  order: T[];
  index: number;
  last: T | null;
};

const queues = new Map<string, QueueState<AnswerKeyedQuestionRow>>();

const getRowKey = (row: AnswerKeyedQuestionRow) => row.id || row.question;

const ensureQueue = (key: string, eligible: AnswerKeyedQuestionRow[]) => {
  const cached = queues.get(key);
  if (cached && cached.order.length) return cached;
  const order = reshuffleAvoidingRepeat(eligible, null, getRowKey);
  const next: QueueState<AnswerKeyedQuestionRow> = { order, index: 0, last: null };
  queues.set(key, next);
  return next;
};

export const getAnswerKeyedRowsForGame = (
  gameKey: string,
  mode?: AnswerKeyedMode,
  onlyReviewed = true,
): AnswerKeyedQuestionRow[] => {
  const normalizedKey = String(gameKey).trim();
  return rows.filter((row) => {
    if (!row || row.gameKey !== normalizedKey) return false;
    if (mode && row.answerMode !== mode) return false;
    if (onlyReviewed && row.needsReview) return false;
    if (!row.correctAnswer || String(row.correctAnswer).trim().length === 0) return false;
    if (row.answerMode === 'multipleChoice') {
      if (!Array.isArray(row.answers) || row.answers.length < 2) return false;
    }
    return true;
  });
};

export const pickNextAnswerKeyedQuestion = (opts: {
  gameKey: string;
  mode?: AnswerKeyedMode;
  queueKey: string;
  onlyReviewed?: boolean;
}): AnswerKeyedQuestionRow | null => {
  const eligible = getAnswerKeyedRowsForGame(opts.gameKey, opts.mode, opts.onlyReviewed ?? true);
  if (!eligible.length) return null;

  const queue = ensureQueue(opts.queueKey, eligible);
  if (queue.index >= queue.order.length) {
    const nextOrder = reshuffleAvoidingRepeat(eligible, queue.last, getRowKey);
    queue.order = nextOrder;
    queue.index = 0;
  }

  const next = queue.order[queue.index];
  queue.index += 1;
  queue.last = next;
  return next;
};

