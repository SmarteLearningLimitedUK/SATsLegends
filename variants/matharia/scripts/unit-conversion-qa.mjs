export function solve(prompt){const units={m:1,cm:.01,km:1000,kg:1000,g:1,l:1000,ml:1},number=v=>Number(v.replaceAll(',',''));let m;if(m=prompt.match(/^Combine ([\d.,]+) (m|kg|l) and ([\d.,]+) (cm|g|ml)\. What is the total in (cm|g|ml)\?$/))return number(m[1])*units[m[2]]/units[m[5]]+number(m[3]);if(m=prompt.match(/^Convert ([\d.,]+) (m|cm|km|kg|g|l|ml) into (m|cm|km|kg|g|l|ml)\.$/))return number(m[1])*units[m[2]]/units[m[3]];throw Error('Unrecognised original conversion: '+prompt)}

// Simulate env() throughout the native viewport AND the illustrated stage.
// Setting stage variables alone omits the host's horizontal safe-area padding.
export async function applyLandscapeSafeAreas(page,{top=0,bottom=21,left=59,right=59}={}) {
 const css=await page.evaluate(async()=>{let text='';for(const sheet of document.styleSheets)if(sheet.href)text+=await fetch(sheet.href).then(r=>r.text());return text;});
 await page.addStyleTag({content:css.replace(/env\(safe-area-inset-top[^)]*\)/g,`${top}px`).replace(/env\(safe-area-inset-bottom[^)]*\)/g,`${bottom}px`).replace(/env\(safe-area-inset-left[^)]*\)/g,`${left}px`).replace(/env\(safe-area-inset-right[^)]*\)/g,`${right}px`)});
}
