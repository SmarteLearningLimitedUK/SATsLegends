export type NativeSyncChange = {
  key: string;
  value: string | null;
  updatedAt: number;
  deviceId: string;
};

export type NativeSyncBridge = {
  isAvailable?: () => boolean | Promise<boolean>;
  pushChanges?: (changes: NativeSyncChange[]) => void | Promise<void>;
  pullChanges?: () => NativeSyncChange[] | Promise<NativeSyncChange[]>;
};

declare global {
  interface Window {
    SatsLegendsNativeSync?: NativeSyncBridge;
  }
}

const DEVICE_ID_KEY = 'sats-legends-device-id';

export const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
};

export const getNativeSyncBridge = () => (
  typeof window === 'undefined' ? undefined : window.SatsLegendsNativeSync
);

export const isNativeSyncAvailable = async () => {
  const bridge = getNativeSyncBridge();
  if (!bridge?.pushChanges) return false;
  if (!bridge.isAvailable) return true;

  try {
    return Boolean(await bridge.isAvailable());
  } catch {
    return false;
  }
};

