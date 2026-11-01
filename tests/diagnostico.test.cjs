const test=require('node:test');
const assert=require('node:assert/strict');
const {check,HOSTS}=require('../diagnostico.cjs');
const resolver=async()=>({address:'127.0.0.1'});
const response=(status,type)=>({status,headers:new Map([['content-type',type]])});
test('diagnostico nao envia credenciais e nao abre hosts arbitrarios',async()=>{
 const requests=[];
 const result=await check(HOSTS[0],{resolver,fetcher:async (url,opts)=>{requests.push({url,opts});return response(403,'application/json')}});
 assert.equal(result.http,'403');
 assert.equal(requests.length,1);
 assert.equal(requests[0].opts.method,'GET');
 assert.equal(requests[0].opts.body,undefined);
 assert.equal(requests[0].opts.headers.Authorization,undefined);
 assert.equal(requests[0].opts.credentials,undefined);
 assert.match(result.interpretation,/exige sessao/);
 await assert.rejects(check('https://outro.example',{resolver}),/Endereco nao permitido/);
});
test('distingue 500 html e DNS indisponivel',async()=>{
 const a=await check(HOSTS[1],{resolver,fetcher:async()=>response(500,'text/html')});
 assert.equal(a.type,'text/html');assert.match(a.interpretation,/erro de servidor/);
 const b=await check(HOSTS[1],{resolver:async()=>{throw Object.assign(new Error(),{code:'ENOTFOUND'})},fetcher:async()=>{throw new Error('Nao deveria consultar')}});
 assert.match(b.dns,/ENOTFOUND/);assert.equal(b.http,'nao testado');
});
