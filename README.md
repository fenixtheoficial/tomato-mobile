# Tomato Mobile Web | Google Login + Players Tomato

Esta versao substitui a autenticacao OAuth quebrada do APK Android do Tomato por **Firebase Authentication + Google** para o SEU site. O perfil pode entrar com Google, sair e recuperar a sessao automaticamente apos recarregar a pagina. **Google nao autentica no Tomato. A aba Players inclui a integracao experimental com os servidores do Tomato, mas so reproduz fontes liberadas pelo proprio servidor.**

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
- A busca publica continua sendo feita na API AniList. A aba Players consulta a API Tomato separadamente, sem sessao Google e sem promessa de acesso.
- Nao inclua credenciais privadas no GitHub. A configuracao Web do Firebase e publica, mas proteja corretamente quaisquer regras e servicos Firebase ativados.

### Hospedagem no GitHub Pages

Faca upload dos arquivos na raiz do repositorio, ative Settings > Pages > Deploy from branch > main > /(root), e abra `https://SEUUSUARIO.github.io/NOME-REPO/`.

### No Windows

Execute `INICIAR.bat` ou `npm start` e abra `http://localhost:3000`. O Google exige que `localhost` esteja autorizado no Firebase. Nao abra o arquivo HTML diretamente com `file://`.

### Testes locais

`npm test`. Testes automatizados nao substituem um login real: so o dono do projeto Firebase pode cadastrar o dominio e completar o fluxo ao vivo.

## Players do Tomato (restaurados nesta versao)

A aba **Players** voltou. Usa os dois enderecos presentes no codigo antigo:
- Principal: `https://prod-api.tomatoanimes.com`
- Alternativo: `https://edge.betomato.com`

Rotas consultadas: `POST /v2/content/search` (pesquisa); `GET /v2/anime/:id` (temporadas); `GET /v3/seasons/:id/episodes?...` (episodios); `GET /v2/anime/episode/:id/stream` (qualidades e URL do video). O site nao exibe nenhuma etapa local obrigatoria de cadastro ou CAPTCHA para abrir a aba. O Firebase Google Login segue opcional e **nao** autentica no Tomato.

**Aviso essencial:** nao ha sessao publica confirmada para catalogo e streams. O servidor Tomato ja devolveu `authentication failed` em acessos anonimos. Se a origem exigir login, o site mostra a mensagem. Nao ha bypass de controles do Tomato e esta versao nao promete reproducao, mesmo que os controles de player estejam restaurados. Links de video devolvidos e liberados pelo servidor sao tentados em `<video>` com suporte nativo do navegador.

No `localhost` o Node intermedeia somente estas rotas (sem repassar senhas, cookies ou tokens; destinos fixos; sem proxy de arquivo de video). No GitHub Pages nao existe Node: o navegador consulta diretamente os servidores e pode sofrer bloqueio CORS. Para ter um proxy em um site publico, hospede o Node em um servico adequado e implemente configuracao de origem; nao use GitHub Pages como se ele executasse backend.

Para testar: `npm test`, depois `npm start`, abra `http://localhost:3000`, entre em **Players** e tente pesquisar um titulo. A busca padrao de informacoes continua sendo AniList. IDs de animes AniList nao correspondem aos IDs do Tomato, por isso o botao nos detalhes abre a pesquisa pelo titulo, nao inventa um ID.

---

## NOVO: acesso com conta real do Tomato (cliente experimental)

A versao anterior consultava o catalogo sem sessao e falhava com 401/403 ou 500. Esta atualizacao adiciona um fluxo opcional **separado do Firebase**:

1. Inicie com `npm start` e abra `http://localhost:3000` no proprio PC.
2. Abra **Players > Conta Tomato**.
3. Se voce **ja tem uma conta Tomato**, use o e-mail e a senha **dessa conta**. Nao digite senha do Google.
4. Se o servidor exigir hCaptcha, abra **Verificacao humana** e resolva o desafio. O desafio podera ser rejeitado caso o dominio nao esteja autorizado pelo dono do sitekey.
5. Se o Tomato retornar `access_token`, as consultas seguintes levam `Authorization: Bearer` pela ponte Node para o servidor selecionado. Ao expirar, o cliente tenta renovar uma vez com `refresh_token`.
6. **Sair do Tomato** apaga os tokens da memoria do site; recarregar a pagina tambem apaga. Nenhuma senha ou token Tomato vai para `localStorage`, `sessionStorage` ou logs da aplicacao.

