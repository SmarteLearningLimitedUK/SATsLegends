import {useEffect, useRef, type RefObject} from 'react';

interface Options {
  scene: RefObject<HTMLDivElement | null>;
  strip: RefObject<HTMLDivElement | null>;
  state: string;
  paused: boolean;
  reduced: boolean;
}

/** Cosmetic camera movement never awards race distance or changes answer timing. */
export function useSideScrollingRace({scene,strip,state,paused,reduced}:Options) {
  const current=useRef({state,paused,reduced});current.current={state,paused,reduced};
  const camera=useRef({distance:.5,speed:0,road:0,wheels:0});
  useEffect(()=>{
    const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    let handle=0,previous:number|undefined;
    const tick=(now:number)=>{
      const dt=previous===undefined?0:Math.min(.04,(now-previous)/1000);previous=now;
      const root=scene.current, panorama=strip.current, options=current.current, p=camera.current;
      if(root&&panorama&&!document.hidden&&!options.paused){
        const stopped=options.state==='introCountdown'||options.state==='playerWin'||options.state==='playerLoss';
        const reduced=motionPreference.matches;
        const target=stopped||reduced?0:options.state==='correctBoost'?.32:options.state==='incorrectStall'?.008:.085;
        p.speed+=(target-p.speed)*(1-Math.exp(-5*dt));
        if(reduced)p.speed=0;
        p.distance+=p.speed*dt;p.road+=p.speed*dt*root.clientWidth*3;p.wheels+=p.speed*dt*2700;
        const offset=1.9+((.5+p.distance)%1.9);
        panorama.style.transform=`translate3d(${-offset/6*100}%,0,0)`;
        root.style.setProperty('--race-road-x',`${-(p.road%270)}px`);
        root.style.setProperty('--race-wheel-angle',`${p.wheels%360}deg`);
        root.style.setProperty('--race-suspension',`${reduced||stopped?0:Math.sin(p.road*.035)*.7}px`);
        root.dataset.cameraDistance=p.distance.toFixed(5);root.dataset.cameraSpeed=p.speed.toFixed(4);
      }
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
  },[scene,strip]);
}
