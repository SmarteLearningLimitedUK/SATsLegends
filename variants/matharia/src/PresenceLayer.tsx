import React from 'react';
import {motion,useIsPresent,type HTMLMotionProps} from 'motion/react';
/** Exiting dialogs release touches immediately while their short fade finishes. */
export default function PresenceLayer(props:HTMLMotionProps<'div'>){
 const present=useIsPresent();return <motion.div {...props} style={{...props.style,pointerEvents:present?'auto':'none'}}/>;
}
