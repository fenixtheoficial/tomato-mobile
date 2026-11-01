export function configured(config){
 if (!config || typeof config!=='object') return false;
 const keys=['apiKey','authDomain','projectId','appId'];
 return keys.every(key=>typeof config[key]==='string'&&config[key].trim().length>4&&!/(COLOQUE|SEU_|YOUR_|EXEMPLO|\.\.\.)/i.test(config[key]))
   && !/[\/\s]/.test(config.authDomain) && !/[\/\s]/.test(config.projectId);
}
export function safeKey(type,uid){
 const base=type==='favorites'?'tomato-web-favorites':'tomato-web-profile';
 if(!uid)return base;
 if(!/^[a-zA-Z0-9_-]{5,256}$/.test(uid)) throw new Error('Identificador de conta invalido.');
 return base+'-google-'+uid;
}
export function signInMessage(error){
 const code=String(error?.code||'');
 const messages={
  'auth/unauthorized-domain':'Domínio não autorizado. No Firebase Console > Authentication > Settings > Authorized domains, adicione o endereço deste site (ex.: USUARIO.github.io ou localhost).',
  'auth/operation-not-allowed':'Ative o provedor Google no Firebase Console > Authentication > Sign-in method.',
  'auth/invalid-api-key':'A apiKey do firebase-config.mjs está incorreta. Copie a configuração do seu aplicativo Web no Firebase.',
  'auth/invalid-app-credential':'Configuração OAuth inválida. Verifique o provedor Google e o domínio autorizado no Firebase.',
  'auth/invalid-credential':'O Google não aceitou a credencial. Confira a configuração de autenticação.',
  'auth/popup-blocked':'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
  'auth/popup-closed-by-user':'A janela do Google foi fechada antes de concluir o login.',
  'auth/cancelled-popup-request':'Uma tentativa anterior de login foi cancelada. Tente novamente.',
  'auth/network-request-failed':'Falha de rede ao conectar com o Google/Firebase. Verifique a internet e bloqueadores.',
  'auth/internal-error':'O serviço de autenticação falhou. Verifique as configurações do Firebase e tente depois.',
  'auth/invalid-client-id':'O aplicativo OAuth configurado é inválido. Use o projeto Firebase do próprio site.',
  'auth/argument-error':'A configuração Firebase está incompleta ou incorreta.'
 };
 return messages[code]||('Não foi possível conectar com o Google'+(code? ' ('+code.replace(/[^a-z0-9/_-]/gi,'').slice(0,60)+')':'')+'.');
}
