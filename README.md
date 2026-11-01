# Tomato Mobile Web

> **Projeto comunitário, experimental e não oficial.** Uma tentativa de levar a experiência de um aplicativo Android de animes para o navegador, com foco em dispositivos móveis e no Safari do iPhone.
>
> **Status:** desenvolvimento aberto. O funcionamento completo do catálogo, da autenticação do serviço original e da reprodução **não foi confirmado**. Este repositório está público para quem quiser estudar os problemas, contribuir e dar continuidade ao trabalho.

## Como tudo começou

O projeto nasceu de uma ideia simples: **e se fosse possível usar no navegador uma experiência parecida com a do aplicativo Android Tomato, sem depender de instalar o APK?**

A primeira proposta era adaptar a interface e as funções do aplicativo para um site leve, acessível pelo celular e hospedável em um computador pessoal. Com o tempo, o objetivo cresceu: pesquisa de animes, temporadas e episódios, diferentes qualidades de vídeo, favoritos, perfis e login.

O que parecia uma migração de interface virou um desafio de engenharia reversa, compatibilidade entre Android e Web, autenticação, APIs e distribuição de conteúdo.

## Histórico do desenvolvimento

### 1. Do APK ao protótipo web

A investigação começou pela estrutura dos APKs do Tomato, em busca de rotas, domínios e pistas sobre o catálogo e os episódios. A interface foi recriada em HTML, CSS e JavaScript, com atenção à navegação mobile.

O primeiro obstáculo foi básico, mas importante: os arquivos estáticos não tinham um ponto de entrada adequado para `node .`. Foi então criado um servidor Node.js para servir o projeto pelo `localhost`, com scripts de inicialização no Windows e, em versões posteriores, tentativa automática de outra porta quando a `3000` estivesse ocupada.

### 2. Cadastro, CAPTCHA e login

Foram experimentados fluxos de cadastro e autenticação da API do Tomato. A interface recebeu correções de sobreposição do hCaptcha, validação de formulários e tratamento de respostas inesperadas.

As tentativas de login e cadastro frequentemente recebiam **HTTP 500 com HTML em vez de JSON**, mesmo após a verificação humana. Um servidor proxy local foi criado para organizar requisições, restringir os destinos e permitir diagnósticos mais claros. Isso melhorou a investigação, **mas não solucionou a falha remota**.

Também foi desenvolvido um login Google independente, usando Firebase Authentication. Foi necessário abandonar a ideia de reutilizar um cliente OAuth Android no navegador, pois surgiram erros como `401: invalid_client` e origem não registrada. **O login Firebase autentica o usuário neste site; não equivale a uma sessão válida da API do Tomato.**

### 3. Investigação das APIs

Durante os testes, foram identificadas referências a rotas como:

- `/v2/content/search`
- `/v2/anime/recents`
- `/v3/animes/`
- `/v3/seasons/`
- Rotas relacionadas a episódios e reprodução

As consultas aos domínios `prod-api.tomatoanimes.com` e `edge.betomato.com` retornaram HTTP 500 nos diagnósticos realizados. Isso **não prova que o serviço inteiro esteja indisponível**: o aplicativo Android continuava funcionando. A hipótese é que o cliente web não reproduza corretamente o protocolo, o fluxo de sessão ou as condições exigidas pela versão atual do aplicativo. **A causa exata permanece não confirmada.**

### 4. Descoberta de tráfego de vídeo

Para entender a reprodução, foram analisadas capturas de conexões do aplicativo feitas com o PCAPdroid.

Entre os domínios observados estavam:

| Domínio | Papel investigado |
| --- | --- |
| `prod-api.tomatoanimes.com` | API e metadados |
| `edge.betomato.com` | API alternativa |
| `cdn.tomatoanimes.com` | Arquivos estáticos/CDN |
| `mario.hachost.cloud` | Possível entrega de vídeo |
| `luigi.hachost.cloud` | Possível entrega de vídeo |

