import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
const root=path.resolve('qa-artifacts'),port=Number(process.env.QA_REVIEW_PORT||3028);
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+(pathname==='/'?'/production-rebuild/index.html':pathname));
  if(!file.startsWith(root+path.sep))throw Error('Outside review directory');
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Review file not found');}
}).listen(port,'127.0.0.1',()=>console.log('Local desktop review: http://127.0.0.1:'+port+'/production-rebuild/'));
