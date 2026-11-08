import {useSyncExternalStore} from 'react';
import {useNativeAppBackgrounded} from '../../../src/platform/nativeApp';
import {calmOrientationFor} from './compositions';
/** Preserve an activity while its supported orientation is unavailable. */
export function useCalmViewPaused(activityId:string|undefined){
 const query=`(orientation: ${calmOrientationFor(activityId)})`;
 const unavailable=useSyncExternalStore(notify=>{
  const media=window.matchMedia(query);media.addEventListener('change',notify);document.addEventListener('visibilitychange',notify);
  return()=>{media.removeEventListener('change',notify);document.removeEventListener('visibilitychange',notify);};
 },()=>Boolean(activityId)&&(!window.matchMedia(query).matches||document.hidden),()=>false);
 return useNativeAppBackgrounded()||unavailable;
}
