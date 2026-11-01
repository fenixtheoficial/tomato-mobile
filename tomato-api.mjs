/** Cliente para rotas do Tomato identificadas no codigo anteriormente enviado.
 *  Nenhum token e fabricado. Acesso depende das permissoes da API de origem.
 */
export const TOMATO_SERVERS=Object.freeze([
 {id:'principal',label:'Tomato principal',url:'https://prod-api.tomatoanimes.com'},
 {id:'alternativo',label:'Tomato alternativo',url:'https://edge.betomato.com'}
]);
export class TomatoError extends Error {
 constructor(message,status=0){super(message);this.name='TomatoError';this.status=status;}
}
export function validTomatoRoute(path,method='GET'){
 if(typeof path!=='string'||path.length>240)return false;
 if(method==='POST')return path==='/v2/content/search';
 if(method!=='GET')return false;
 return /^\/v2\/anime\/(?:[\w-]{1,96}|episode\/[\w-]{1,96}\/stream)$/.test(path)
  || /^\/v3\/seasons\/[\w-]{1,96}\/episodes\?order=asc&limit=25&offset=\d{1,6}$/.test(path);
}
export function safeVideoUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}
}
export function streamChoices(response){
 const data=response?.streams;
 if(!data||typeof data!=='object'||Array.isArray(data))return [];
 const labels={shd:'480p',mhd:'720p',fhd:'1080p'};
 return Object.entries(data).flatMap(([key,url])=>{
  const safe=safeVideoUrl(url);
  return safe?[{key,label:labels[key]||key.toUpperCase(),url:safe}]:[];
 });
}
export function tomatoTitles(data){
 const src=Array.isArray(data)?data:(data?.result??data?.data?.result??data?.data??[]);
 return Array.isArray(src)?src.map(x=>({
  id:String(x?.anime_id??x?.id??''),title:String(x?.anime_name??x?.name??x?.title??'Sem titulo'),image:safeVideoUrl(x?.anime_cover_url??x?.image)
 })).filter(x=>/^[\w-]{1,96}$/.test(x.id)):[];
}
export function tomatoSeasons(data){
 return (Array.isArray(data?.anime_seasons)?data.anime_seasons:[]).map(x=>({
  id:String(x.season_id??''),name:String(x.season_name??`Temporada ${x.season_number??''}`),dubbed:!!x.season_dubbed
 })).filter(x=>/^[\w-]{1,96}$/.test(x.id));
}
export function tomatoEpisodes(data){
 return (Array.isArray(data?.episodes)?data.episodes:[]).map(x=>({
  id:String(x.id??x.episode_id??''),title:String(x.name??x.episode_name??x.title??`Episódio ${x.number??''}`),number:x.number??x.episode_number??'?'
 })).filter(x=>/^[\w-]{1,96}$/.test(x.id));
}
export async function tomatoRequest(path,{server='principal',body,signal,fetcher=fetch,localProxy=false}={}){
 const chosen=TOMATO_SERVERS.find(x=>x.id===server);
 const method=body?'POST':'GET';
 if(!chosen||!validTomatoRoute(path,method))throw new TomatoError('Rota de consulta invalida.');
 const url=localProxy?`/api/tomato?server=${encodeURIComponent(server)}&path=${encodeURIComponent(path)}`:chosen.url+path;
 let response;
 try{
  response=await fetcher(url,{method,headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,credentials:'omit',cache:'no-store'});
 }catch(err){
  if(signal?.aborted)throw err;
  throw new TomatoError(localProxy?'Nao foi possivel acessar o proxy local. Confere se o Node esta rodando.':'O navegador nao conseguiu consultar o Tomato. Pode ser CORS, rede ou servidor indisponivel. No GitHub Pages nao existe proxy Node.');
 }
 let text;
 try{text=await response.text()}catch{throw new TomatoError('A resposta da API nao pode ser lida.',response.status)}
 let data;
 try{data=JSON.parse(text)}catch{
  if(response.status===401||response.status===403)throw new TomatoError('O servidor nao autorizou o acesso. Precisa de uma sessao reconhecida pelo Tomato.',response.status);
  throw new TomatoError(`O Tomato devolveu HTTP ${response.status} sem JSON${/<!doctype|<html/i.test(text)?' (pagina HTML de erro)':''}. Nao e possivel corrigir o backend pelo site.`,response.status);
 }
 const status=Number(data?.status_code)||response.status;
 if(response.status===401||response.status===403||status===401||status===403||/authentication failed|unauthorized|token required|not authenticated/i.test(String(data?.message??''))){
  throw new TomatoError('Este servidor exige uma sessao autorizada do Tomato para liberar o catalogo ou o episodio. O login Google do site nao substitui essa sessao.',status);
 }
 if(!response.ok||data?.status===false){
  const reason=String(data?.message??data?.error?.message??data?.error??'Erro nao especificado').slice(0,180);
  throw new TomatoError(`O Tomato respondeu HTTP ${status}: ${reason}.`,status);
 }
 if(!data||typeof data!=='object')throw new TomatoError('O servidor nao retornou dados validos.',status);
 return data;
}
