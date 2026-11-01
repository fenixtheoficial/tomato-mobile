export const HOSTS=['https://prod-api.tomatoanimes.com','https://edge.betomato.com'];
export const urlSafe=v=>{try {const u=new URL(v);return u.protocol==='https:'?u.href:null}catch{return null}};
export function streams(data){return Object.entries(data?.streams||{}).flatMap(([key,url])=>urlSafe(url)?[{key,url:urlSafe(url),label:({shd:'480p',mhd:'720p',fhd:'1080p'})[key]||key}]:[])}
export function item(x){return {id:String(x.anime_id??x.id??''),name:x.anime_name??x.name??'Sem título',image:urlSafe(x.anime_cover_url??x.image??''),type:x.type??'anime'}}
export function secret(){return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
let proxyAvailable;
export async function endpoint(host,path){
 // Detecta se a interface está servida pelo nosso Node local; hospedagens
 // estáticas continuam usando acesso direto. Apenas a rota /health é sondada.
 if (typeof window === 'undefined' || typeof location === 'undefined') return host+path;
 if (!proxyAvailable) proxyAvailable = (async()=>{
  try {
   const r=await fetch(new URL('health', document.baseURI).href,{method:'GET',cache:'no-store',credentials:'omit'});
   if (!r.ok || !(r.headers.get('content-type')||'').includes('application/json'))return false;
   const j=await r.json(); return j?.app==='tomato-mobile' && j?.servidor==='node';
  } catch {return false}
 })();
 const isLocal = await proxyAvailable;
 if (!isLocal) return host+path;
 const which = host === HOSTS[0] ? 'principal' : 'alternativo';
 return '/api/tomato/'+which+path;
}
export async function request(host,path,{token,body,signal}={}){
 if(!HOSTS.includes(host)||!path.startsWith('/v'))throw new Error('Endereço da API inválido.');
 const control=new AbortController();let timedOut=false;
 const cancel=()=>control.abort();
 if(signal?.aborted)control.abort();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;control.abort()},20000);
 try{
  let response;
  const url=await endpoint(host,path);
  try{response=await fetch(url,{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:control.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'})}
  catch(e){
   if(signal?.aborted)throw e;
   if(timedOut){const error=new Error('O Tomato demorou para responder.');error.code='timeout';throw error}
   throw new Error('Não foi possível conectar ao Tomato. Pode ser rede, CORS ou indisponibilidade do servidor.');
  }
  const format=response.headers?.get?.('content-type')||'';
  const raw=await response.text();
  let data;try{data=JSON.parse(raw.replace(/^\uFEFF/,''))}catch(e){
   if(signal?.aborted)throw e;
   const isHtml=/text\/html/i.test(format)||/<\s*(?:!doctype|html|head|body)/i.test(raw.slice(0,400));
   const error=new Error(`O Tomato respondeu com ${isHtml?'HTML':'um formato inválido'} (HTTP ${response.status}). ${response.status===403?'Possível bloqueio de segurança ou CAPTCHA.':response.status===404?'A rota de cadastro pode ter mudado.':'Não foi possível concluir a operação.'}`);
   error.status=response.status;error.code='non_json_upstream';throw error;
  }
  if(!data||typeof data!=='object')throw new Error('Resposta da API inválida.');
  if(!response.ok||data.status===false){const reason=data.message||data.error?.message||(typeof data.error==='string'?data.error:null)||`Erro HTTP ${response.status}`;const e=new Error(String(reason));e.status=data.status_code||response.status;e.code=data.error?.code||data.code||(typeof data.error==='string'?data.error:'');e.upstream_status=data.upstream_status;e.upstream_host=data.upstream_host;e.upstream_type=data.upstream_type;throw e}
  return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
