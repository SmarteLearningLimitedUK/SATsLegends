import {GOBLIN_ATLAS_LAYOUT} from '../../games/goblinAtlasLayout';

const base=GOBLIN_ATLAS_LAYOUT['characters/goblin-idle-v3'];
const [bx,by,bw,bh]=base.frames[0],[bax,bay]=base.anchors[0];
const displayHeight=88,displayWidth=88*bw/bh;
export const goblinBaseStyle={position:'absolute' as const,width:`${displayWidth}%`,height:`${displayHeight}%`,left:`${50-displayWidth*bax}%`,bottom:`${5-displayHeight*(1-bay)}%`,backgroundSize:`${base.width/bw*100}% ${base.height/bh*100}%`,backgroundPosition:`${bx/(base.width-bw)*100}% ${by/(base.height-bh)*100}%`,clipPath:`polygon(${base.clips[0]})`};

export interface GoblinPose {time:number;lean:number;lift:number;recoil:number;defeat:number;}
/** A deformable, alpha-clipped copy of one drawing. Texture identity never changes. */
export async function createGoblinMesh(canvas:HTMLCanvasElement,source:string){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl)throw new Error('WebGL unavailable');
 const image=new Image();image.src=source;await image.decode();
 const layout=GOBLIN_ATLAS_LAYOUT['characters/goblin-idle-v3'];
 const [sx,sy,w,h]=layout.frames[0],[ax,ay]=layout.anchors[0];
 const cut=document.createElement('canvas');cut.width=w;cut.height=h;
 const ctx=cut.getContext('2d')!;
 ctx.beginPath();layout.clips[0].split(',').forEach((point,index)=>{
  const [x,y]=point.trim().split(/\s+/).map(parseFloat);
  if(index)ctx.lineTo(x*w/100,y*h/100);else ctx.moveTo(x*w/100,y*h/100);
 });ctx.closePath();ctx.clip();ctx.drawImage(image,sx,sy,w,h,0,0,w,h);
 const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader error');return shader;};
 const vertex=compile(gl.VERTEX_SHADER,`
 attribute vec2 uv; varying vec2 tex; uniform vec2 fit; uniform vec2 anchor;
 uniform float time; uniform vec4 pose;
 void main(){
  tex=uv;vec2 p=uv;
  float planted=1.0-smoothstep(.76,.98,p.y);
  float breath=sin(time*1.65)*.0035;
  p.x+=(p.x-anchor.x)*breath*planted;
  p.y-=breath*planted;
  p.x+=(sin(time*.82)*.003+pose.x*.026-pose.z*.045+pose.w*.15)*planted*planted;
  p.y+=pose.z*.012*planted+pose.w*.06*planted;
  float head=1.0-smoothstep(.33,.51,uv.y);
  float angle=(sin(time*.82)*.012+pose.x*.045+pose.z*.065+pose.w*.14)*head;
  vec2 neck=vec2(.57,.43);vec2 d=p-neck;
  p=neck+mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*d;
  float arms=smoothstep(.15,.36,abs(uv.x-.57))*(smoothstep(.38,.48,uv.y)-smoothstep(.63,.78,uv.y));
  p.y-=pose.y*.035*arms;
  p.x+=sign(uv.x-.57)*pose.y*.012*arms;
  vec2 point=vec2(.5,.95)+(p-anchor)*fit;
  gl_Position=vec4(point.x*2.0-1.0,1.0-point.y*2.0,0,1);
 }`);
 const fragment=compile(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 tex;uniform sampler2D artwork;void main(){gl_FragColor=texture2D(artwork,tex);}`);
 const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program error');
 gl.useProgram(program);
 const vertices:number[]=[],indices:number[]=[],cols=24,rows=32;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertices.push(x/cols,y/rows);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
 const location=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cut);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const uniforms={fit:gl.getUniformLocation(program,'fit'),anchor:gl.getUniformLocation(program,'anchor'),time:gl.getUniformLocation(program,'time'),pose:gl.getUniformLocation(program,'pose')};
 gl.uniform2f(uniforms.fit,.88*w/h/1.4,.88);gl.uniform2f(uniforms.anchor,ax,ay);
 let disposed=false;
 return {
  draw(pose:GoblinPose){
   if(disposed||gl.isContextLost())return;
   const size=Math.max(1,Math.min(1024,Math.round(canvas.clientWidth*Math.min(devicePixelRatio,2))));
   if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
   gl.viewport(0,0,size,size);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.uniform1f(uniforms.time,pose.time);gl.uniform4f(uniforms.pose,pose.lean,pose.lift,pose.recoil,pose.defeat);
   gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  },
  dispose(){disposed=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteBuffer(index);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();},
 };
}
