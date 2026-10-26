import {mkdirSync,writeFileSync} from 'node:fs';
const out='src/assets/production-ui-v2';mkdirSync(out,{recursive:true});
// Illustrations contain no educational values. Names/portions/denominations remain live text.
const food=[
 ['burger_meal','<path d="M10 28C10 8 54 8 54 28Z" fill="#efb653"/><path d="M10 30H54V37H10Z" fill="#72b956"/><rect x="9" y="37" width="46" height="10" rx="5" fill="#73492f"/><path d="M11 47H53V51Q32 61 11 51Z" fill="#efb653"/><path d="M19 23H22M30 18H33M41 23H44" stroke="#fff0af"/>'],
 ['ribs_plate','<ellipse cx="32" cy="45" rx="28" ry="12" fill="#dce8dd"/><path d="M12 30Q30 15 51 28L47 46Q30 52 15 42Z" fill="#ba7246"/><path d="M21 27L24 43M31 24L34 45M41 26L43 42" stroke="#ffe7af" stroke-width="5"/>'],
 ['berry_dessert','<path d="M11 30H53L48 52H16Z" fill="#e0d4b4"/><path d="M11 31Q13 22 23 23Q23 12 32 14Q43 13 43 23Q53 22 53 31Z" fill="#fff0d7"/><circle cx="25" cy="25" r="6" fill="#c36183"/><circle cx="36" cy="21" r="6" fill="#8a65ad"/><circle cx="39" cy="31" r="5" fill="#c36183"/>'],
 ['salad_bowl','<path d="M8 32Q14 58 32 58Q50 58 56 32Z" fill="#5c9f88"/><path d="M10 31Q6 20 18 17Q26 6 34 17Q48 9 52 25L55 32Z" fill="#7abd54"/><circle cx="22" cy="28" r="6" fill="#e67b57"/><circle cx="41" cy="25" r="6" fill="#e67b57"/><path d="M16 23L28 19M32 33L45 31" stroke="#d2dd89" stroke-width="4"/>'],
 ['rice_bowl','<path d="M8 32Q13 58 32 58Q51 58 56 32Z" fill="#77afa9"/><path d="M9 31Q10 18 22 20Q30 9 38 20Q52 16 55 31Z" fill="#fff2d3"/><path d="M17 27L22 24M29 22L34 25M41 27L46 23" stroke="#d8c796" stroke-width="3"/>'],
 ['pizza_slice','<path d="M10 17Q32 4 55 17L32 58Z" fill="#f6ca66"/><path d="M10 17Q32 4 55 17" stroke="#c38e50" stroke-width="9"/><circle cx="27" cy="28" r="5" fill="#cf6553"/><circle cx="38" cy="25" r="4" fill="#cf6553"/><circle cx="32" cy="41" r="4" fill="#cf6553"/>'],
 ['hotdog_combo','<path d="M12 36L36 12Q50 8 54 22L30 50Q16 59 10 46Z" fill="#edbc69"/><path d="M17 42L43 19" stroke="#a95c3d" stroke-width="12"/><path d="M17 38L24 39L25 31L33 31L34 23L41 24" stroke="#f5d76c" stroke-width="3"/>'],
 ['roast_chicken','<ellipse cx="30" cy="35" rx="21" ry="18" fill="#cb8950"/><path d="M37 34Q43 24 51 30Q58 37 47 44L52 51" stroke="#dca665" stroke-width="10"/><path d="M50 49L56 54M50 49L56 46" stroke="#fff0cf" stroke-width="6"/><path d="M17 29Q21 22 29 24" fill="none" stroke="#efbc75" stroke-width="4"/>'],
 ['fries','<path d="M15 13L20 39M26 9L29 39M38 11L37 39M49 15L44 39" stroke="#f4ca67" stroke-width="7"/><path d="M10 32L16 56H48L54 32Q32 43 10 32Z" fill="#bc6661"/><path d="M25 45L32 41L39 45L32 51Z" fill="#f4cf79"/>']
];
for(const [name,shape] of food)writeFileSync(`${out}/food-${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#4d452c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>\n`);
for(const [name,base,light,shape] of [['copper','#ba8053','#f4bd81','circle'],['silver','#a3bac1','#eef7eb','circle'],['gold','#d2ac54','#ffe6a0','circle'],['heptagon','#a3bac1','#eef7eb','polygon']]){
 const form=shape==='circle'?'<circle cx="32" cy="32" r="28"/>':'<path d="M32 4L54 15L60 38L44 58H20L4 38L10 15Z"/>';
 writeFileSync(`${out}/coin-${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="${base}" stroke="#655433" stroke-width="2">${form}</g><circle cx="32" cy="32" r="23" fill="none" stroke="${light}" stroke-width="2" stroke-dasharray="2 3"/><path d="M15 19Q24 9 39 13" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round"/></svg>\n`);
}
console.log('Wrote nine consistent existing food subjects and four unlabelled coin materials.');
