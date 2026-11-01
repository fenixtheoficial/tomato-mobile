// Firebase Web SDK: copie estes 4 campos do SEU aplicativo Web no Firebase Console.
// Console -> Configuracoes do projeto -> Geral -> Seus apps -> Web -> Configuracao do SDK.
// Esta e uma configuracao publica. NUNCA insira senhas, tokens, client_secret ou chaves privadas.
// Os valores enviados pelo usuario estavam vazios e nao podem ser descobertos pelo site.
// O login com Google ficara desativado ate voce preencher os quatro campos.
export const firebaseConfig = {
  apiKey: 'AIzaSyCEBBQ5IZuhZ5VDDzXiNH8Pv-n62NW9aP4',
  authDomain: 'tomato-79c0a.firebaseapp.com',
  projectId: 'tomato-79c0a',
  appId: '1:655650400104:web:e4f2422dd5b1d2ad1158dd'
};

export function firebaseMissingFields(config = firebaseConfig) {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].filter(
    key => typeof config?.[key] !== 'string' || !config[key].trim()
  );
}
