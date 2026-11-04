import React from 'react';
import type {MonsterMindActorProps} from '../../../src/components/game-ui/MonsterMindActor';
import Character from '../../../src/components/game-ui/OriginalHeroCharacter';
export default function MonsterMindActor({src,alt='',reaction='idle',reactionKey,className='',style,soundMode='all',walking}:MonsterMindActorProps){
 const identity=/zombie/i.test(src)?'zombie':/rhino/i.test(src)?'rhino':'goblin';
 return <Character identity={identity} legacyIdentity={identity} alt={alt} reaction={reaction} reactionKey={reactionKey} className={className} style={style} soundMode={soundMode} walking={walking}/>;
}
