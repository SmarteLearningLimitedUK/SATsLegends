import ts from 'typescript';

/** Cache the actual viewport, scenery and HUD in the same existing screen transition. */
export function moveScreenTransition(code:string){
 const source=ts.createSourceFile('App.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let outer:ts.JsxElement|undefined;
 const visit=(node:ts.Node)=>{if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='div'&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(source)==='data-screen-family'))outer=node;ts.forEachChild(node,visit)};visit(source);
 if(!outer)throw new Error('Screen transition adapter needs review: viewport not found.');
 const transition=outer.children.find((n):n is ts.JsxElement=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(source)==='AnimatePresence'&&n.children.some(c=>ts.isJsxElement(c)&&c.openingElement.tagName.getText(source)==='motion.div'&&c.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(source)==='key'&&p.getText(source).includes('{screen}'))));
 const inner=transition?.children.find((n):n is ts.JsxElement=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(source)==='motion.div');
 if(!transition||!inner)throw new Error('Screen transition adapter needs review: keyed content transition not found.');
 const animated=new Set(['key','initial','animate','exit','transition']);
 const moved=inner.openingElement.attributes.properties.filter(p=>ts.isJsxAttribute(p)&&animated.has(p.name.getText(source))).map(p=>p.getText(source)).join('\n');
 const retained=inner.openingElement.attributes.properties.filter(p=>!ts.isJsxAttribute(p)||!animated.has(p.name.getText(source))).map(p=>p.getText(source)).join('\n');
 const edits:[number,number,string][]=[
  [outer.openingElement.getStart(source),outer.openingElement.end,`<AnimatePresence mode="wait">\n${outer.openingElement.getText(source).replace('<div',`<PresentationScreenFrame ${moved}`)}`],
  [outer.closingElement.getStart(source),outer.closingElement.end,'</PresentationScreenFrame>\n</AnimatePresence>'],
  [transition.openingElement.getStart(source),transition.openingElement.end,''],[transition.closingElement.getStart(source),transition.closingElement.end,''],
  [inner.openingElement.getStart(source),inner.openingElement.end,`<div ${retained}>`],[inner.closingElement.getStart(source),inner.closingElement.end,'</div>'],
 ];
 for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+text+code.slice(b);
 return code;
}
