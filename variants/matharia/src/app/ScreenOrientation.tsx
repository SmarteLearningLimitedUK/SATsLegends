import {createContext,useContext,useLayoutEffect,useState,type ReactNode} from 'react';
import {setNativeScreenOrientation} from './nativeServices';

type Orientation='portrait'|'landscape';
const OrientationContext=createContext<((orientation:Orientation)=>void)|null>(null);

/** The native shell starts in portrait; a mounted screen may explicitly opt into landscape. */
export function ScreenOrientationProvider({portraitOnly,children}:{portraitOnly:boolean;children:ReactNode}){
 const [declared,setDeclared]=useState<Orientation>('portrait');
 const orientation=portraitOnly?'portrait':declared;
 useLayoutEffect(()=>{
  document.documentElement.dataset.requiredOrientation=orientation;
  void setNativeScreenOrientation(orientation).catch(()=>{
   // Keep the existing rotation guard available if UIKit cannot resize this window.
   console.warn('The screen orientation request could not be applied.');
  });
 },[orientation]);
 return <OrientationContext.Provider value={setDeclared}>{children}</OrientationContext.Provider>;
}

export function useScreenOrientation(orientation:Orientation){
 const declare=useContext(OrientationContext);
 useLayoutEffect(()=>{
  declare?.(orientation);
  return()=>declare?.('portrait');
 },[declare,orientation]);
}
