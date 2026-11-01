import test from 'node:test';import assert from 'node:assert/strict';
import {createTomatoSession,loginBody,parseSession,refreshId} from '../tomato-session.mjs';
import {tomatoRequest,TomatoError} from '../tomato-api.mjs';
test('login enviado para rota do Tomato sem persistir senha', async()=>{
 const sent=[];const session=createTomatoSession({send:async(path,options)=>{sent.push({path,options});return path==='/v3/auth/login'?{access_token:'token-1',refresh_token:'refresh-1'}:{result:[]}}});
 await session.login({server:'principal',email:'eu@exemplo.com',password:'Teste123'});
 assert.equal(session.authenticated,true);
 assert.equal(session.email,'eu@exemplo.com');
 assert.equal(sent[0].path,'/v3/auth/login');
 assert.equal(sent[0].options.body.password,'Teste123');
 await session.request('/v2/content/search',{server:'principal',body:{search:'Naruto',content_type:'anime',page:0}});
 assert.equal(sent[1].options.token,'token-1');
 session.signout();assert.equal(session.authenticated,false);
});
test('sessao nao e fabricada quando login devolve status indevido',async()=>{
 const session=createTomatoSession({send:async()=>({status:true,account:{email:'eu@exemplo.com'}})});
 await assert.rejects(session.login({server:'principal',email:'eu@exemplo.com',password:'Teste123'}),/access_token/);
 assert.equal(session.authenticated,false);
});
test('renova automaticamente apenas quando token expirou',async()=>{
 const sent=[];let count=0;
 const session=createTomatoSession({send:async(path,opts)=>{sent.push({path,token:opts.token});if(path==='/v3/auth/login')return {access_token:'antigo',refresh_token:'ref'};if(path==='/v3/auth/refresh')return {access_token:'novo',refresh_token:'ref'};if(opts.token==='antigo'&&count++===0)throw new TomatoError('expirado',401);return {result:[]}}});
 await session.login({server:'principal',email:'eu@exemplo.com',password:'Teste123'});
 await session.request('/v2/content/search',{server:'principal',body:{search:'Naruto',content_type:'anime',page:0}});
 assert.deepEqual(sent.slice(1).map(x=>x.path),['/v2/content/search','/v3/auth/refresh','/v2/content/search']);
 assert.equal(sent.at(-1).token,'novo');
});
test('falha ao renovar elimina sessao',async()=>{
 const session=createTomatoSession({send:async(path)=>{if(path==='/v3/auth/login')return {access_token:'a',refresh_token:'b'};throw new TomatoError('nao autorizado',401)}});
 await session.login({server:'principal',email:'eu@exemplo.com',password:'Teste123'});
 await assert.rejects(session.request('/v2/content/search',{server:'principal',body:{search:'Naruto',content_type:'anime',page:0}}),/Entre novamente/);
 assert.equal(session.authenticated,false);
});
test('valida e-mail e senha antes de tentar autenticar',()=>{
 assert.throws(()=>loginBody('invalido','123'),/e-mail valido/);
 assert.throws(()=>loginBody('bom@exemplo.com',''),/senha/);
 assert.match(refreshId(),/^[A-Za-z0-9_-]{43}$/);
 assert.notEqual(refreshId(),refreshId());
 assert.equal(parseSession({data:{access_token:'ok'}},'fallback').token,'ok');
});
test('envia somente Bearer explicitamente fornecido',async()=>{
 let args;const fetcher=async(url,opts)=>{args=opts;return {ok:true,status:200,text:async()=>'{"result":[]}'}};
 await tomatoRequest('/v2/content/search',{localProxy:true,body:{search:'X',content_type:'anime',page:0},token:'acessovalido',fetcher});
 assert.equal(args.headers.Authorization,'Bearer acessovalido');
 assert.equal(args.credentials,'omit');
});
