export const isVisualTestMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('visualTest') === '1';
  } catch {
    return false;
  }
};

export const getVisualTestSeed = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('seed');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

