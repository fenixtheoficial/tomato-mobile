import {secret,request,HOSTS} from './core.mjs';
// Public OAuth client ID found in TomatoSignIn in the supplied APK. This is
// not a secret. The project owner must authorize the website's exact origin.
export const GOOGLE_CLIENT_ID='105396401224-jsd52eqj4ggvki59ao88lno2smsvbmt2.apps.googleusercontent.com';
export function validateGoogleClaims(credential,nonce,clientId=GOOGLE_CLIENT_ID,now=Date.now()){
 if(typeof credential!=='string'||credential.split('.').length!==3)throw new Error('O Google não retornou um token de identidade válido.');
 let claims;try{const encoded=credential.split('.')[1].replaceAll('-','+').replaceAll('_','/');claims=JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'=')))}catch{throw new Error('Resposta de identidade inválida.');}
 if(claims.aud!==clientId||!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.nonce!==nonce||!Number.isFinite(claims.exp)||claims.exp*1000<=now||typeof claims.sub!=='string'||!claims.sub)throw new Error('A resposta do Google expirou ou não pertence a esta tentativa de login.');
 // These checks bind the browser callback; the Tomato backend MUST verify
 // the signature, issuer, audience and expiry before issuing its session.
}
let sdkPromise;
export function loadGoogleSDK(){
 if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.referrerPolicy='strict-origin-when-cross-origin';
  const timer=setTimeout(()=>{s.remove();sdkPromise=null;reject(new Error('O Google demorou para responder. Confira a conexão e tente novamente.'))},15000);
  s.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.id)resolve(window.google.accounts.id);else {sdkPromise=null;reject(new Error('Não foi possível iniciar o login Google.'))}};
  s.onerror=()=>{clearTimeout(timer);s.remove();sdkPromise=null;reject(new Error('Não foi possível carregar o Google. Confira a conexão ou bloqueadores de conteúdo.'))};document.head.append(s);
 });return sdkPromise;
}
export async function mountGoogleLogin({container,status,getHost,isOpen,onSession}){
 const selectedHost=getHost();if(!HOSTS.includes(selectedHost))throw new Error('Servidor inválido.');
 const google=await loadGoogleSDK();if(!isOpen())return;
 const nonce=secret();let exchanging=false,finished=false;
 google.initialize({client_id:GOOGLE_CLIENT_ID,auto_select:false,ux_mode:'popup',nonce,itp_support:true,callback:async response=>{
  if(exchanging||finished||!isOpen())return;
  if(getHost()!==selectedHost){status('A conexão mudou. Feche e abra o login para tentar novamente.');return}
  exchanging=true;status('Confirmando sua conta no Tomato…');
  try{
   validateGoogleClaims(response.credential,nonce);
   const refreshToken=secret();
   const result=await request(selectedHost,'/v3/auth/google',{body:{token:response.credential,refresh_token:refreshToken,device_model:'Safari / Tomato Mobile Web'}});
   if(!result.access_token)throw new Error('O Tomato não retornou uma sessão válida.');
   if(isOpen()&&getHost()===selectedHost){finished=true;await onSession(result,selectedHost,refreshToken)}
  }catch(e){status(e.message)}finally{exchanging=false}
 }});
 container.replaceChildren();google.renderButton(container,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',locale:'pt_BR',width:Math.max(200,Math.min(360,container.clientWidth||280))});
 status('Se aparecer “origem não autorizada” ou “origin_mismatch”, o responsável pelo projeto Google do Tomato precisa liberar o endereço deste site.');
}