Uma conexão com `mario.hachost.cloud` registrou aproximadamente **32 MB recebidos em 13 segundos** durante um teste de reprodução. Outra captura indicou aproximadamente **42 MB recebidos de `luigi.hachost.cloud`**. Esses volumes são fortes indícios de transferência de mídia, **mas não revelam os caminhos completos dos episódios**.

Tentou-se consultar um desses hosts usando uma rota de pesquisa da API. O resultado foi **HTTP 405**, reforçando que servidores de arquivos e servidores de catálogo não podem ser tratados como intercambiáveis.

### 5. Organização do protótipo

Ao longo das iterações, foram criados ou experimentados:

- Interface responsiva com busca, navegação e favoritos locais.
- Servidor Node.js e scripts de execução no Windows.
- Diagnósticos de HTTP, respostas JSON/HTML e falhas de conectividade.
- Separação conceitual entre catálogo, autenticação e entrega de mídia.
- Login Google/Firebase opcional e sessão persistente para o perfil local.
- Reprodução experimental de URLs completas MP4/HLS, quando disponíveis e autorizadas.

**Atenção:** esses recursos foram desenvolvidos em diferentes protótipos. A presença de cada um depende da versão do código publicada neste repositório. Testes automatizados de componentes não substituem a comprovação de autenticação e streaming reais.

## O que ainda falta resolver

O maior desafio não é o visual: é **obter, de maneira compatível e autorizada, as informações de episódio e as URLs de reprodução**.

Questões abertas para futuros contribuidores:

1. Confirmar quais endpoints e formatos de requisição são atualmente aceitos pelo serviço de origem.
2. Diferenciar problemas no proxy local de respostas de erro dos servidores externos.
3. Documentar, sem divulgar credenciais, o processo legítimo de autenticação e renovação de sessão.
4. Identificar como o aplicativo recebe URLs temporárias de mídia e quais restrições de navegador se aplicam.
5. Melhorar a estrutura do código, os testes, a experiência no iPhone e as mensagens de diagnóstico.
6. Substituir integrações experimentais por alternativas documentadas e autorizadas quando necessário.

**Não há, até o momento, confirmação de um fluxo completo e estável de pesquisa → episódio → reprodução usando os serviços originais no navegador.**

## Executando localmente

Em uma versão do repositório que inclua `package.json` e o servidor Node.js:

```bash
npm start
```

Abra o endereço `localhost` e a porta exibida no terminal. Algumas versões também incluem `INICIAR.bat` para Windows.

> Se a porta `3000` já estiver em uso, encerre a instância antiga ou utilize a porta indicada pelo servidor. O GitHub Pages serve arquivos estáticos e **não executa um backend Node.js**.

Consulte os arquivos presentes na versão do repositório antes de seguir instruções específicas de instalação ou configurar Firebase.

## Como contribuir

Este projeto foi tornado público justamente para que outras pessoas possam continuar de onde paramos. **Issues, correções, documentação, testes reproduzíveis e pull requests são bem-vindos.**

Ao enviar uma contribuição, descreva:

- Qual problema foi observado e como reproduzi-lo.
- O comportamento esperado e o comportamento obtido.
- Qual ambiente foi utilizado (Windows, Android, iPhone, navegador e versão do Node.js).
- Quais verificações foram realizadas, sem incluir dados pessoais ou tokens.

Evite enviar arquivos com senhas, cookies, tokens de acesso, chaves privadas ou capturas de tráfego contendo dados sensíveis. Respeite os termos dos serviços de terceiros e as permissões de acesso a conteúdos; não contorne CAPTCHA, DRM ou controles de autenticação.

## Aviso

Este repositório **não é afiliado nem endossado pela equipe do Tomato**. As marcas e os conteúdos citados pertencem a seus respectivos titulares. O projeto tem caráter experimental e educacional; a publicação do código não concede direitos sobre vídeos, APIs ou infraestrutura de terceiros.

---

**Se você chegou até aqui para continuar o projeto, seja bem-vindo.** A interface foi só o começo; a parte difícil, e mais interessante, ainda está aberta.
