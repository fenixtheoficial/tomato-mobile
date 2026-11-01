'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const ROOT=__dirname;
const ALLOWED=new Set(['/', '/index.html','/app.mjs','/api.mjs','/style.css','/icon.svg','/manifest.webmanifest','/README.md']);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.md':'text/plain; charset=utf-8'};
function createServer(){return http.createServer((req,res)=>{
 let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);return res.end('Invalid URL')}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end()}
 if(!ALLOWED.has(pathname)){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Arquivo não encontrado')}
 const p=path.join(ROOT,pathname==='/'?'index.html':pathname.slice(1));
 fs.stat(p,(err,stat)=>{if(err||!stat?.isFile()){res.writeHead(404);return res.end('Arquivo não encontrado')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(p).pipe(res);
 });
})}
function main(){const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT deve ser um número entre 1 e 65535');const host=process.env.HOST||'0.0.0.0';const server=createServer();server.listen(port,host,()=>{console.log(`Tomato Mobile Web: http://localhost:${port}`);for(const net of Object.values(os.networkInterfaces()).flat())if(net?.family==='IPv4'&&!net.internal)console.log(`No Wi-Fi: http://${net.address}:${port}`);console.log('Encerrar: Ctrl+C')});return server}
if(require.main===module)main();module.exports={createServer,main};
