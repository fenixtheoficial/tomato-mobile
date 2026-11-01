'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const ROOT=__dirname;
const ALLOWED=new Set(['/', '/index.html','/app.mjs','/api.mjs','/google-login.mjs','/firebase-config.mjs','/login-utils.mjs','/tomato-api.mjs','/tomato-players.mjs','/style.css','/icon.svg','/manifest.webmanifest','/README.md']);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const HOSTS={principal:'https://prod-api.tomatoanimes.com',alternativo:'https://edge.betomato.com'};
function allowedRoute(p,method){
 if(typeof p!=='string'||p.length>240)return false;
 if(method==='POST')return p==='/v2/content/search';
 if(method!=='GET')return false;
 return /^\/v2\/anime\/(?:[\w-]{1,96}|episode\/[\w-]{1,96}\/stream)$/.test(p)
 || /^\/v3\/seasons\/[\w-]{1,96}\/episodes\?order=asc&limit=25&offset=\d{1,6}$/.test(p);
}
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
async function proxy(req,res,params){
 const server=params.get('server'),p=params.get('path');
 if(!Object.hasOwn(HOSTS,server)||!allowedRoute(p,req.method))return json(res,400,{status:false,message:'Rota nao permitida.'});
 let body;
 if(req.method==='POST'){
  let payload='';for await(const chunk of req){payload+=chunk.toString('utf8');if(payload.length>8192)return json(res,413,{status:false,message:'Corpo grande demais.'})}
  try{const d=JSON.parse(payload);if(typeof d.search!=='string'||d.search.length>100||d.content_type!=='anime'||!Number.isSafeInteger(d.page)||d.page<0||d.page>200)throw 1;body=JSON.stringify({search:d.search,content_type:'anime',page:d.page})}
  catch{return json(res,400,{status:false,message:'Pesquisa invalida.'})}
 }
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const upstream=await fetch(HOSTS[server]+p,{method:req.method,headers:{'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},body,redirect:'error',signal:controller.signal});
  const type=upstream.headers.get('content-type')||'';
  const size=Number(upstream.headers.get('content-length')||0);
  if(size>1500000)return json(res,502,{status:false,message:'Resposta externa muito grande.'});
  const raw=await upstream.text();if(raw.length>1500000)return json(res,502,{status:false,message:'Resposta externa muito grande.'});
  if(!type.includes('json'))return json(res,upstream.ok?502:upstream.status,{status:false,status_code:upstream.status,message:`O Tomato devolveu HTTP ${upstream.status} (${type||'formato nao informado'}), nao JSON.`});
  let result;try{result=JSON.parse(raw)}catch{return json(res,502,{status:false,message:'O Tomato devolveu JSON invalido.'})}
  json(res,upstream.status,result);
 }catch(error){if(!res.headersSent)json(res,502,{status:false,message:controller.signal.aborted?'Tempo esgotado na conexao com o Tomato.':'O servidor do Tomato nao respondeu a consulta.'});}
 finally{clearTimeout(timeout)}
}
function createServer(){return http.createServer((req,res)=>{
 let parsed;try{parsed=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Invalid URL')}
 const pathname=parsed.pathname;
 if(pathname==='/api/tomato')return void proxy(req,res,parsed.searchParams);
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end()}
 if(!ALLOWED.has(pathname)){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Arquivo nao encontrado')}
 const p=path.join(ROOT,pathname==='/'?'index.html':pathname.slice(1));
 fs.stat(p,(err,stat)=>{if(err||!stat?.isFile()){res.writeHead(404);return res.end('Arquivo nao encontrado')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(p).pipe(res);
 });
})}
function main(){const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT deve ser um numero entre 1 e 65535');const host=process.env.HOST||'0.0.0.0';const server=createServer();server.listen(port,host,()=>{console.log(`Tomato Mobile Web: http://localhost:${port}`);for(const net of Object.values(os.networkInterfaces()).flat())if(net?.family==='IPv4'&&!net.internal)console.log(`No Wi-Fi: http://${net.address}:${port}`);console.log('Encerrar: Ctrl+C')});return server}
if(require.main===module)main();module.exports={createServer,main,allowedRoute};
