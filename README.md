# Tomato Mobile · Edição Web Independente

Este projeto funciona no **GitHub Pages ou Node.js local**, sem senhas, conta Tomato, CAPTCHA ou proxy. É uma alternativa estática para pesquisa de **informações sobre animes**. Não reproduz nem desbloqueia vídeos do Tomato.

## O que funciona
- Busca por título de anime, páginas de resultados, novidades em alta, sinopses e capas a partir da API pública [AniList](https://docs.anilist.co/guide/graphql/).
- Página de detalhes, lista de favoritos e nome de perfil armazenados somente no navegador (localStorage).
- Links externos para onde assistir quando informados pelo AniList.
- Layout responsivo para Safari no iPhone, Android e PC.
- Erros da API pública tratados sem pedir nenhuma senha.

## O que **não** faz
- **Não** cria uma conta no Tomato nem sincroniza com sua conta original.
- **Não** transmite episódios, baixa vídeos ou contorna autenticação do Tomato.
- **Não** garante disponibilidade do AniList, de links externos, da dublagem ou de episódios na sua região.
- **Não** armazena senhas nem faz requisições a servidores do Tomato.

## Hospedar no GitHub Pages
1. Crie um repositório público no GitHub.
2. Envie todos os arquivos **da pasta do projeto** diretamente para a raiz do repositório. O `index.html` precisa ficar na raiz.
3. Em `Settings → Pages`, escolha `Deploy from a branch`, selecione `main` e `/(root)` e salve.
4. Abra `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`.
5. Quando atualizar os arquivos, feche a guia e faça atualização forçada para descarregar cache antigo.

## Rodar localmente pelo Node.js
No Windows, clique em `INICIAR.bat` ou abra o terminal nesta pasta e rode `npm start` / `node .`. Abra `http://localhost:3000`. Não requer `npm install` nem dependências externas. O Node serve arquivos estáticos; não faz proxy nem cadastro do Tomato.

## Testes
`node --test tests/*.test.mjs`

## API
A API pública do AniList (GraphQL) recebe apenas pesquisas por títulos/IDs. Dados são públicos. Quando a API estiver indisponível, favoritos e perfil salvos continuam acessíveis.
