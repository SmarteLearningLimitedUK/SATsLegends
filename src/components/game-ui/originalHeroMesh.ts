import type {HeroArtFrame} from '../../assets/characters/originalHeroActivities';
export interface HeroPose {time:number;lean:number;lift:number;recoil:number;defeat:number;stride:number;rightArm?:number;leftArm?:number;workLean?:number;}
/** Alpha bounds shared by the mesh and the non-WebGL fallback. */
export async function measureHeroArtwork(source:string,frame?:HeroArtFrame){
 const image=new Image();image.src=source;await image.decode();
 // Measure only the solid silhouette, so generated padding cannot change scale
 // or make feet float. This samples the source; it does not rewrite the artwork.
 const region=frame??{x:0,y:0,width:1,height:1};
 const sx=region.x*image.naturalWidth,sy=region.y*image.naturalHeight,sw=region.width*image.naturalWidth,sh=region.height*image.naturalHeight;
 const sample=document.createElement('canvas'),scale=256/Math.max(sw,sh);
 sample.width=Math.round(sw*scale);sample.height=Math.round(sh*scale);
 const sampleContext=sample.getContext('2d',{willReadFrequently:true})!;
 sampleContext.drawImage(image,sx,sy,sw,sh,0,0,sample.width,sample.height);
 const rgba=sampleContext.getImageData(0,0,sample.width,sample.height).data;
 let left=sample.width,top=sample.height,right=0,bottom=0;
 for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++)if(rgba[(y*sample.width+x)*4+3]>50){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<=left||bottom<=top){left=0;top=0;right=sample.width-1;bottom=sample.height-1;}
 const bounds=[region.x+Math.max(0,left-1)/sample.width*region.width,region.y+Math.max(0,top-1)/sample.height*region.height,region.x+Math.min(sample.width,right+2)/sample.width*region.width,region.y+Math.min(sample.height,bottom+2)/sample.height*region.height];
 const w=(bounds[2]-bounds[0])*image.naturalWidth,h=(bounds[3]-bounds[1])*image.naturalHeight;
 return {image,bounds,w,h};
}
/** A deformable, alpha-clipped copy of one drawing. Texture identity never changes. */
export async function createHeroMesh(canvas:HTMLCanvasElement,source:string,frame?:HeroArtFrame){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl)throw new Error('WebGL unavailable');
 const {image,bounds,w,h}=await measureHeroArtwork(source,frame),ax=.5,ay=1;
 const compile=(type:number,source:string)=>{const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader error');return shader;};
 const vertex=compile(gl.VERTEX_SHADER,`
 attribute vec2 uv; varying vec2 tex; uniform vec2 fit; uniform vec2 anchor; uniform vec4 bounds;
 uniform float time; uniform float stride; uniform vec4 pose; uniform vec3 joints;
 void main(){
  tex=mix(bounds.xy,bounds.zw,uv);vec2 p=uv;
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
  float legs=smoothstep(.68,.88,uv.y);
  float side=uv.x<.5?-1.0:1.0;
  p.y-=max(0.0,sin(time*9.0+side*1.5708))*.012*legs*stride;
  p.x+=sin(time*9.0)*.004*legs*side*stride;
  p.x+=sin(time*9.0+3.14159)*.009*arms*side*stride;
  // Shoulder pivots move the working arms independently of the head and feet.
  float armBand=smoothstep(.43,.54,uv.y)*(1.0-smoothstep(.70,.80,uv.y));
  float leftWeight=(1.0-smoothstep(.30,.46,uv.x))*armBand;
  float rightWeight=smoothstep(.64,.79,uv.x)*armBand;
  float jointAngle=joints.x*rightWeight+joints.y*leftWeight;
  vec2 shoulder=vec2(uv.x<.55?.36:.70,.49);
  vec2 limb=p-shoulder;
  p=shoulder+mat2(cos(jointAngle),-sin(jointAngle),sin(jointAngle),cos(jointAngle))*limb;
  p.x+=joints.z*.018*planted;
  p.y-=sin(time*18.0)*.005*stride*planted;
  vec2 point=vec2(.5,.95)+(p-anchor)*fit;
  gl_Position=vec4(point.x*2.0-1.0,1.0-point.y*2.0,0,1);
 }`);
 const fragment=compile(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 tex;uniform sampler2D artwork;void main(){vec4 c=texture2D(artwork,tex);float a=smoothstep(.12,.5,c.a);gl_FragColor=vec4(c.rgb/max(c.a,.001)*a,a);}`);
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
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const uniforms={joints:gl.getUniformLocation(program,'joints'),stride:gl.getUniformLocation(program,'stride'),fit:gl.getUniformLocation(program,'fit'),anchor:gl.getUniformLocation(program,'anchor'),time:gl.getUniformLocation(program,'time'),pose:gl.getUniformLocation(program,'pose')};
 const height=Math.min(.88,.92*h/w);
 gl.uniform4f(gl.getUniformLocation(program,'bounds'),bounds[0],bounds[1],bounds[2],bounds[3]);
 gl.uniform2f(uniforms.fit,height*w/h,height);gl.uniform2f(uniforms.anchor,ax,ay);
 let disposed=false;
 return {
  draw(pose:HeroPose){
   if(disposed||gl.isContextLost())return;
   const size=Math.max(1,Math.min(1024,Math.round(canvas.clientWidth*Math.min(devicePixelRatio,2))));
   if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
   gl.viewport(0,0,size,size);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.uniform1f(uniforms.stride,pose.stride);gl.uniform1f(uniforms.time,pose.time);gl.uniform4f(uniforms.pose,pose.lean,pose.lift,pose.recoil,pose.defeat);
   gl.uniform3f(uniforms.joints,pose.rightArm??0,pose.leftArm??0,pose.workLean??0);
   gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  },
  dispose(){disposed=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteBuffer(index);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();},
 };
}
