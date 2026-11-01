import {firebaseConfig} from './firebase-config.mjs';
import {configured,signInMessage} from './login-utils.mjs';

// Firebase Auth cria uma sessao REAL para este site, nao para a API do Tomato.
// CDN oficial: permite publicar no GitHub Pages sem compilacao ou Node.
const CDN='https://www.gstatic.com/firebasejs/12.19.0/';
let auth,api;
export const googleConfigured=configured(firebaseConfig);
export let googleReady=false;

export async function initGoogle({onUser,onStatus}){
 if(!googleConfigured){
  onStatus('Google ainda não configurado. Preencha firebase-config.mjs com os dados do SEU projeto Firebase. Veja o README.');
  return false;
 }
 onStatus('Conectando ao serviço Google…');
 try{
  const [firebase,firebaseAuth]=await Promise.all([
   import(CDN+'firebase-app.js'),
   import(CDN+'firebase-auth.js')
  ]);
  const app=firebase.initializeApp(firebaseConfig);
  auth=firebaseAuth.getAuth(app);api=firebaseAuth;
  api.onAuthStateChanged(auth,user=>{
   onUser(user?{uid:user.uid,name:user.displayName||'',email:user.email||''}:null);
   onStatus(user?'Conta Google conectada.':'Pronto para entrar com Google.');
  },err=>onStatus(signInMessage(err)));
  googleReady=true;
  onStatus('Pronto para entrar com Google.');
  return true;
 }catch(error){onStatus(signInMessage(error)+' Verifique também a conexão com o CDN oficial do Firebase.');return false}
}
export async function signInGoogle(){
 if(!googleReady||!api||!auth)throw new Error('A autenticação Google ainda não está configurada ou pronta.');
 try{
  // O popup precisa ser chamado diretamente pelo clique para não ser bloqueado.
  await api.signInWithPopup(auth,new api.GoogleAuthProvider());
 }catch(error){throw new Error(signInMessage(error))}
}
export async function signOutGoogle(){
 if(!auth||!api)return;
 try{await api.signOut(auth)}catch(error){throw new Error(signInMessage(error))}
}
