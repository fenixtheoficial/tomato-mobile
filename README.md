# Tomato Mobile Web | Google Login via Firebase

Esta versao substitui a autenticacao OAuth quebrada do APK Android do Tomato por **Firebase Authentication + Google** para o SEU site. O perfil pode entrar com Google, sair e recuperar a sessao automaticamente apos recarregar a pagina. **Nao autentica no Tomato nem desbloqueia os episodios do Tomato.**

## CONFIGURACAO OBRIGATORIA (10 passos)

1. Acesse https://console.firebase.google.com/ com sua conta Google.
2. Clique em **Criar projeto** e crie um projeto seu (nao use o projeto do Tomato).
3. No projeto, acesse **Build > Authentication > Get started**.
4. Em **Sign-in method**, habilite **Google**, configure o e-mail de suporte solicitado e salve.
5. Em **Settings > Authorized domains**, adicione o dominio real do site. Para GitHub Pages, use somente `SEUUSUARIO.github.io` (sem https:// e sem `/tomato-mobile/`). Para desenvolvimento local, adicione `localhost` se ainda nao estiver listado.
6. Abra **Project settings > General > Your apps > Add app > Web** (icone `</>`). Registre um app web.
7. Copie `apiKey`, `authDomain`, `projectId` e `appId` da configuracao de aplicativo exibida pelo Firebase.
8. Abra `firebase-config.mjs` e COLE os quatro valores entre aspas. **Nunca cole `client_secret`, private key JSON, tokens ou senhas.** Esses quatro campos sao configuracao PUBLICA do Firebase.
9. Envie os arquivos do ZIP para a raiz do GitHub Pages. O `index.html` deve ficar na raiz; atualize o `firebase-config.mjs` preenchido.
10. Abra o endereco HTTPS publicado > **Meu perfil > Entrar com Google**. Permita pop-ups. Aguarde a confirmacao do Google; ao recarregar, a sessao sera restaurada pelo Firebase.

### Exemplo (valores FICTICIOS)
```js
export const firebaseConfig = {
  apiKey: 'AIza...copiada-do-firebase',
  authDomain: 'meu-projeto.firebaseapp.com',
  projectId: 'meu-projeto',
  appId: '1:123456789:web:abcdef123456'
};
```

`authDomain` e dominio de autenticação Firebase. Nao use `SEUUSUARIO.github.io` como `authDomain` a menos que voce tenha configurado um domínio autenticador personalizado no Firebase.

### Por que o login do Tomato nao funcionava?

O APK Android continha um OAuth Client ID Google cadastrado no projeto do Tomato. Uma origem Web nao cadastrada nesse projeto nao pode usar esse Client ID. O dono do projeto teria de autorizar o dominio e configurar a verificacao dos tokens no backend Tomato. Ter um Client ID seu no Firebase nao autoriza sua conta nos servidores do Tomato.

### Diagnostico

- `auth/unauthorized-domain`: Authentication > Settings > Authorized domains > adicione `SEUUSUARIO.github.io` (sem caminho), ou `localhost` para desenvolvimento local.
- `auth/operation-not-allowed`: habilite o provedor Google em Authentication > Sign-in method.
- `auth/invalid-api-key`: copie os campos novamente da configuracao Web no Firebase.
- `auth/popup-blocked`: permita pop-ups para o site.
- `auth/network-request-failed`: verifique internet, bloqueadores e restricoes de rede.
- `redirect_uri_mismatch`: revise se seu projeto/authDomain e o provedor Google estao corretamente configurados no Firebase. Nao use Client ID Android.

### Privacidade e dados

- O login REAL com Google eh gerenciado pelo Firebase Auth, nao pelo armazenamento local. A sessao do Firebase persiste no navegador; o token ID nao eh gravado por nosso codigo em `localStorage`.
- Favoritos e apelido sao armazenados apenas no navegador, separados por identificador da conta Google. **Nao sincronizam com outros aparelhos** e podem sumir ao limpar dados do site.
- A busca publica continua sendo feita na API AniList. Nao ha acesso a videos ou API do Tomato.
- Nao inclua credenciais privadas no GitHub. A configuracao Web do Firebase e publica, mas proteja corretamente quaisquer regras e servicos Firebase ativados.

### Hospedagem no GitHub Pages

Faca upload dos arquivos na raiz do repositorio, ative Settings > Pages > Deploy from branch > main > /(root), e abra `https://SEUUSUARIO.github.io/NOME-REPO/`.

### No Windows

Execute `INICIAR.bat` ou `npm start` e abra `http://localhost:3000`. O Google exige que `localhost` esteja autorizado no Firebase. Nao abra o arquivo HTML diretamente com `file://`.

### Testes locais

`npm test`. Testes automatizados nao substituem um login real: so o dono do projeto Firebase pode cadastrar o dominio e completar o fluxo ao vivo.
