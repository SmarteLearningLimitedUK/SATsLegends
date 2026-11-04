import React from 'react';
import {VisionSceneContext} from '../../../../src/games/visionScene';
import {originalHeroActivity} from '../../../../src/assets/characters/originalHeroActivities';
import {originalHeroId, originalHeroSource} from '../../../../src/assets/characters/originalHeroes';
import {asset, backgroundFor} from '../assets';
import SceneActor from '../SceneActor';
import ArtworkFrame from '../ArtworkFrame';

/** Shared screen artwork is scenery, a transparent actor and independent UI. */
export function AdventureBackdrop({gameKey}: {gameKey: string}) {
  return <img className="adventure-backdrop" src={backgroundFor(gameKey)} alt="" draggable={false} aria-hidden="true"/>;
}

export function AdventureHero({gameKey, avatarId, pose='guide', celebrate=false}: {
  gameKey: string; avatarId?: string; pose?: 'guide'|'navigate'; celebrate?: boolean;
}) {
  const identity=originalHeroId(avatarId), art=originalHeroActivity(identity, pose);
  const victory=celebrate?asset('heroes',`hero_${identity}_victory_v1`):undefined;
  return <VisionSceneContext.Provider value={{key:gameKey,cue:celebrate?'reward':'idle',sequence:1,paused:false,heroIdentity:identity}}>
    <SceneActor identity={identity} source={victory??art?.source??originalHeroSource(identity)!} frame={victory?undefined:art?.frame}
      decorative activity="idle" reaction={celebrate?'taunt':'idle'} soundMode="off"/>
  </VisionSceneContext.Provider>;
}

export function AdventurePanelFrame() {
  return <ArtworkFrame name="frames/glacier_panel_v3" corner={.12}/>;
}

export function AdventureControlFrame({primary=false}: {primary?: boolean}) {
  return <ArtworkFrame name={primary?'buttons/paper_gold_v3':'buttons/scale_key_v4'} corner={.1} fit="height"/>;
}

export function ResultArtwork({gameKey='', avatarId, victory, practice, xpGained}: {
  gameKey?: string; avatarId?: string; victory: boolean; practice: boolean; xpGained:number;
}) {
  return <>
    <AdventureBackdrop gameKey={gameKey}/>
    <div className="adventure-result-hero" aria-hidden="true">
      <img className="adventure-result-crest" src={asset('frames','sapphire_crest_v3')} alt=""/>
      <AdventureHero gameKey={gameKey} avatarId={avatarId} celebrate={victory} pose={victory?'navigate':'guide'}/>
      <div className="adventure-hero-caption"><AdventurePanelFrame/>{victory&&!practice?<><strong>+{xpGained} XP</strong><span>A brilliant step forward</span></>:<span>{practice&&victory?'Ready for your next mission':'Every attempt helps you grow'}</span>}</div>
      {victory&&<div className="adventure-reward-sparks">{Array.from({length:7},(_,i)=><i key={i} style={{'--spark':i,'--spark-row':i%3} as React.CSSProperties}/>)}</div>}
    </div>
  </>;
}
