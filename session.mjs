import {HOSTS,request} from './core.mjs';
import {DEVICE_MODEL,requireSession} from './account.mjs';
const cancelled=()=>new DOMException('A sessão mudou.','AbortError');
export function savedSession(record){
 if(!record||record.version!==1||!HOSTS.includes(record.host)||typeof record.refreshToken!=='string'||!record.refreshToken.trim())return null;
 return {version:1,host:record.host,refreshToken:record.refreshToken,sessionId:typeof record.sessionId==='string'?record.sessionId:null};
}
export const expiredAccess=e=>['access_token_expired','invalid_access_token'].includes(e.code)||[401,403].includes(e.status)&&/authentication failed|unauthenticated|token.*expired/i.test(e.message||'');
const revoked=e=>/invalid_refresh_token|refresh_token_expired|session_revoked|session_expired|session_ended|sign_in_required|account_deleted/.test(e.code||'')||[401,403].includes(e.status)&&/authentication failed|invalid.*refresh|revoked/i.test(e.message||'');
export function sessionManager({storage,send=request,onChange=()=>{},onNotice=()=>{}}){
 let current=null,epoch=0,flight=null,abort=null,writing=Promise.resolve();
 const emit=()=>onChange(current);
 const serial=fn=>{writing=writing.catch(()=>{}).then(fn);return writing};
 const persist=async(rev)=>{
  try{await serial(()=>{if(rev!==epoch)return;return current?.remembered?storage.save(savedSession({version:1,host:current.host,refreshToken:current.session.refreshToken,sessionId:current.session.sessionId})):storage.clear()})}
  catch{if(rev===epoch){if(current)current.remembered=false;emit();let cleared=true;try{await serial(()=>rev===epoch?storage.clear():undefined)}catch{cleared=false}onNotice(cleared?'Você entrou, mas o navegador não permitiu guardar o login. Ele ficará ativo apenas nesta aba.':'Você entrou nesta aba, mas o login salvo não pôde ser atualizado. Limpe os dados deste site para remover qualquer login anterior.')}}
 };
 async function accept(session,host,remember=true){
  if(!HOSTS.includes(host))throw new Error('Servidor inválido.');requireSession({access_token:session?.token});
  const rev=++epoch;abort?.abort();flight=null;
  current={host,session:{token:session.token,refreshToken:session.refreshToken||null,sessionId:session.sessionId||null},remembered:remember===true&&!!session.refreshToken};emit();await persist(rev);
 }
 async function refresh(){
  if(flight)return flight;
  if(!current?.session.refreshToken)throw new Error('Entre na sua conta Tomato para continuar.');
  const rev=epoch,base=current;const control=new AbortController();abort=control;
  current={...base,session:{...base.session,token:null}};emit();
  const task=Promise.resolve().then(async()=>{
   try{
    const result=await send(base.host,'/v3/auth/refresh',{body:{refresh_token:base.session.refreshToken,device_model:DEVICE_MODEL},signal:control.signal});
    if(rev!==epoch)throw cancelled();
    const session=requireSession(result,base.session.refreshToken);
    current={...base,session:{...session,sessionId:session.sessionId||base.session.sessionId}};emit();await persist(rev);return current;
   }catch(e){
    if(rev!==epoch)throw cancelled();
    if(revoked(e)){current=null;emit();await serial(()=>rev===epoch?storage.clear():undefined).catch(()=>{});onNotice('O Tomato encerrou o login salvo. Entre novamente para continuar.');}
    else if(e.name!=='AbortError')onNotice('Não foi possível renovar o acesso agora. Seu login salvo foi mantido para tentar novamente.');
    throw e;
   }finally{if(rev===epoch){flight=null;abort=null}}
  });flight=task;return task;
 }
 async function restore(){
  const rev=++epoch;abort?.abort();flight=null;current=null;emit();
  let record;
  try{record=await writing.then(()=>storage.load())}catch{onNotice('O navegador não permitiu recuperar o login salvo. Você pode entrar normalmente.');return false}
  if(rev!==epoch)return false;
  const valid=savedSession(record);
  if(!valid){if(record)await serial(()=>rev===epoch?storage.clear():undefined).catch(()=>{});return false}
  current={host:valid.host,session:{token:null,refreshToken:valid.refreshToken,sessionId:valid.sessionId},remembered:true};emit();
  try{await refresh();return rev===epoch&&!!current?.session.token}catch{return false}
 }
 async function api(path,body,signal){
  const base=current,rev=epoch;
  if(!base?.session.token)throw new Error('Entre ou reconecte sua conta para acessar os episódios.');
  try{return await send(base.host,path,{token:base.session.token,body,signal})}
  catch(e){
   if(rev!==epoch)throw cancelled();
   if(!expiredAccess(e)||!current?.session.refreshToken||signal?.aborted)throw e;
   if(current.session.token===base.session.token||!current.session.token)await refresh();
   if(rev!==epoch||!current?.session.token)throw cancelled();
   return send(current.host,path,{token:current.session.token,body,signal});
  }
 }
 async function logout(){
  const previous=current;const rev=++epoch;abort?.abort();flight=null;current=null;emit();
  await serial(()=>rev===epoch?storage.clear():undefined).catch(()=>onNotice('Não foi possível apagar o login salvo. Limpe os dados deste site no navegador.'));
  if(previous?.session.refreshToken)try{await send(previous.host,'/v3/auth/logout',{body:{refresh_token:previous.session.refreshToken,device_model:DEVICE_MODEL}})}catch{onNotice('Login apagado neste aparelho. A revogação no servidor não pôde ser confirmada.')}
 }
 return {get current(){return current},accept,restore,refresh,api,logout};
}
