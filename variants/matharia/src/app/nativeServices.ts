import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { nativeAuth } from './nativeAuth';
import { storeRequestDeadline } from './storeRequestDeadline';

export type StorePlan = {
  id: string; name: string; price: string; period: string; periodCount: number;
};
export type StoreAccess = { active: boolean; expiresAt: number | null; configured: boolean };
type StoreUpdate = StoreAccess & { plans?: StorePlan[] };
type StoreStatus = StoreAccess & { plans: StorePlan[] };
interface MathariaServices {
  status(): Promise<StoreStatus>;
  purchase(options: { productId: string; accountToken?: string }): Promise<StoreAccess & { outcome: 'purchased' | 'pending' | 'cancelled' }>;
  restore(): Promise<StoreAccess>;
  signInWithApple(): Promise<{ identityToken: string; nonce: string; authorizationCode?: string }>;
  manageSubscriptions(): Promise<void>;
  setOrientation(options:{orientation:'portrait'|'landscape'}):Promise<void>;
  addListener(event: 'entitlementsChanged', listener: (access: StoreUpdate) => void): Promise<PluginListenerHandle>;
}
const services = registerPlugin<MathariaServices>('MathariaServices');
export const nativeServicesAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('MathariaServices');

export async function readStore() {
  if (!nativeServicesAvailable()) return { active: false, expiresAt: null, configured: false, plans: [] } as StoreStatus;
  return storeRequestDeadline(services.status());
}
export const purchasePlan = (productId: string, accountToken?: string) => services.purchase({ productId, accountToken });
export async function restorePurchases() {
  if (!nativeServicesAvailable()) throw new Error('Restore purchases is available in the iPhone and iPad app.');
  return services.restore();
}
export const manageSubscriptions = () => services.manageSubscriptions();
export const watchStore = (listener: (access: StoreUpdate) => void) => services.addListener('entitlementsChanged', listener);
export const authorizeAppleDeletion = () => services.signInWithApple();
export async function setNativeScreenOrientation(orientation:'portrait'|'landscape') {
  if(nativeServicesAvailable())await services.setOrientation({orientation});
}

export async function signInWithApple() {
  if (!nativeAuth) throw new Error('Parent accounts are temporarily unavailable. Your free practice is still available.');
  if (!nativeServicesAvailable()) throw new Error('Continue with Apple is available in the iPhone and iPad app.');
  const credential = await services.signInWithApple();
  const { error } = await nativeAuth.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: credential.nonce });
  if (error) throw new Error('Apple sign-in could not be completed. Please try again.');
}
