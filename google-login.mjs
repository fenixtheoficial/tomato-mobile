import {firebaseConfig, firebaseMissingFields} from './firebase-config.mjs';
import {configured, signInMessage} from './login-utils.mjs';

// Esta autenticacao e do Firebase do SEU site, nao da API do Tomato.
// Dependencias importadas diretamente do CDN oficial, compatível com GitHub Pages.
const CDN = 'https://www.gstatic.com/firebasejs/12.19.0/';
let auth = null;
let authAPI = null;
let initializePromise = null;
let unsubscribe = null;

export const googleConfigured = configured(firebaseConfig);
export let googleReady = false;

export async function initGoogle({onUser = () => {}, onStatus = () => {}} = {}) {
  if (!googleConfigured) {
    const missing = firebaseMissingFields();
    onStatus(missing.length
      ? `Firebase não configurado. Preencha no firebase-config.mjs: ${missing.join(', ')}.`
      : 'Configuração do Firebase inválida. Copie os dados do app Web no Firebase Console.');
    onUser(null);
    return false;
  }
  if (initializePromise) return initializePromise;

  onStatus('Conectando ao Firebase…');
  initializePromise = (async () => {
    try {
      const [firebase, api] = await Promise.all([
        import(CDN + 'firebase-app.js'),
        import(CDN + 'firebase-auth.js')
      ]);
      const app = firebase.getApps().length ? firebase.getApp() : firebase.initializeApp(firebaseConfig);
      const candidateAuth = api.getAuth(app);
      // O Firebase persiste a conta no navegador e a restaura apos atualizar a pagina.
      await api.setPersistence(candidateAuth, api.browserLocalPersistence);
      auth = candidateAuth;
      authAPI = api;

      if (unsubscribe) unsubscribe();
      unsubscribe = api.onAuthStateChanged(auth,
        user => {
          onUser(user ? {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || ''
          } : null);
          onStatus(user ? 'Conta Google conectada.' : 'Pronto para entrar com Google.');
        },
        error => onStatus(signInMessage(error))
      );
      googleReady = true;
      onStatus('Pronto para entrar com Google.');
      return true;
    } catch (error) {
      googleReady = false;
      auth = null;
      authAPI = null;
      initializePromise = null; // permite tentar novamente se o CDN ficar indisponivel
      onStatus(signInMessage(error) + ' Verifique a conexao com o Firebase.');
      return false;
    }
  })();
  return initializePromise;
}

export async function signInGoogle() {
  if (!googleReady || !authAPI || !auth) {
    throw new Error('Google ainda não está pronto. Confira o firebase-config.mjs e o domínio autorizado.');
  }
  try {
    // Chamado diretamente pelo clique do usuario, para permitir a janela OAuth.
    await authAPI.signInWithPopup(auth, new authAPI.GoogleAuthProvider());
  } catch (error) {
    throw new Error(signInMessage(error));
  }
}

export async function signOutGoogle() {
  if (!auth || !authAPI) return;
  try {
    await authAPI.signOut(auth);
  } catch (error) {
    throw new Error(signInMessage(error));
  }
}
