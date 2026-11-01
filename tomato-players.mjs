import {TOMATO_SERVERS,tomatoTitles,tomatoSeasons,tomatoEpisodes,streamChoices} from './tomato-api.mjs';
import {createTomatoSession} from './tomato-session.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected='principal';
const tomatoSession=createTomatoSession();
let captchaToken='',captchaInstance=null,captchaId=null;
let controller=null;
const localProxy=()=>location.protocol.startsWith('http')&&!location.hostname.endsWith('.github.io');
const securePasswordOrigin=()=>location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
function request(path,body){return tomatoSession.request(path,{server:selected,body,signal:controller.signal,localProxy:localProxy()})}
function begin(root){controller?.abort();controller=new AbortController();root.innerHTML='<div class="loading">Consultando o servidor do Tomato…</div>';return controller;}
const note='<p class="source-note">Integracao experimental, nao oficial. O login do Tomato so vale se a propria API emitir uma sessao. O login Google/Firebase e separado. Nao ha desvio de CAPTCHA, DRM ou permissoes de streaming.</p>';
function serverControl(){return `<label class="tomato-server">Servidor <select id="tm-server">${TOMATO_SERVERS.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${escape(x.label)}</option>`).join('')}</select></label>`}
function bindServer(){const control=document.getElementById('tm-server');if(control)control.onchange=()=>{selected=control.value;captchaToken='';const p=location.hash;if(p.startsWith('#tomato?q='))searchTomato(new URLSearchParams(p.slice(p.indexOf('?')+1)).get('q')||'');else if(p==='#tomato')showTomato();else rerenderCurrent();};}
let rerenderCurrent=()=>{};
function fail(root,error,retry){root.innerHTML=`<section class="notice"><h2>Falha na consulta ao Tomato</h2><p class="danger">${escape(error?.message||'Nao foi possivel carregar.')}</p><p>${Number(error?.status)===500?'O servidor retornou HTTP 500; isto pode persistir mesmo com login valido.':'Se a rota exige sessao, entre com uma conta Tomato existente na aba Players. Tokens nao sao inventados.'}</p><div class="row"><button id="tm-retry" class="primary">Tentar de novo</button><a href="#tomato">Entrar no Tomato / servidores</a></div></section>${note}`;document.getElementById('tm-retry').onclick=retry;}
function viewHeader(title){return `<a class="muted-link" href="#tomato">‹ Servidores Tomato</a><h1 class="short-title">${escape(title)}</h1>${serverControl()}`}
function sameController(c){return c===controller&&!c.signal.aborted;}

function tomatoLoginPanel(){
 const signed=tomatoSession.authenticated&&tomatoSession.server===selected;
 return `<section class="tomato-auth-panel" aria-label="Conta Tomato"><h2>Conta Tomato</h2>${signed?
  `<p class="tm-auth-status">Conectado neste navegador como <strong>${escape(tomatoSession.email)}</strong> no servidor ${escape(selected)}. A sessao sera apagada quando recarregar a pagina.</p><button id="tm-logout" type="button">Sair do Tomato</button>`:
  `<p class="tiny">Para consultar rotas que exigem conta, entre com uma conta Tomato ja existente. Esse login e diferente do Google/Firebase. A senha nao fica salva.</p>
   <form id="tm-login-form" class="tm-login-form" autocomplete="on">
    <label>E-mail da conta Tomato<input id="tm-email" type="email" autocomplete="username" required maxlength="254" placeholder="seu@email.com"></label>
    <label>Senha do Tomato<input id="tm-password" type="password" autocomplete="current-password" required maxlength="256" placeholder="Senha da conta Tomato"></label>
    <div><button class="primary" type="submit">Entrar na conta Tomato</button></div>
   </form>
   <details class="tm-human"><summary>Verificacao humana (se solicitada)</summary><p class="tiny">Este CAPTCHA pertence ao Tomato e pode recusar dominios nao autorizados. Nao e possivel alterar essa permissao neste site.</p><button id="tm-captcha-load" type="button">Carregar hCaptcha</button><div id="tm-captcha-area"></div></details>`}
   <p id="tm-login-status" class="tiny" role="status" aria-live="polite"></p>
   <p class="tiny">${localProxy()?'O Node do seu site encaminha HTTPS apenas aos servidores configurados. Senhas nao sao registradas nem persistidas pelo codigo. Para entrar, use localhost no PC ou HTTPS.':'GitHub Pages nao possui o proxy Node.js: login e API podem falhar por CORS. Para usar a ponte, execute npm start ou hospede o Node num servidor HTTPS.'}</p>
 </section>`;
}
let hCaptchaSDK=null;
async function loadHCaptcha(){
 if(window.hcaptcha?.render)return window.hcaptcha;
 if(hCaptchaSDK)return hCaptchaSDK;
 hCaptchaSDK=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src='https://js.hcaptcha.com/1/api.js?render=explicit';el.async=true;
  let poll;const timer=setTimeout(()=>{if(poll)clearInterval(poll);reject(new Error('Tempo esgotado ao carregar hCaptcha.'))},12000);
  el.onerror=()=>{clearTimeout(timer);if(poll)clearInterval(poll);reject(new Error('Nao foi possivel carregar hCaptcha.'))};
  el.onload=()=>{poll=setInterval(()=>{if(window.hcaptcha?.render){clearInterval(poll);clearTimeout(timer);resolve(window.hcaptcha)}},100)};
  document.head.appendChild(el);
 }).catch(e=>{hCaptchaSDK=null;throw e});
 return hCaptchaSDK;
}
function bindTomatoLogin(onSuccess){
 const status=document.getElementById('tm-login-status');
 const signout=document.getElementById('tm-logout');
 if(signout){signout.onclick=()=>{tomatoSession.signout();captchaToken='';onSuccess()};return}
 const form=document.getElementById('tm-login-form');
 if(form)form.onsubmit=async ev=>{
  ev.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
  status.textContent='Conectando a conta Tomato…';
  const password=document.getElementById('tm-password');
  try{
   if(!securePasswordOrigin())throw new Error('Nao insira sua senha em um endereco HTTP de rede local. Use localhost no proprio PC ou configure HTTPS.');
   await tomatoSession.login({server:selected,email:document.getElementById('tm-email').value,password:password.value,verification:captchaToken,localProxy:localProxy()});
   password.value='';captchaToken='';onSuccess();
  }catch(e){status.textContent=e.message||'O Tomato nao aceitou o login.';}
  finally{password.value='';submit.disabled=false;}
 };
 const load=document.getElementById('tm-captcha-load');
 if(load)load.onclick=async()=>{
  load.disabled=true;status.textContent='Carregando desafio…';
  try{
   const sdk=await loadHCaptcha();const area=document.getElementById('tm-captcha-area');
   if(!area)return;
   if(captchaInstance&&captchaId!==null)try{captchaInstance.remove(captchaId)}catch{};
   captchaInstance=sdk;captchaToken='';
   captchaId=sdk.render(area,{sitekey:'d0706611-1d89-4b8c-af79-3caf0f14feba',theme:'dark',size:area.clientWidth<310?'compact':'normal',callback:token=>{captchaToken=token;status.textContent='Verificacao concluida. Tente entrar.'},'expired-callback':()=>{captchaToken='';status.textContent='CAPTCHA expirado. Resolva novamente.'},'error-callback':()=>{captchaToken='';status.textContent='CAPTCHA recusado ou indisponivel neste dominio.'}});
   load.hidden=true;status.textContent='Complete o desafio para obter o token de verificacao.';
  }catch(e){status.textContent=e.message||'hCaptcha indisponivel.'}finally{load.disabled=false}
 };
}
export function showTomato(){
 const root=document.querySelector('#main');begin(root);rerenderCurrent=showTomato;
 root.innerHTML=`<span class="eyebrow">INTEGRACAO ORIGINAL</span><h1 class="short-title">Players Tomato</h1><p>Servidores principal e alternativo, busca, episodios e qualidades quando a API os disponibilizar. O login Tomato e opcional para consultar, mas pode ser exigido pelo servidor.</p>${serverControl()}${tomatoLoginPanel()}<form id="tm-form" class="search"><input id="tm-input" type="search" placeholder="Buscar anime no Tomato" aria-label="Buscar no Tomato" maxlength="100" required><button class="primary">Buscar</button></form><div id="tm-results" role="status"><p>Busque um anime para consultar o catalogo do servidor selecionado.</p></div>${note}`;
 bindServer();bindTomatoLogin(showTomato);document.getElementById('tm-form').onsubmit=e=>{e.preventDefault();const q=document.getElementById('tm-input').value.trim();const wanted='#tomato?q='+encodeURIComponent(q);if(location.hash===wanted)searchTomato(q);else location.hash=wanted};
}
export async function searchTomato(query=''){
 const root=document.querySelector('#main');const c=begin(root);rerenderCurrent=()=>searchTomato(query);
 root.innerHTML=`${viewHeader('Buscar no Tomato')}<form id="tm-form" class="search"><input id="tm-input" type="search" maxlength="100" placeholder="Nome do anime" aria-label="Nome do anime" value="${escape(query)}" required><button class="primary">Buscar</button></form><div id="tm-results" role="status" aria-live="polite">Consultando o servidor…</div>${note}`;
 bindServer();document.getElementById('tm-form').onsubmit=e=>{e.preventDefault();const q=document.getElementById('tm-input').value.trim();const wanted='#tomato?q='+encodeURIComponent(q);if(location.hash===wanted)searchTomato(q);else location.hash=wanted;};
 try{
  const data=await request('/v2/content/search',{search:query,content_type:'anime',page:0});if(!sameController(c))return;
  const found=tomatoTitles(data);document.getElementById('tm-results').innerHTML=found.length?`<p>${found.length} resultados retornados pelo Tomato:</p><div class="cards">${found.map(x=>`<article class="card"><a href="#tomato-anime/${encodeURIComponent(x.id)}" class="card-link"><div class="poster">${x.image?`<img src="${escape(x.image)}" loading="lazy" alt="">`:'Anime'}</div><strong>${escape(x.title)}</strong><small>Ver episodios</small></a></article>`).join('')}</div>`:'<p>Nenhum anime encontrado neste servidor.</p>';
 }catch(e){if(sameController(c))fail(root,e,()=>searchTomato(query))}
}
export async function showTomatoAnime(id){
 const root=document.querySelector('#main'),c=begin(root);rerenderCurrent=()=>showTomatoAnime(id);
 try{
  const data=await request('/v2/anime/'+encodeURIComponent(id));if(!sameController(c))return;
  const info=data.anime_details||{},seasons=tomatoSeasons(data);
  root.innerHTML=`${viewHeader(info.anime_name||'Episodios do Tomato')}<p>${escape(info.anime_description||'Selecione uma temporada e um episodio.')}</p><label class="tomato-server">Temporada <select id="tm-season">${seasons.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}${s.dubbed?' · Dublado':''}</option>`).join('')}</select></label><div id="tm-episodes" class="episodes" aria-live="polite">${seasons.length?'Carregando episodios…':'Nenhuma temporada foi retornada.'}</div><button id="tm-more" class="more" hidden>Carregar mais episodios</button>${note}`;
  bindServer();if(!seasons.length)return;
  const sel=document.getElementById('tm-season'),more=document.getElementById('tm-more');let offset=0;
  const load=async()=>{
   const s=sel.value,currentOffset=offset;more.disabled=true;
   try{
    const list=await request(`/v3/seasons/${encodeURIComponent(s)}/episodes?order=asc&limit=25&offset=${currentOffset}`);if(!sameController(c)||sel.value!==s)return;
    const eps=tomatoEpisodes(list);const area=document.getElementById('tm-episodes');
    if(!currentOffset)area.innerHTML='';area.insertAdjacentHTML('beforeend',eps.map(x=>`<a class="tm-episode" href="#tomato-watch/${encodeURIComponent(x.id)}"><strong>${escape(x.number)}</strong><span>${escape(x.title)}</span></a>`).join(''));
    if(!eps.length&&!currentOffset)area.textContent='Nenhum episodio disponivel.';
    more.hidden=!list?.pagination?.has_more;
   }catch(e){if(sameController(c)){document.getElementById('tm-episodes').textContent=e.message;more.hidden=true}}
   finally{if(sameController(c))more.disabled=false}
  };
  sel.onchange=()=>{offset=0;load()};more.onclick=()=>{offset+=25;load()};await load();
 }catch(e){if(sameController(c))fail(root,e,()=>showTomatoAnime(id))}
}
export async function showTomatoWatch(id){
 const root=document.querySelector('#main'),c=begin(root);rerenderCurrent=()=>showTomatoWatch(id);
 try{
  const data=await request('/v2/anime/episode/'+encodeURIComponent(id)+'/stream');if(!sameController(c))return;
  const choices=streamChoices(data);
  root.innerHTML=`${viewHeader(data.episodeName||'Player do episodio')}<div class="video-shell"><video id="tm-video" class="tomato-video" controls playsinline preload="metadata" x-webkit-airplay="allow"></video></div><p id="tm-player-error" class="danger" role="alert"></p><div class="tomato-player-options"><label>Qualidade <select id="tm-quality">${choices.map(x=>`<option value="${escape(x.key)}">${escape(x.label)}</option>`).join('')}</select></label><label>Velocidade <select id="tm-speed"><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label><button id="tm-full">Tela cheia</button>${data.episodeHasNext&&data.nextEpisodeID?`<a class="pill" href="#tomato-watch/${encodeURIComponent(data.nextEpisodeID)}">Proximo episodio</a>`:''}</div><p class="tiny">Para video HLS (.m3u8), use Safari no iPhone. Outros navegadores podem exigir suporte adicional. Fontes bloqueadas por permissao nao podem ser reproduzidas.</p>${note}`;
  bindServer();const v=document.getElementById('tm-video'),quality=document.getElementById('tm-quality'),error=document.getElementById('tm-player-error');
  const key=`tm-progress-${selected}-${id}`;let resume=0;try{resume=Math.max(0,Number(localStorage.getItem(key))||0)}catch{}
  const setVideo=(choice,at=0)=>{if(!choice)return;v.pause();v.src=choice.url;v.onloadedmetadata=()=>{if(at&&Number.isFinite(v.duration))v.currentTime=Math.min(at,Math.max(0,v.duration-1));};v.load()};
  if(choices.length){const preferred=choices.find(x=>x.key==='mhd')||choices[0];quality.value=preferred.key;setVideo(preferred,resume)}
  else error.textContent='O servidor nao retornou nenhum stream HTTPS para esse episodio.';
  quality.onchange=()=>setVideo(choices.find(x=>x.key===quality.value),v.currentTime);
  document.getElementById('tm-speed').onchange=e=>v.playbackRate=Number(e.target.value);
  document.getElementById('tm-full').onclick=()=>{if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();else v.requestFullscreen?.().catch(()=>{error.textContent='Tela cheia indisponivel neste navegador.'})};
  v.onerror=()=>{error.textContent='O video nao conseguiu carregar. O link pode exigir autorizacao, ter expirado ou usar formato incompativel.'};
  v.ontimeupdate=()=>{try{if(Math.floor(v.currentTime)%5===0)localStorage.setItem(key,String(v.currentTime))}catch{}};
  v.onended=()=>{try{localStorage.removeItem(key)}catch{}};
 }catch(e){if(sameController(c))fail(root,e,()=>showTomatoWatch(id))}
}
