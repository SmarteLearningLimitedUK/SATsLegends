const fs = require('fs');
const path = 'D:/BrainZilla/SATsLegends/src/games/TakeOutRushGame.tsx';
let s = fs.readFileSync(path, 'utf8');
const pattern1 = new RegExp('\\s*<div className="REMOVED_X">[\\s\\S]*?<div className="mt-2\\.5 flex items-start justify-between gap-2">');
s = s.replace(pattern1, '\n            <div className="mt-2.5 flex items-start justify-between gap-2">');
s = s.replace(/<div className="mt-1 text-\[11px\] font-semibold text-slate-100\/86">\{order.text\}<\/div>\s*/g, '');
const pattern3 = new RegExp('<div className="mt-2 grid grid-cols-2 gap-2">[\\s\\S]*?<div className="mt-2\\.5 h-3\\.5 overflow-hidden rounded-full border border-white/18 bg-blue-950/52">[\\s\\S]*?<\\/div>\\s*<\\/div>');
s = s.replace(pattern3, '\n            <div className="mt-2 rounded-[0.95rem] border border-cyan-100/20 bg-blue-950/46 px-3 py-2">\n              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">Tray total</div>\n              <div className="mt-1 text-xl font-black text-amber-100">{asDisplayFraction(runningTotal)}</div>\n            </div>');
fs.writeFileSync(path, s);
