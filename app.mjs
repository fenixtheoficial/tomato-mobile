import {listAnime,animeDetails,getTitle,safeUrl,plainDescription,serializeFavorite,normalizeFavorites} from './api.mjs';
import {googleConfigured,initGoogle,signInGoogle,signOutGoogle} from './google-login.mjs';
import {safeKey} from './login-utils.mjs';

const main=document.querySelector('#main');
const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getSaved=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}};
const putSaved=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{notify('O navegador bloqueou o armazenamento local.');return false}};
let googleUser=null, googleMessage=googleConfigured?'Preparando login Google…':'Google ainda não configurado. Leia o README para habilitar.';
const currentKey=type=>safeKey(type,googleUser?.uid);
let favorites=normalizeFavorites(getSaved(currentKey('favorites'),[]));
let nickname=String(getSaved(currentKey('profile'),'')||'').slice(0,32);
let serial=0,controller=null,lastQuery='',currentPage=1;

function notify(message){const node=$('#toast');node.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.textContent='',4500)}
const safeMediaImage=m=>safeUrl(m.coverImage?.large)||null;
const isSaved=id=>favorites.some(x=>x.id===Number(id));
function storeFavorite(m){
 const id=Number(m.id),found=isSaved(id);
 favorites=found?favorites.filter(x=>x.id!==id):[serializeFavorite(m),...favorites].slice(0,300);
 putSaved(currentKey('favorites'),favorites);
 notify(found?'Removido da sua lista.':'Salvo na sua lista.');return !found;
}
const cover=(url,label)=>url?`<img loading="lazy" src="${escapeHtml(url)}" alt="Capa de ${escapeHtml(label)}">`:'<span class="cover-fallback">Anime</span>';
function card(m){
 const title=getTitle(m);const fav=isSaved(m.id);
 return `<article class="card"><a href="#anime/${Number(m.id)}" class="card-link"><div class="poster">${cover(safeMediaImage(m)||m.image,title)}</div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(m.seasonYear||m.year||'Ano não informado')} ${Number.isFinite(m.averageScore)?' · '+m.averageScore+'%':Number.isFinite(m.score)?' · '+m.score+'%':''}</small></a><button type="button" class="save-small ${fav?'selected':''}" data-fav="${Number(m.id)}" aria-label="${fav?'Remover dos favoritos':'Salvar nos favoritos'}" title="${fav?'Remover da lista':'Salvar na lista'}">${fav?'★':'☆'}</button></article>`;
}
function row(items){return items.length?`<div class="cards">${items.map(card).join('')}</div>`:'<div class="empty"><h3>Nenhum anime encontrado</h3><p>Experimenta outro nome ou a grafia original.</p></div>'}
function spinner(message='Carregando informações…'){main.innerHTML=`<div class="loading"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`}
function errorBox(error,action='Tentar novamente'){
 main.innerHTML=`<section class="notice"><span class="eyebrow">CATÁLOGO INDISPONÍVEL</span><h2>Deu ruim na consulta, não no teu perfil.</h2><p>${escapeHtml(error.message||'Não foi possível carregar o catálogo.')}</p><button class="primary" id="retry">${escapeHtml(action)}</button><p class="tiny">As informações são consultadas do AniList. O site não usa as APIs de cadastro do Tomato.</p></section>`;
 $('#retry').onclick=()=>route();
}
function setNavigation(page){for(const link of document.querySelectorAll('nav a'))link.classList.toggle('active',link.id==='nav-'+page)}
function newRequest(){controller?.abort();controller=new AbortController();const id=++serial;return {id,signal:controller.signal};}
function isCurrent(id){return id===serial}
function metadataNote(){return '<p class="source-note">Metadados públicos fornecidos pelo AniList. Esta edição independente não cria contas Tomato nem hospeda episódios.</p>'}
async function home(){
 const req=newRequest();spinner('Buscando animes em destaque…');
 try{const data=await listAnime({signal:req.signal});if(!isCurrent(req.id))return;
 main.innerHTML=`<section class="hero"><div><span class="eyebrow">EDIÇÃO WEB INDEPENDENTE</span><h1>Teu próximo anime começa aqui.</h1><p>Pesquisa, detalhes e favoritos sem cadastro, sem CAPTCHA e sem aquele festival de erro 500.</p><a class="cta" href="#search">Pesquisar animes</a></div><div class="hero-art" aria-hidden="true"><div class="orb"></div></div></section><section class="section"><div class="row between"><h2>Em alta</h2><a class="muted-link" href="#search">Explorar todos</a></div>${row(data.items)}</section>${metadataNote()}`;
 }catch(error){if(isCurrent(req.id)&&error.name!=='AbortError')errorBox(error)}
}
function searchMarkup(q,items=[],page=1,hasNext=false){
 return `<section><span class="eyebrow">ENCONTRE SEU ANIME</span><h1 class="short-title">Buscar</h1><form id="search-form" class="search"><input id="search-input" type="search" name="q" value="${escapeHtml(q)}" placeholder="Ex.: Mushoku Tensei, Naruto, Bleach…" aria-label="Nome do anime" autocomplete="off" maxlength="100"><button class="primary">Pesquisar</button></form><p class="small">Busca no catálogo de informações do AniList, sem login.</p></section><section id="results"><div class="row between"><h2>${q?'Resultados para '+escapeHtml(q):'Em destaque'}</h2><span class="small">Página ${page}</span></div>${row(items)}${hasNext?'<button id="next-page" class="more">Próxima página</button>':''}</section>${metadataNote()}`;
}
async function search(q='',page=1){
 const req=newRequest();spinner('Consultando o catálogo…');const query=String(q).trim().slice(0,100);lastQuery=query;currentPage=page;
 try{const data=await listAnime({q:query,page,signal:req.signal});if(!isCurrent(req.id))return;
 main.innerHTML=searchMarkup(query,data.items,data.page,data.hasNext);$('#search-form').onsubmit=event=>{event.preventDefault();const next=$('#search-input').value.trim();const wanted='#search?q='+encodeURIComponent(next);if(location.hash===wanted)search(next,1);else location.hash=wanted};
 $('#next-page')?.addEventListener('click',()=>search(query,page+1));
 }catch(error){if(isCurrent(req.id)&&error.name!=='AbortError'){errorBox(error);const retry=$('#retry');retry.onclick=()=>search(query,page)}}
}
function providerLinks(media){
 const links=(media.externalLinks||[]).filter(l=>safeUrl(l.url)&&String(l.type).toUpperCase()==='STREAMING');
 const eps=(media.streamingEpisodes||[]).filter(l=>safeUrl(l.url));
 return `<section class="section"><h2>Onde assistir</h2>${links.length?'<div class="platforms">'+links.slice(0,15).map(x=>`<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(safeUrl(x.url))}">${escapeHtml(x.site||'Plataforma externa')} ↗</a>`).join('')+'</div>':'<p>O AniList não informou plataformas de streaming para este título.</p>'}${eps.length?`<h3 class="subheading">Links de episódios listados pelo catálogo</h3><div class="episodes">${eps.slice(0,24).map(ep=>`<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(safeUrl(ep.url))}">${escapeHtml(ep.title||'Abrir episódio')} ↗</a>`).join('')}</div>`:''}<p class="tiny">Links externos, sem player incorporado. Disponibilidade, dublagem e direitos variam por plataforma e região.</p></section>`;
}
async function details(id){
 const req=newRequest();spinner('Abrindo detalhes…');
 try{const m=await animeDetails(id,{signal:req.signal});if(!isCurrent(req.id))return;
 const title=getTitle(m),fav=isSaved(m.id),description=plainDescription(m.description),year=m.seasonYear||'Não informado',score=m.averageScore||'Não informado',episodes=m.episodes||'Não informado';
 main.innerHTML=`<a class="muted-link" href="#search">‹ Voltar à busca</a><section class="anime-detail"><div class="detail-poster poster">${cover(safeMediaImage(m),title)}</div><div><span class="eyebrow">DETALHES DO ANIME</span><h1 class="detail-title">${escapeHtml(title)}</h1><p class="detail-meta">${escapeHtml(year)} · ${escapeHtml(m.format||'Anime')} · ${escapeHtml(episodes)} episódios · Nota ${escapeHtml(score)}${Number.isFinite(score)?'%':''}</p><div class="tags">${(m.genres||[]).slice(0,6).map(g=>`<span>${escapeHtml(g)}</span>`).join('')}</div><p>${escapeHtml(description||'Sinopse indisponível em português no catálogo.')}</p><button id="detail-save" class="primary" type="button">${fav?'Remover da minha lista':'Salvar na minha lista'}</button> <a class="muted-link" href="${escapeHtml(safeUrl(m.siteUrl)||'https://anilist.co')}" target="_blank" rel="noopener noreferrer">Ver no AniList ↗</a></div></section>${providerLinks(m)}${metadataNote()}`;
 $('#detail-save').onclick=()=>{const added=storeFavorite(m);$('#detail-save').textContent=added?'Remover da minha lista':'Salvar na minha lista'};
 }catch(error){if(isCurrent(req.id)&&error.name!=='AbortError')errorBox(error)}
}
function saved(){newRequest();main.innerHTML=`<span class="eyebrow">NO TEU NAVEGADOR</span><h1 class="short-title">Minha lista</h1><p>Salva apenas neste aparelho, mesmo sem conta.</p>${favorites.length?row(favorites):'<div class="empty"><h3>Sua lista ainda está vazia.</h3><p>Abre um anime na busca e salva aqui.</p><a class="cta" href="#search">Buscar animes</a></div>'}<p class="source-note">Se limpar os dados do navegador, esta lista será apagada. Não sincroniza com a conta do Tomato.</p>`}
function account(){
 newRequest();
 const accountInfo=googleUser
  ? `<p>Conectado como <strong>${escapeHtml(googleUser.name||googleUser.email)}</strong>${googleUser.email?' ('+escapeHtml(googleUser.email)+')':''}.</p><button id="google-out" type="button">Sair da conta Google</button>`
  : `<button id="google-in" class="primary" type="button" ${!googleConfigured?'disabled':''}>Entrar com Google</button>`;
 main.innerHTML=`<span class="eyebrow">GOOGLE NO SEU SITE</span><h1 class="short-title">Meu perfil</h1>
 <section class="account-panel"><h2>Entrar com Google</h2>${accountInfo}<p class="small" id="google-feedback" role="status">${escapeHtml(googleMessage)}</p><p class="small">Login real via Firebase, com sessão persistente neste navegador. <strong>Não é uma conta Tomato</strong> e não libera vídeos protegidos.</p></section>
 <section class="account-panel"><h2>Preferências locais</h2><p>Seu nome e favoritos ficam <strong>neste aparelho</strong>${googleUser?', separados por conta Google':''}. Não há sincronização entre dispositivos.</p><form id="profile-form"><label for="profile-name">Como quer ser chamado?</label><input type="text" name="name" id="profile-name" minlength="1" maxlength="32" autocomplete="nickname" placeholder="Meu perfil" required value="${escapeHtml(nickname)}"><button class="primary" type="submit">Salvar perfil</button></form><p class="small">${nickname?'Perfil atual: '+escapeHtml(nickname):'Sem apelido salvo ainda.'}</p></section>
 <section class="notice"><h2>E minha conta do Tomato?</h2><p>A autenticação deste site é independente da conta Tomato. O Google autentica pessoas para o projeto Firebase configurado, mas não concede acesso automático à API do Tomato.</p><p>O catálogo de informações vem do <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>. Não inclui episódios hospedados pelo Tomato.</p></section>
 <button id="clear-data" class="quiet danger">Apagar perfil e lista ${googleUser?'desta conta neste navegador':'locais deste navegador'}</button>`;
 const enter=$('#google-in'),out=$('#google-out');
 if(enter)enter.onclick=async()=>{enter.disabled=true;$('#google-feedback').textContent='Abrindo login seguro do Google…';try{await signInGoogle()}catch(error){googleMessage=error.message;const box=$('#google-feedback');if(box)box.textContent=googleMessage;enter.disabled=false}};
 if(out)out.onclick=async()=>{out.disabled=true;try{await signOutGoogle()}catch(error){googleMessage=error.message;const box=$('#google-feedback');if(box)box.textContent=googleMessage;out.disabled=false}};
 $('#profile-form').onsubmit=e=>{e.preventDefault();const name=$('#profile-name').value.trim();if(!name||name.length>32){notify('Digite um nome de 1 a 32 caracteres.');return}nickname=name;putSaved(currentKey('profile'),nickname);notify('Perfil salvo neste navegador.');account()};
 $('#clear-data').onclick=()=>{if(!confirm('Apagar perfil e favoritos desta conta salvos NESTE navegador?'))return;nickname='';favorites=[];try{localStorage.removeItem(currentKey('profile'));localStorage.removeItem(currentKey('favorites'))}catch{};notify('Dados locais apagados.');account()};
}

async function route(){
 const [pageAndQuery,id]=location.hash.replace(/^#/,'').split('/');const [page,queryString]=String(pageAndQuery||'home').split('?');setNavigation(['home','search','saved','account'].includes(page)?page:'');
 if(page==='account')return account();if(page==='saved')return saved();if(page==='anime'&&id)return details(decodeURIComponent(id));if(page==='search'){const p=new URLSearchParams(queryString||'');return search(p.get('q')||'',1)}return home();
}
// Favorite buttons work in every list, including after paging.
main.addEventListener('click',async event=>{
 const button=event.target.closest('button[data-fav]');if(!button)return;
 const id=Number(button.dataset.fav);const old=favorites.find(x=>x.id===id);
 if(old){storeFavorite(old);button.textContent='☆';button.classList.remove('selected');button.setAttribute('aria-label','Salvar nos favoritos');return}
 button.disabled=true;
 try{const m=await animeDetails(id);if(button.isConnected){storeFavorite(m);button.textContent='★';button.classList.add('selected');button.setAttribute('aria-label','Remover dos favoritos')}}catch(err){notify('Não foi possível salvar agora: '+err.message)}finally{if(button.isConnected)button.disabled=false}
});
window.addEventListener('hashchange',route);route();
initGoogle({
 onUser(user){
  if(googleUser?.uid===user?.uid)return;
  googleUser=user;
  favorites=normalizeFavorites(getSaved(currentKey('favorites'),[]));
  nickname=String(getSaved(currentKey('profile'),user?.name||'')||'').slice(0,32);
  const page=location.hash.split('/')[0].split('?')[0];
  if(['#account','#saved'].includes(page))route();
 },
 onStatus(message){googleMessage=message;const el=$('#google-feedback');if(el)el.textContent=message;const b=$('#google-in');if(b&&googleConfigured)b.disabled=!['Pronto para entrar com Google.'].includes(message)&&!googleUser}
});
