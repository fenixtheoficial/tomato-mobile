'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../server.cjs');
test('serve todos os módulos novos necessários ao login Google e bloqueia segredos',async()=>{
 const server=createServer();await new Promise(res=>server.listen(0,'127.0.0.1',res));
 try{
  const root=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/', '/app.mjs','/google-login.mjs','/login-utils.mjs','/firebase-config.mjs']){
   const res=await fetch(root+path);assert.equal(res.status,200,path);assert.match(res.headers.get('content-type'),path==='/'?/text\/html/:/text\/javascript/);assert.ok((await res.text()).length>20);
  }
  for(const path of ['/server.cjs','/tests/server-assets.test.cjs','/.env','/../../etc/passwd']){
   const res=await fetch(root+path);assert.equal(res.status,404,path);
  }
 }finally{await new Promise(res=>server.close(res))}
});
