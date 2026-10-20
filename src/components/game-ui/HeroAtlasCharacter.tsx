import React,{memo,useContext,useEffect,useRef,useState,type CSSProperties} from 'react';
import {useReducedMotion} from 'motion/react';
import {getVisionCharacter,getVisionWalk,VisionSceneContext} from '../../games/visionScene';
import {HERO_ATLAS_LAYOUT,type HeroAtlasLayout} from '../../games/heroAtlasLayout';
import {useHeroPerformance} from './useHeroPerformance';
import type {VisionCharacterProps} from './VisionCharacter';

const normalise=(identity:string)=>identity==='barratt'?'deer':identity;
export const hasHeroAtlas=(identity:string)=>Boolean(HERO_ATLAS_LAYOUT[`characters/${normalise(identity)}-v3`]&&HERO_ATLAS_LAYOUT[`walks/${normalise(identity)}-v2`]);
type Frame={source:string;layout:HeroAtlasLayout;index:number};
function frameStyle({source,layout,index}:Frame):CSSProperties {
  const [x,y,width,height]=layout.frames[index];
  // Each silhouette is sampled whole. Matching visual height and ground
  // contact removes the scale/foot jitter in imperfect generated gutters.
  const displayHeight=Math.min(90,98*height/width);
  return {position:'absolute',left:'50%',bottom:'5%',translate:'-50% 0',
    width:`${displayHeight*width/height}%`,height:`${displayHeight}%`,
    clipPath:layout.clips?.[index]?`polygon(${layout.clips[index]})`:undefined,
    backgroundImage:`url("${source}")`,backgroundSize:`${layout.width/width*100}% ${layout.height/height*100}%`,
    backgroundPosition:`${x/(layout.width-width)*100}% ${y/(layout.height-height)*100}%`};
}

export default memo(function HeroAtlasCharacter({identity,alt='',className='',style,reaction='idle',reactionKey,decorative=false,walking=false}:VisionCharacterProps){
  const key=normalise(identity);const scene=useContext(VisionSceneContext);const reduced=Boolean(useReducedMotion());
  const character=getVisionCharacter(key);const walk=getVisionWalk(key);const [ready,setReady]=useState(false);
  const performance=useHeroPerformance({identity:key,walking:walking&&reaction==='idle'&&scene.cue==='idle',cue:scene.cue,sequence:scene.sequence,reaction,reactionKey,enabled:ready&&!reduced,paused:scene.paused});
  const moving=performance.motion==='walk'&&!reduced;
  const source=(moving?walk:character)??character;
  const layout=HERO_ATLAS_LAYOUT[`${moving?'walks':'characters'}/${key}-${moving?'v2':'v3'}`];
  const current:Frame={source,layout,index:reduced?0:performance.frame};
  const previous=useRef({frame:current,motion:performance.motion});
  const [outgoing,setOutgoing]=useState<Frame|null>(null);
  useEffect(()=>{
    setReady(false);let active=true;
    const images=[character,walk].filter(Boolean).map(url=>{const image=new Image();image.src=url;return image;});
    Promise.all(images.map(image=>image.decode())).then(()=>{if(active)setReady(true);}).catch(()=>{});
    return()=>{active=false;};
  },[character,walk]);
  useEffect(()=>{
    if(!reduced&&previous.current.motion!==performance.motion)setOutgoing(previous.current.frame);
    previous.current={frame:current,motion:performance.motion};
  },[current.index,source,performance.motion,reduced]);
  useEffect(()=>{if(!outgoing||scene.paused)return;const timer=setTimeout(()=>setOutgoing(null),90);return()=>clearTimeout(timer);},[outgoing,scene.paused]);
  const pose=performance.motion==='reward'?4:performance.motion==='retry'?5:performance.motion==='attack'?3:0;
  return <span className={`vision-character vision-character--hero20 ${moving?'vision-character--walking':''} ${className}`} style={style}
    role={decorative?undefined:'img'} aria-label={decorative?undefined:alt} aria-hidden={decorative||undefined}
    data-vision-character={key} data-vision-frame={current.index} data-vision-frame-count="20" data-vision-motion={performance.motion}
    data-vision-pose={pose} data-vision-ready={ready} data-vision-paused={scene.paused}>
    <span className="vision-character-contact"/>
    <span className="vision-character-breath">
      <span className="vision-character-frame" data-hero-active-frame style={frameStyle(current)}/>
      {!reduced&&outgoing?<span className="vision-character-frame hero-frame-outgoing" style={frameStyle(outgoing)}/>:null}
    </span>
  </span>;
});
