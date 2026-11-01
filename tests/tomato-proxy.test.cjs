const test=require('node:test');const assert=require('node:assert/strict');const {createServer,allowedRoute}=require('../server.cjs');
test('proxy aceita login legitimo mas bloqueia outras rotas ou destinos externos',()=>{
 assert.equal(allowedRoute('/v3/auth/google','POST'),false);assert.equal(allowedRoute('/v3/auth/register','POST'),false);assert.equal(allowedRoute('/v3/auth/login','POST'),true);assert.equal(allowedRoute('/v3/auth/refresh','POST'),true);assert.equal(allowedRoute('/v2/content/search','POST'),true);assert.equal(allowedRoute('/v2/anime/episode/8/stream','GET'),true);
});
test('server disponibiliza scripts e bloqueia requisicoes invalidas sem consultar Tomato',async()=>{
 const server=createServer().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const p of ['/', '/tomato-api.mjs','/tomato-session.mjs','/tomato-players.mjs']){const r=await fetch(base+p);assert.equal(r.status,200,p)}
  let r=await fetch(base+'/api/tomato?server=principal&path=%2Fv3%2Fauth%2Flogin');assert.equal(r.status,400);
  r=await fetch(base+'/api/tomato?server=foo&path=%2Fv2%2Fanime%2F8');assert.equal(r.status,400);
  r=await fetch(base+'/api/tomato?server=alternativo&path=%2Fv2%2Fcontent%2Fsearch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({search:'',content_type:'anime',page:'bad'})});assert.equal(r.status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
test('proxy exige mesma origem e nao aceita credenciais em rotas arbitrarias',async()=>{
 const server=createServer().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const path='/api/tomato?server=principal&path=%2Fv3%2Fauth%2Flogin';
  let r=await fetch(base+path,{method:'POST',headers:{Origin:'https://hostil.exemplo','Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,403);
  r=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,400);
  r=await fetch(base+'/api/tomato?server=principal&path=%2Fv3%2Fauth%2Fgoogle',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
test('proxy encaminha Bearer a apenas uma rota autorizada e nao registra credenciais',async()=>{
 const realFetch=global.fetch;
 const sent=[];global.fetch=async(url,opts)=>{sent.push({url,opts});return {status:200,ok:true,headers:new Map([['content-type','application/json']]),text:async()=>JSON.stringify({result:[]})}};
 const server=createServer().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  // O fetch de teste deve consultar o proprio servidor via referencia original.
  const r=await realFetch(base+'/api/tomato?server=principal&path=%2Fv2%2Fanime%2F123',{headers:{Authorization:'Bearer amostra'}});
  assert.equal(r.status,200);
  assert.equal(sent[0].opts.headers.Authorization,'Bearer amostra');
  assert.match(sent[0].url,/^https:\/\/prod-api\.tomatoanimes\.com\/v2\/anime\/123$/);
 }finally{await new Promise(resolve=>server.close(resolve));global.fetch=realFetch}
});
