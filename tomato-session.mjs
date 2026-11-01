// Sessao Tomato temporaria: nenhuma credencial e persistida em localStorage ou no Node.
// refresh_token: 32 bytes aleatorios no mesmo formato Base64URL usado no cliente original.
import {tomatoRequest,TomatoError} from './tomato-api.mjs';
export function refreshId(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function loginBody(email,password,verification='',refresh_token=refreshId()){
 email=String(email??'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new TomatoError('Informe um e-mail valido para a conta Tomato.');
 if(typeof password!=='string'||password.length<1||password.length>256)throw new TomatoError('Informe a senha da conta Tomato.');
 return {email,password,verification:String(verification||''),fingerprint:'Web/Tomato-Mobile',refresh_token,device_model:'Tomato Mobile Web'};
}
export function parseSession(data,fallback=''){
 const obj=(data&&typeof data.data==='object'&&data.data.access_token)?data.data:data;
 if(typeof obj?.access_token!=='string'||!obj.access_token.trim())throw new TomatoError('O Tomato nao retornou access_token. A conta nao foi autenticada.');
 return {token:obj.access_token,refreshToken:typeof obj.refresh_token==='string'&&obj.refresh_token?obj.refresh_token:fallback};
}
export function createTomatoSession({send=tomatoRequest}={}){
 let active=null,identity='',stamp=0;
 async function login({server,email,password,verification='',localProxy=false,signal}={}){
  const epoch=++stamp;active=null;identity='';
  const body=loginBody(email,password,verification);
  const result=await send('/v3/auth/login',{server,body,localProxy,signal});
  const session=parseSession(result,body.refresh_token);
  if(epoch!==stamp)throw new TomatoError('A tentativa de login foi cancelada.');
  active={server,...session,localProxy};identity=email.trim();return {email:identity,server};
 }
 function signout(){stamp++;active=null;identity='';}
 async function request(path,{server,body,localProxy=false,signal}={}){
  const base=active?.server===server?active:null;
  const opts={server,body,localProxy,signal,token:base?.token};
  try{return await send(path,opts)}
  catch(e){
   if(!base||!base.refreshToken||![401,403].includes(e.status)||active!==base)throw e;
   const epoch=stamp;
   let refreshed;
   try{
    refreshed=await send('/v3/auth/refresh',{server,body:{refresh_token:base.refreshToken,device_model:'Tomato Mobile Web'},localProxy,signal});
    const next=parseSession(refreshed,base.refreshToken);
    if(epoch!==stamp||active!==base)throw new TomatoError('A sessao mudou.');
    active={server,...next,localProxy};
   }catch(refreshError){if(active===base)signout();throw new TomatoError('A sessao Tomato expirou ou foi recusada. Entre novamente.',401)}
   return send(path,{...opts,token:active.token});
  }
 }
 return {login,request,signout,get authenticated(){return !!active?.token},get server(){return active?.server??null},get email(){return identity}};
}
