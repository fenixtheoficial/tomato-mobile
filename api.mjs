/** AniList public metadata API, no private keys, no third-party account credentials. */
export const API_URL='https://graphql.anilist.co';
export const FIELDS=`id title { romaji english native } coverImage { large } bannerImage description(asHtml:false) seasonYear episodes averageScore format status genres siteUrl externalLinks { site url type } streamingEpisodes { title url thumbnail }`;
const LIST_QUERY=`query($page:Int!,$search:String,$sort:[MediaSort]){Page(page:$page,perPage:20){pageInfo{currentPage hasNextPage} media(type:ANIME,search:$search,sort:$sort){${FIELDS}}}}`;
const DETAIL_QUERY=`query($id:Int!){Media(id:$id,type:ANIME){${FIELDS}}}`;
export class CatalogError extends Error {constructor(message,status=0){super(message);this.name='CatalogError';this.status=status;}}
function timeoutSignal(ms,signal){const ctrl=new AbortController(); const abort=()=>ctrl.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)ctrl.abort();const timer=setTimeout(()=>ctrl.abort(),ms);return {signal:ctrl.signal,cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',abort)}};}
export async function graphql(query,variables,{fetcher=fetch,signal}={}){
 const guard=timeoutSignal(14000,signal);let response;
 try{response=await fetcher(API_URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables}),signal:guard.signal,credentials:'omit'});}
 catch(e){if(signal?.aborted)throw e;throw new CatalogError(guard.signal.aborted?'A consulta demorou demais. Tente novamente.':'Não foi possível conectar ao catálogo público. Confira a conexão ou tente novamente.');}
 finally{guard.cleanup();}
 const raw=await response.text();let obj;
 try{obj=JSON.parse(raw)}catch{throw new CatalogError(`O catálogo público retornou uma resposta inválida (HTTP ${response.status}).`,response.status)}
 if(!response.ok||obj?.errors?.length){const error=obj?.errors?.[0];
  if(response.status===429)return Promise.reject(new CatalogError('Muitas consultas em pouco tempo. Tente novamente daqui a pouco.',429));
  throw new CatalogError(error?.message ? `Erro no catálogo: ${String(error.message).slice(0,160)}`:`O catálogo público respondeu HTTP ${response.status}.`,response.status);
 }
 if(!obj?.data||typeof obj.data!=='object')throw new CatalogError('O catálogo retornou dados incompletos.');
 return obj.data;
}
export async function listAnime({q='',page=1,signal,fetcher}={}){
 const search=String(q).trim();const p=Math.max(1,Math.min(50,Math.floor(Number(page)||1)));
 const data=await graphql(LIST_QUERY,{page:p,search:search||null,sort:[search?'SEARCH_MATCH':'TRENDING_DESC']},{fetcher,signal});
 const pg=data.Page;if(!pg||!Array.isArray(pg.media))throw new CatalogError('O catálogo retornou uma lista inválida.');
 return {items:pg.media,page:pg.pageInfo?.currentPage||p,hasNext:!!pg.pageInfo?.hasNextPage};
}
export async function animeDetails(id,{signal,fetcher}={}){
 const n=Number(id);if(!Number.isSafeInteger(n)||n<1)throw new CatalogError('Anime inválido.');
 const data=await graphql(DETAIL_QUERY,{id:n},{fetcher,signal});
 if(!data.Media)throw new CatalogError('Anime não encontrado.');return data.Media;
}
export function safeUrl(u){try{const url=new URL(u);return url.protocol==='https:'?url.href:null}catch{return null}}
export function plainDescription(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim()}
export function getTitle(m){return m?.title?.english||m?.title?.romaji||m?.title?.native||'Anime sem título'};
export function serializeFavorite(m){return {id:Number(m.id),name:getTitle(m),image:safeUrl(m.coverImage?.large),year:m.seasonYear||null,score:m.averageScore||null};}
export function normalizeFavorites(items){return Array.isArray(items)?items.filter(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&typeof x.name==='string').slice(0,300):[];}
