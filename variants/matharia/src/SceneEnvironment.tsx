import React,{useContext} from 'react';
import {VisionSceneContext} from '../../../src/games/visionScene';
import {backgroundFor} from './assets';
export default function SceneEnvironment({className='',alt='',position='center'}:{src:string;className?:string;alt?:string;position?:string;fit?:'contain'|'cover'}){
 const scene=useContext(VisionSceneContext);
 return <picture className={`pointer-events-none absolute inset-0 block ${className}`}><source media="(orientation:landscape)" srcSet={backgroundFor(scene.key,true)}/><img src={backgroundFor(scene.key)} alt={alt} draggable={false} data-game-scene-image data-matharia-scenery data-background-fit="cover" className="h-full w-full object-cover" style={{objectPosition:position}}/></picture>;
}
