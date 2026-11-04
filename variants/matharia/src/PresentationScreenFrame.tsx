import React,{useLayoutEffect,useRef} from 'react';
import {motion,usePresence,useReducedMotion,type HTMLMotionProps} from 'motion/react';
import './screen-frame.css';
/** Outgoing pixels retain their own metadata; exiting controls cannot receive input. */
export default function PresentationScreenFrame({children,style,initial,animate,exit,transition,...props}:HTMLMotionProps<'div'>){
 const reduced=useReducedMotion(),[present,remove]=usePresence(Boolean(reduced)),node=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!present){if(node.current?.contains(document.activeElement))(document.activeElement as HTMLElement)?.blur();if(reduced)remove?.()}},[present,reduced,remove]);
 const shared={ref:node,'data-presentation-screen-frame':true,'data-frame-present':present,inert:!present||undefined,'aria-hidden':!present||undefined,style:{...style,pointerEvents:present?style?.pointerEvents:'none'}};
 // Reduced motion needs no outgoing animation or queued animation-clock work.
 if(reduced)return <div {...props as React.HTMLAttributes<HTMLDivElement>} {...shared}>{children}</div>;
 return <motion.div {...props} {...shared} initial={initial} animate={animate} exit={exit} transition={transition}>{children}</motion.div>;
}
