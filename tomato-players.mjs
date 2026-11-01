import {TOMATO_SERVERS,tomatoRequest,tomatoTitles,tomatoSeasons,tomatoEpisodes,streamChoices} from './tomato-api.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected='principal';
let controller=null;
const localProxy=()=>['localhost','127.0.0.1'].includes(location.hostname) && location.protocol.startsWith('http');
function request(path,body){return tomatoRequest(path,{server:selected,body,signal:controller.signal,localProxy:localProxy()})}
function begin(root){controller?.abort();controller=new AbortController();root.innerHTML='<div class="loading">Consultando o servidor do Tomato…</div>';return controller;}
const note='<p class="source-note">Rotas e servidores preservados da versao anterior. Esta e uma integracao nao oficial. Nao contorna login, CAPTCHA, DRM ou bloqueios do servidor; a reproducao depende de uma resposta autorizada e de um formato aceito pelo navegador.</p>';
function serverControl(){return `<label class="tomato-server">Servidor <select id="tm-server">${TOMATO_SERVERS.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${escape(x.label)}</option>`).join('')}</select></label>`}
function bindServer(){const control=document.getElementById('tm-server');if(control)control.onchange=()=>{selected=control.value;const p=location.hash;if(p.startsWith('#tomato?q='))searchTomato(new URLSearchParams(p.slice(p.indexOf('?')+1)).get('q')||'');else if(p==='#tomato')showTomato();else rerenderCurrent();};}
let rerenderCurrent=()=>{};
function fail(root,error,retry){root.innerHTML=`<section class="notice"><h2>O servidor nao liberou essa consulta</h2><p class="danger">${escape(error?.message||'Nao foi possivel carregar.')}</p><p>O site abre o player sem exigir cadastro local, mas a API do Tomato pode exigir autenticacao. Nenhum token e inventado e nao ha acesso garantido aos videos.</p><div class="row"><button id="tm-retry" class="primary">Tentar de novo</button><a href="#tomato">Voltar aos servidores</a></div></section>${note}`;document.getElementById('tm-retry').onclick=retry;}
function viewHeader(title){return `<a class="muted-link" href="#tomato">‹ Servidores Tomato</a><h1 class="short-title">${escape(title)}</h1>${serverControl()}`}
function sameController(c){return c===controller&&!c.signal.aborted;}
export function showTomato(){
 const root=document.querySelector('#main');begin(root);rerenderCurrent=showTomato;
 root.innerHTML=`<span class="eyebrow">INTEGRACAO ORIGINAL</span><h1 class="short-title">Players Tomato</h1><p>Voltei com os servidores principal e alternativo, busca, temporadas, episodios e seletor de qualidade. Sem tela obrigatoria de login ou CAPTCHA.</p>${serverControl()}<form id="tm-form" class="search"><input id="tm-input" type="search" placeholder="Buscar anime no Tomato" aria-label="Buscar no Tomato" maxlength="100" required><button class="primary">Buscar</button></form><div id="tm-results" role="status"><p>Busque um anime para consultar o catalogo do servidor selecionado.</p></div>${note}`;
 bindServer();document.getElementById('tm-form').onsubmit=e=>{e.preventDefault();const q=document.getElementById('tm-input').value.trim();const wanted='#tomato?q='+encodeURIComponent(q);if(location.hash===wanted)searchTomato(q);else location.hash=wanted};
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
