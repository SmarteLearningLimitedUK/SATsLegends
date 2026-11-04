import type {CSSProperties} from 'react';

/** Component-owned geometry: a game may arrange its playfield, never its HUD. */
export const gameplayHudDock={
 // The native game stage already supplies horizontal safe-area insets.
 root:{position:'absolute',inset:'auto',top:'var(--dock-safe-top)',bottom:'var(--dock-safe-bottom)',left:0,right:0,width:'auto',height:'auto',pointerEvents:'none',zIndex:120},
 top:{position:'absolute',left:'calc(50% - var(--dock-header-offset))',right:'auto',top:'var(--dock-header-top)',bottom:'auto',translate:'-50% 0',transform:'none',width:'var(--dock-header-width)',height:'var(--dock-header-height)',minHeight:0,padding:0,margin:0,containerType:'inline-size'},
 // The right ornament extends inside the frame; content needs a scale-aware inset.
 bar:{position:'relative',isolation:'isolate',display:'grid',gridTemplateColumns:'var(--dock-avatar) minmax(0,1fr) auto',alignItems:'center',gap:8,width:'100%',height:'100%',minHeight:0,padding:'0 max(20px,calc(var(--dock-header-height)*.25 + 8px)) 0 2px',margin:0,background:'none',border:0,borderRadius:0,boxShadow:'none'},
 art:{display:'block',position:'absolute',inset:'8% 0',zIndex:-1,pointerEvents:'none'},
 jewel:{display:'none'},
 avatar:{display:'block',position:'relative',width:'var(--dock-avatar)',height:'var(--dock-avatar)',minWidth:0,aspectRatio:'1',margin:0,overflow:'hidden',border:0,borderRadius:'50%',background:'#063852',scale:'1',transform:'none'},
 mission:{display:'flex',flexDirection:'column',alignSelf:'center',justifyContent:'center',gap:4,minWidth:0,height:'auto',padding:0,margin:0},
 title:{fontFamily:'Matharia Rounded, sans-serif',fontSize:'var(--dock-title-size)',fontWeight:650,lineHeight:1.1,whiteSpace:'normal',textWrap:'balance',letterSpacing:'-.025em',overflow:'visible',textOverflow:'clip',margin:0,padding:0},
 progress:{display:'block',position:'relative',width:'100%',height:4,minHeight:4,margin:0,padding:0,overflow:'hidden',border:'1px solid #d6c779',borderRadius:8,background:'#082d39'},
 progressFill:{display:'block',position:'static',height:'100%',margin:0,padding:0,transition:'none'},
 status:{display:'flex',flexDirection:'var(--dock-status-direction)' as CSSProperties['flexDirection'],alignItems:'center',justifyContent:'center',gap:'var(--dock-status-gap,3px)',margin:0,padding:'6px 0',maxHeight:'100%'},
 lives:{display:'flex',alignItems:'center',gap:2,margin:0,padding:0},
 heart:{display:'block',width:'var(--dock-heart-size)',height:'var(--dock-heart-size)',objectFit:'contain',margin:0},
 clockStack:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:0},
 timer:{display:'flex',alignItems:'center',gap:3,fontSize:'var(--dock-stat-size)',fontWeight:650,lineHeight:1,whiteSpace:'nowrap',color:'#fff8e0',margin:0,padding:0},
 clockIcon:{display:'block',width:'var(--dock-icon-size)',height:'var(--dock-icon-size)',flex:'none'},
 practice:{display:'inline-flex',alignItems:'center',gap:3,fontSize:'var(--dock-stat-size)',lineHeight:1,whiteSpace:'nowrap',margin:0,padding:0},
 srOnly:{display:'block',position:'absolute',width:1,height:1,minWidth:0,minHeight:0,padding:0,margin:-1,overflow:'hidden',clipPath:'inset(50%)',whiteSpace:'nowrap'},
 bottom:{position:'absolute',left:'50%',right:'auto',top:'auto',bottom:'var(--dock-footer-bottom)',translate:'-50% 0',transform:'none',width:'var(--dock-footer-width)',height:'var(--dock-footer-height)',minWidth:0,minHeight:0,padding:0,margin:0,containerType:'size'},
 bottomInner:{display:'flex',alignItems:'center',justifyContent:'center',width:'min(100%,calc(500cqh + 4 * var(--dock-gap,4px)))',maxWidth:'100%',height:'100%',minHeight:44,margin:0,padding:0,overflow:'visible'},
 pause:{position:'absolute',left:'auto',right:'var(--dock-pause-right)',top:'var(--dock-pause-top)',bottom:'auto',width:'var(--dock-pause-size)',height:'var(--dock-pause-size)',minWidth:44,minHeight:44,margin:0,padding:0,translate:'none',transform:'none'},
} satisfies Record<string,CSSProperties>;
