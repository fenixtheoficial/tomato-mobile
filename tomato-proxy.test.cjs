const test=require('node:test');const assert=require('node:assert/strict');const {createServer,allowedRoute}=require('../server.cjs');
test('proxy nao aceita rotas de autenticacao ou destinos externos',()=>{
 assert.equal(allowedRoute('/v3/auth/google','POST'),false);assert.equal(allowedRoute('/v2/content/search','POST'),true);assert.equal(allowedRoute('/v2/anime/episode/8/stream','GET'),true);
});
test('server disponibiliza scripts e bloqueia requisicoes invalidas sem consultar Tomato',async()=>{
 const server=createServer().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const p of ['/', '/tomato-api.mjs','/tomato-players.mjs']){const r=await fetch(base+p);assert.equal(r.status,200,p)}
  let r=await fetch(base+'/api/tomato?server=principal&path=%2Fv3%2Fauth%2Flogin');assert.equal(r.status,400);
  r=await fetch(base+'/api/tomato?server=foo&path=%2Fv2%2Fanime%2F8');assert.equal(r.status,400);
  r=await fetch(base+'/api/tomato?server=alternativo&path=%2Fv2%2Fcontent%2Fsearch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({search:'',content_type:'anime',page:'bad'})});assert.equal(r.status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
