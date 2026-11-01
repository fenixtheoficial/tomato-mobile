import {mountGoogleLogin} from './google-auth.mjs';
import {captchaWidget} from './captcha.mjs';
import {authenticate,authError,requireSession} from './account.mjs';
import {secret} from './core.mjs';
export function authUI({onSession,getProfile,getHint=()=>null}){
 const $=s=>document.querySelector(s),dialog=$('#login'),backdrop=$('#login-backdrop'),captcha=captchaWidget($('#captcha-widget'),s=>$('#captcha-status').textContent=s);
 // Use a non-modal <dialog> with our own backdrop. showModal() places the
 // dialog in the browser's top layer, above hCaptcha's challenge iframe even
 // when hCaptcha assigns its iframe the maximum possible z-index.
 const background=[document.querySelector('header'),$('#main'),document.querySelector('nav'),$('#session-banner')].filter(Boolean);
 let previousFocus=null;
 function openDialog(){
  if(dialog.open)return;
  previousFocus=document.activeElement;
  backdrop.hidden=false;
  document.body.classList.add('auth-open');
  for(const el of background)el.inert=true;
  dialog.show();
  $('#close-login').focus();
 }

 let mode='login',epoch=0,inflight=null,busy=false,pending={};
 const selectedHost=()=>$('#auth-host').value;
 // O mesmo desafio hCaptcha pode ser necessário para login e registro.
 // Mostrar antes do botão evita o envio acidental sem verificação.
 const area=$('#captcha-area');
 function placeCaptcha(){
  const target=$('#'+mode+'-form').querySelector('button[type=submit]');
  target.parentNode.insertBefore(area,target);
  area.open=mode==='register';
 }
 async function diagnostic(){
  const button=$('#api-check'),output=$('#api-diagnostics');
  button.disabled=true;output.textContent='Consultando as APIs, sem enviar senha nem criar conta…';
  try{
   const response=await fetch('/api/tomato/status',{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error('Servidor local não disponibilizou o diagnóstico (HTTP '+response.status+').');
   const result=await response.json();
   if(!Array.isArray(result.consultas))throw new Error('Resposta de diagnóstico inválida.');
   const status={responde:'respondendo com JSON',exige_autenticacao:'respondeu JSON; exige autenticação',falha_remota:'falha no servidor externo',resposta_inesperada:'resposta não reconhecida',rejeitou_requisicao:'recusou consulta sem login',tempo_esgotado:'demorou demais',sem_conexao:'não foi possível conectar'};
   output.textContent=result.consultas.map(x=>`${x.servidor==='principal'?'Principal':'Alternativo'}: ${status[x.situacao]||'situação desconhecida'}${x.http?' (HTTP '+x.http+', '+x.formato+')':''}.`).join('\n')+'\nTeste somente de leitura: não confirma que o cadastro funciona.';
  }catch(error){output.textContent='O GitHub Pages não executa o proxy Node.js. Este diagnóstico funciona somente na versão hospedada em servidor Node. O login e o cadastro dependem de acesso direto à API do Tomato e podem falhar por CORS ou erro remoto.'}
  finally{button.disabled=false}
 }
 $('#api-check').addEventListener('click',diagnostic);
 function controls(loading){busy=loading;dialog.querySelectorAll('form button,[data-auth-mode],#auth-host,#google-start,#remember-login').forEach(b=>b.disabled=loading)}
 function setMode(next){if(busy)return;epoch++;mode=next;pending={};captcha.clear();placeCaptcha();$('#captcha-status').textContent='';$('#captcha-load').hidden=false;
  for(const m of ['login','register']){$('#'+m+'-form').hidden=m!==mode;$('#auth-'+m).setAttribute('aria-pressed',String(m===mode));$('#'+m+'-error').textContent=''}
  $('#google-section').hidden=mode!=='login';$('#auth-title').textContent=mode==='register'?'Crie sua conta para conectar.':'Entre na sua conta Tomato.';
  if(mode==='register'&&!$('#register-form').elements.username.value)$('#register-form').elements.username.value=getProfile()?.name?.slice(0,24)||'';
  $('#google-button').replaceChildren();$('#google-start').hidden=false;$('#google-status').textContent='Integração experimental: depende da autorização deste domínio no projeto Google do Tomato.';
 }
 function close(){if(dialog.open)dialog.close()}
 backdrop.addEventListener('click',close);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&dialog.open){event.preventDefault();close()}
 });
 dialog.addEventListener('close',()=>{
  backdrop.hidden=true;
  document.body.classList.remove('auth-open');
  for(const el of background)el.inert=false;
  if(previousFocus?.isConnected)previousFocus.focus();
  previousFocus=null;
epoch++;inflight?.abort();inflight=null;controls(false);captcha.clear();window.google?.accounts?.id?.cancel();for(const f of [$('#login-form'),$('#register-form')])for(const e of f.querySelectorAll('input[type=password]'))e.value='';$('#register-form').elements.consent.checked=false;pending={}});
 $('#close-login').onclick=close;
 for(const m of ['login','register'])$('#auth-'+m).onclick=()=>setMode(m);
 $('#auth-host').onchange=()=>{epoch++;pending={};captcha.clear();$('#captcha-load').hidden=false;$('#google-button').replaceChildren();$('#google-start').hidden=false;$('#google-start').disabled=false;$('#google-status').textContent='Conexão alterada. Inicie o login Google novamente.'};
 $('#captcha-load').onclick=async()=>{const b=$('#captcha-load');b.disabled=true;try{await captcha.load();b.hidden=true}catch{}finally{b.disabled=false}};
 $('#google-start').onclick=async()=>{const b=$('#google-start'),attempt=++epoch;b.disabled=true;$('#google-status').textContent='Carregando o Google…';try{await mountGoogleLogin({container:$('#google-button'),status:s=>$('#google-status').textContent=s,getHost:selectedHost,isOpen:()=>dialog.open&&attempt===epoch&&mode==='login',onSession:async(result,h,refreshToken)=>{const session=requireSession(result,refreshToken);await onSession({session,account:result.account||null},h,{remember:$('#remember-login').checked,email:result.account?.email||''});close()}});if(attempt===epoch)b.hidden=true}catch(e){$('#google-status').textContent=e.message}finally{b.disabled=false}};
 for(const operation of ['login','register'])$('#'+operation+'-form').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  const f=e.currentTarget,fields=f.elements,h=selectedHost(),attempt=++epoch;
  const message=$('#'+operation+'-error');message.textContent='';
  if(operation==='register'&&!captcha.getToken()){
   $('#captcha-area').open=true;
   message.textContent=captcha.isLoaded()?'Conclua a verificação humana antes de criar a conta.':'Carregue e resolva a verificação humana antes de enviar o cadastro. O formulário não foi enviado.';
   $('#captcha-load').focus();
   return;
  }
  controls(true);inflight=new AbortController();
  const key=operation+':'+fields.email.value.trim();if(pending.key!==key)pending={key,secret:secret()};
  try{
   const input={email:fields.email.value,password:fields.password.value,verification:captcha.getToken(),...(operation==='register'?{username:fields.username.value,confirm:fields.confirm.value,consent:fields.consent.checked}:{})};
   const result=await authenticate(h,operation,input,{signal:inflight.signal,refreshToken:pending.secret});
   if(attempt!==epoch||!dialog.open)return;
   await onSession(result,h,{registered:operation==='register',username:input.username,remember:$('#remember-login').checked,email:input.email});close();
  }catch(error){if(attempt===epoch&&dialog.open&&error.name!=='AbortError'){message.textContent=authError(error,operation);if(/captcha|verification|human/i.test(String(error.code)+' '+error.message))$('#captcha-area').open=true}}
  finally{if(attempt===epoch){inflight=null;controls(false);captcha.reset()}}
 };
 return {show(next='login'){const hint=getHint();if(hint){$('#auth-host').value=hint.host;for(const id of ['login','register']){const field=$('#'+id+'-form').elements.email;if(!field.value)field.value=hint.email||''}}if(!dialog.open)openDialog();setMode(next)},close};
}
