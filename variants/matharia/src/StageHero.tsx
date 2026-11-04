import '../../../src/components/game-ui/vision-character.css';
import React,{useContext} from 'react';
import {VisionSceneContext} from '../../../src/games/visionScene';
import Character from '../../../src/components/game-ui/OriginalHeroCharacter';
import SceneActor from './SceneActor';
import {asset} from './assets';
import {PrimeSpellGlint} from './screens/PrimeScene';
import {compositionFor} from './compositions';
export default function StageHero({placement}:{placement:'stage'|'question'}){
 const scene=useContext(VisionSceneContext),spec=compositionFor(scene.key);
 if(placement==='question'||spec.ownsHero)return null;
 if(scene.key==='prime_pop')return <span className="prime-caster" aria-hidden="true"><SceneActor source={asset('heroes','hero_prime_caster_v2')} identity="barratt" activity="cast" decorative><PrimeSpellGlint/></SceneActor></span>;
 return <span className="concept-hero vision-companion--stage" data-concept-hero={scene.key} aria-hidden="true"><Character identity={scene.heroIdentity??"barratt"} artPose={scene.key==="match3_equivalence"?"guide":undefined} decorative/></span>;
}
