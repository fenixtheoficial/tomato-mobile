import test from 'node:test';
import assert from 'node:assert/strict';
import {validTomatoRoute,safeVideoUrl,streamChoices,tomatoTitles,tomatoSeasons,tomatoEpisodes,tomatoRequest} from '../tomato-api.mjs';
test('duas fontes mapeadas pelo APK sem adivinhar streams',async()=>{
 const video=streamChoices({streams:{shd:'https://cdn.exemplo/video480.mp4',mhd:'https://cdn.exemplo/video720.m3u8',fhd:'http://inseguro/video',bad:'javascript:alert(1)'}});
 assert.deepEqual(video.map(x=>x.label),['480p','720p']);assert.equal(video.length,2);assert.equal(safeVideoUrl('http://e.com'),null);
});
test('rotas autorizadas e esquema estrito',()=>{
 assert.equal(validTomatoRoute('/v2/content/search','POST'),true);
 assert.equal(validTomatoRoute('/v2/anime/abc-33'),true);
 assert.equal(validTomatoRoute('/v2/anime/episode/123/stream'),true);
 assert.equal(validTomatoRoute('/v3/seasons/a_bc/episodes?order=asc&limit=25&offset=25'),true);
 for(const x of ['https://evil.com','/v3/auth/register','/v2/other','/v2/anime/../../etc','/v2/anime/1?secret=1']) assert.equal(validTomatoRoute(x),false);
});
test('parseia resultados, temporadas e episodios',()=>{
 assert.deepEqual(tomatoTitles({result:[{anime_id:12,anime_name:'Anime X'}]}).map(x=>x.title),['Anime X']);
 assert.deepEqual(tomatoSeasons({anime_seasons:[{season_id:5,season_name:'T1',season_dubbed:true}]}).map(x=>x.dubbed),[true]);
 assert.equal(tomatoEpisodes({episodes:[{id:8,name:'Primeiro',number:1}]}).length,1);
});
test('sem autenticacao a API responde 403 e o app avisa',async()=>{
 const fetcher=async()=>({ok:false,status:403,text:async()=>JSON.stringify({status:false,message:'authentication failed',status_code:403})});
 await assert.rejects(tomatoRequest('/v2/anime/123',{fetcher}),/sessao propria valida/);
});
test('sem JSON HTTP 500 reporta falha externa',async()=>{
 const fetcher=async()=>({ok:false,status:500,text:async()=>'<html>error</html>'});
 await assert.rejects(tomatoRequest('/v2/anime/123',{fetcher}),/HTTP 500 sem JSON/);
});
test('proxy local pesquisa publica sem credenciais' ,async()=>{
 let url,opts;const fetcher=async(u,o)=>{url=u;opts=o;return {ok:true,status:200,text:async()=>JSON.stringify({result:[]})}};
 await tomatoRequest('/v2/content/search',{server:'alternativo',localProxy:true,body:{search:'Naruto',content_type:'anime',page:0},fetcher});
 assert.match(url,/^\/api\/tomato\?server=alternativo/);assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,undefined);
});
