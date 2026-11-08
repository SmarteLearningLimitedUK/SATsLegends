import {useLearningPolicy} from '../../../src/systems/learning/learningSupport';
import React,{Children,isValidElement,useSyncExternalStore,type ReactNode} from 'react';

const motionQuery='(prefers-reduced-motion: reduce)';
const subscribeMotion=(notify:()=>void)=>{const media=window.matchMedia(motionQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const readMotion=()=>window.matchMedia(motionQuery).matches;
/** React to preference changes during an open activity as well as at launch. */
export const usePondReducedMotion=()=>{const support=useLearningPolicy(),os=useSyncExternalStore(subscribeMotion,readMotion,()=>true);return os||support.reducedMovement;};

type SlotProps={className?:string;children?:ReactNode};
const find=(children:ReactNode,name:string)=>Children.toArray(children).find(node=>isValidElement<SlotProps>(node)&&node.props.className?.split(/\s+/).includes(name));
const childrenOf=(node:ReactNode)=>isValidElement<SlotProps>(node)?node.props.children:undefined;

/** Reuses the live activity nodes and shared footer in two independent columns. */
export default function PondLayout({active,children}:{active:boolean;children:ReactNode}){
 if(!active)return <>{children}</>;
 const header=find(children,'wellbeing-header'),instructions=find(children,'matharia-pond-instructions');
 const content=find(children,'wellbeing-content'),scene=find(childrenOf(content),'wellbeing-scene');
 const attention=find(childrenOf(scene),'pond-attention'),pond=find(childrenOf(scene),'pond-playfield'),footer=find(children,'wellbeing-footer');
 if(!header||!instructions||!attention||!pond||!footer)throw new Error('Peaceful Pond layout slots changed; inspect the shared activity markup.');
 return <>{header}<div className="pond-noticing-rail">{attention}{footer}</div><div className="pond-water-region">{instructions}{pond}</div></>;
}
