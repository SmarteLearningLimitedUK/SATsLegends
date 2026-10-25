import React, { useId } from 'react';
import photo1 from '../../assets/reference-screens/reference-1.jpg';
import photo2 from '../../assets/reference-screens/reference-2.jpg';
import photo3 from '../../assets/reference-screens/reference-3.jpg';
import photo4 from '../../assets/reference-screens/reference-4.jpg';
import photo5 from '../../assets/reference-screens/reference-5.jpg';
import photo6 from '../../assets/reference-screens/reference-6.jpg';

export const RATIO_REFERENCE_GAMES = ['scale_builder', 'ratio_fractions', 'share_splitter', 'potion_panic'] as const;
export const BATCH_THREE_GAMES = ['match3_equivalence','percent_power','fraction_forge','take_out_rush','graph_grabber','line_graph_lab','data_detective','potion_panic','share_splitter'] as const;
export const isBatchThreeGame = (key?:string) => BATCH_THREE_GAMES.some(game=>game===key);
export const REFERENCE_GAMES = ['place_value_panic', 'number_line_ninja', 'prime_pop', 'rounding_rocket', 'maths_vs_zombies', ...RATIO_REFERENCE_GAMES, ...BATCH_THREE_GAMES] as const;
export type ReferenceGame = typeof REFERENCE_GAMES[number];
export const isReferenceGame = (key?: string): key is ReferenceGame => REFERENCE_GAMES.some(game => game === key);
export const isRatioReferenceGame = (key?: string) => RATIO_REFERENCE_GAMES.some(game => game === key);
type Patch = [number, number, number, number, string?];
type Slice = { photo: number; box: [number, number, number, number]; patches?: Patch[] };
const photos = [photo1, photo2, photo3, photo4, photo5, photo6];
const dimensions = [[720,1280],[1280,589],[720,1280],[720,1280],[1280,720],[720,1280]];
const questionSlices: Partial<Record<ReferenceGame, Slice>> = {
  place_value_panic: { photo:1, box:[58,174,607,202], patches:[[94,223,534,131,'#082f41'],[281,186,160,22,'#efdcac']] },
  number_line_ninja: { photo:2, box:[144,71,997,88], patches:[[220,85,854,57]] },
  prime_pop: { photo:3, box:[32,121,656,210], patches:[[223,165,421,130]] },
  rounding_rocket: { photo:4, box:[30,151,667,148], patches:[[219,201,434,64]] },
  maths_vs_zombies: { photo:5, box:[90,99,1100,101], patches:[[240,114,820,63]] },
};
const hudSlices: Partial<Record<ReferenceGame, Slice>> = {
 place_value_panic:{photo:1,box:[40,39,652,105],patches:[[151,64,511,54]]},
 number_line_ninja:{photo:2,box:[357,5,569,63],patches:[[423,18,474,37]]},
 prime_pop:{photo:3,box:[48,16,627,91],patches:[[150,36,503,55]]},
 rounding_rocket:{photo:4,box:[25,29,674,113],patches:[[138,55,531,60]]},
 maths_vs_zombies:{photo:5,box:[289,8,703,82],patches:[[381,23,588,52]]},
};
const slices: Record<string, Slice> = {
 'gem':{photo:1,box:[320,535,123,127],patches:[[349,565,67,66,'#034584']]},
 'place-label':{photo:1,box:[322,467,122,55],patches:[[340,480,88,28]]},
 'submit':{photo:1,box:[87,984,547,100],patches:[[218,1007,304,48,'#ffdc65']]},
 'caption':{photo:1,box:[189,799,344,50],patches:[[236,808,248,29,'#26313a']]},
 'dock-button':{photo:1,box:[68,1134,106,96],patches:[[87,1143,68,75,'#123e35']]},
 'blue-answer':{photo:2,box:[391,361,113,111],patches:[[420,390,56,47,'#056bb5']]},
 'green-answer':{photo:5,box:[109,514,259,80],patches:[[131,529,214,47,'#125346']]},
 'answer-panel':{photo:5,box:[81,467,1119,142],patches:[[128,480,1024,110]]},
 'rocket-status':{photo:4,box:[189,759,349,107],patches:[[235,781,264,64,'#0c3044']]},
 'rocket-answers':{photo:4,box:[26,875,670,201],patches:[[72,905,574,136]]},
 'island-title':{photo:6,box:[207,164,340,164],patches:[[249,214,260,91,'#252f2c'],[279,176,179,21,'#dbc18b']]},
 'island-row':{photo:6,box:[16,479,689,143],patches:[[256,499,426,104,'#2c1c49']]},
 'island-next':{photo:6,box:[22,340,678,128],patches:[[197,359,478,88]]},
 'island-thumb-pvp':{photo:6,box:[35,493,206,110]},
 'island-thumb-ninja':{photo:6,box:[34,647,208,113]},
 'island-thumb-prime':{photo:6,box:[32,802,211,113]},
 'island-thumb-rocket':{photo:6,box:[31,960,211,112]},
};

/** Original reference ornament, with baked sample copy covered by live UI.
 * Cropping happens in SVG at render time; the supplied reference stays intact. */
export function ReferenceArt({part,game,className=''}:{part:string;game?:ReferenceGame;className?:string}) {
 const id=useId().replace(/:/g,'');
 const slice = part === 'question' && game ? questionSlices[game] : part === 'hud' && game ? hudSlices[game] : slices[part];
 if(!slice) return null;
 const [w,h]=dimensions[slice.photo-1];
 const [x,y,bw,bh]=slice.box;
 const hudBand = game==='prime_pop' ? [.07,.88] : game==='number_line_ninja' ? [.10,.82] : game==='maths_vs_zombies' ? [.10,.82] : game==='rounding_rocket' ? [.15,.76] : [.16,.70];
 return <svg className={`reference-art reference-art--${part} ${className}`} viewBox={slice.box.join(' ')} preserveAspectRatio="none" aria-hidden="true" focusable="false">
   <defs><clipPath id={`${id}-clip`}>
    {part==='hud' ? <><rect x={x+bw*.09} y={y+bh*hudBand[0]} width={bw*.90} height={bh*hudBand[1]} rx={bh*.16}/><ellipse cx={x+bw*.075} cy={y+bh*.50} rx={bw*.073} ry={bh*.48}/></> : part==='question' && game==='place_value_panic' ? <><rect x="67" y="193" width="588" height="171" rx="21"/><rect x="261" y="179" width="200" height="44" rx="14"/></> : <rect x={x+1} y={y+1} width={bw-2} height={bh-2} rx={Math.min(bw,bh)*.16}/>}
   </clipPath></defs>
   <g clipPath={`url(#${id}-clip)`}>
    <image href={photos[slice.photo-1]} width={w} height={h}/>
    {slice.patches?.map(([px,py,width,height,fill],i)=>part==='blue-answer' ? <circle key={i} cx={px+width/2} cy={py+height/2} r={width/2} fill={fill}/> : <rect key={i} x={px} y={py} width={width} height={height} rx={part==='green-answer'?15:3} fill={fill??'#073337'}/>)}
    {part==='question' && game==='place_value_panic' && <svg x="128" y="351" width="158" height="16" viewBox="350 351 158 16" preserveAspectRatio="none"><image href={photo1} width="720" height="1280"/></svg>}
   </g>
 </svg>;
}
