import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsPresent } from 'motion/react';

/** Keeps delayed activity completion singular and cancels it when the player leaves. */
export const useWellbeingCompletion = (onComplete: () => void, onCancel?: () => void) => {
  const [finished, setFinished] = useState(false);
  const isPresent = useIsPresent();
  const finishedRef = useRef(false);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const presentRef = useRef(isPresent);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  presentRef.current = isPresent;
  onCancelRef.current = onCancel;

  const cancel = useCallback(() => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    onCancelRef.current?.();
  }, []);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  // AnimatePresence retains the screen during exit, so unmount cleanup alone is too late.
  useLayoutEffect(() => { if (!isPresent) cancel(); }, [cancel, isPresent]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const finish = useCallback((delay: number) => {
    if (finishedRef.current || cancelledRef.current || !mountedRef.current || !presentRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (mountedRef.current && presentRef.current && !cancelledRef.current) onCompleteRef.current();
    }, delay);
  }, []);

  return { finished, finish, cancel };
};