### Limites reais e seguranca

- Isso nao cria conta, nao usa o login Google do Firebase para entrar no Tomato e nao contorna bloqueios. Usuario sem conta deve usar uma forma de cadastro aprovada pelo proprio Tomato.
- O proxy Node so aceita os dois destinos configurados e as rotas autorizadas de login, renovacao, catalogo, temporadas e episodio, com validacao de origem. Nao e proxy geral nem servidor de videos.
- **Se o Tomato continuar devolvendo HTTP 500/HTML, a falha pode ser do servico externo ou do contrato da API. Nao ha uma correcao garantida do lado web.** Respostas 403 podem indicar conta invalida, CAPTCHA ou permissao insuficiente.
- No GitHub Pages o Node nao roda. O login ali pode falhar devido a CORS. Hospede o backend Node em uma origem HTTPS sua e de confianca para disponibilizar a autenticacao remotamente.
- Nao digite senhas ao acessar o Node pelo IP local `http://192.168.x.x` no iPhone. O projeto impede a submissao da senha em HTTP fora de `localhost`/`127.0.0.1`; para outro aparelho, configure HTTPS.
- Os endpoints foram obtidos do cliente anterior, nao de documentacao oficial verificada. **Nenhuma autenticacao ou reproducao real foi comprovada junto aos servidores Tomato.**

### Diagnostico

- **HTTP 500 em HTML**: falha externa ou protocolo nao suportado; verifique o servico oficial.
- **401/403**: credenciais, CAPTCHA, token expirado ou permissão de acesso.
- **CORS**: abra por `npm start` e use o proxy Node, ou hospede o Node sob seu HTTPS, em vez de apenas GitHub Pages.
- **CAPTCHA recusado**: o proprietario da chave hCaptcha precisa permitir a origem web.
- **Google `invalid_client`**: cliente OAuth Android nao autoriza automaticamente um site web.

Execute `npm test` para os testes locais (respostas remotas simuladas).

## Atualização: diagnóstico de login HTTP 500 (2026-11-01)

**O que foi realmente corrigido:** o `refresh_token` gerado no login é agora um valor aleatório Base64URL com 32 bytes (43 caracteres), igual ao formato da adaptação original. A versão anterior gerava uma sequência hexadecimal de 64 caracteres. Isso corrige uma divergência do cliente, mas **não garante** que o servidor Tomato aceite o login.

**Verifique a saúde dos servidores sem inserir credenciais:** execute `DIAGNOSTICO.bat` ou `npm run diagnostico`. Essa ferramenta utiliza apenas DNS e uma chamada GET não autenticada à rota `/v2/anime/recents`, nos dois domínios já configurados. Não solicita nem envia e-mail, senha, CAPTCHA, refresh token ou Bearer. **403 com JSON** nesta consulta pode significar API acessível com autenticação exigida. **500 com HTML** significa falha da requisição no lado remoto; a causa exata depende dos registros do operador.

**Como interpretar:** se o aplicativo Android oficial conseguir entrar na mesma conta, enquanto este site falha com 500, o cadastro não é a causa mais provável. A integração web pode depender de configuração, cabeçalhos nativos, autorização da origem, protocolo ou versão diferente da API. Não tente resolver isso reproduzindo credenciais de outro dispositivo, burlando verificação, inventando tokens ou afirmando que a conta entrou. A correção completa depende de documentação da autenticação web ou de suporte do proprietário da API.

**Segurança:** o diagnóstico não usa credenciais. Faça login apenas em `http://localhost:3000` no próprio computador ou em HTTPS de domínio confiável; jamais publique senhas no repositório, screenshots, console ou mensagens de suporte. O proxy local continua não armazenando a senha, mas encaminha a tentativa de login aos servidores configurados.

### Rodar localmente

1. `npm start` (ou `INICIAR.bat`) para abrir o site em `http://localhost:3000`.
2. `npm run diagnostico` (ou `DIAGNOSTICO.bat`) em outra janela para ver o status HTTP dos dois servidores, sem login.
3. Teste se a conta entra no app oficial sem o site. Se entrar lá, mas não neste cliente, não é prova de senha errada: existe incompatibilidade ou recusa da integração.

Os testes automatizados simulam respostas HTTP e validam código local. **Não foi confirmado login real ou acesso aos vídeos**.
