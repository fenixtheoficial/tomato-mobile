'use strict';
/** Diagnostico somente leitura. Nao pede, armazena nem envia credenciais. */
const dns = require('node:dns').promises;
const {URL} = require('node:url');
const HOSTS = Object.freeze([
  'https://prod-api.tomatoanimes.com',
  'https://edge.betomato.com'
]);
const PATH = '/v2/anime/recents';

async function check(origin, {fetcher=fetch, resolver=dns.lookup}={}) {
  const u = new URL(origin);
  if (!HOSTS.includes(origin)) throw new Error('Endereco nao permitido');
  const output = {server: u.hostname, dns: 'nao confirmado', http: 'nao testado', type: '-', interpretation: ''};
  try {
    const addr = await resolver(u.hostname);
    output.dns = addr?.address ? 'resolvido' : 'sem endereco';
  } catch (e) {
    output.dns = 'falha ('+(e?.code||'DNS')+')';
    output.interpretation = 'Falha de DNS; nao foi possivel testar a API.';
    return output;
  }
  const ac = new AbortController();
  const timeout = setTimeout(()=>ac.abort(), 12000);
  try {
    const response = await fetcher(origin+PATH, {
      method: 'GET', headers: {Accept:'application/json'},
      cache: 'no-store', redirect: 'manual', signal:ac.signal
    });
    output.http = String(response.status);
    output.type = (response.headers.get('content-type')||'desconhecido').split(';')[0].slice(0,64);
    if ([401,403].includes(response.status) && output.type.includes('json')) {
      output.interpretation = 'API respondeu JSON de autenticacao: servidor acessivel, mas exige sessao.';
    } else if (response.status>=500) {
      output.interpretation = 'API retornou erro de servidor. Nao comprova que o login esteja incorreto.';
    } else if (response.status===200 && output.type.includes('json')) {
      output.interpretation = 'Consulta publica retornou JSON. A rota de login ainda precisa ser validada.';
    } else if (response.status>=300 && response.status<400) {
      output.interpretation = 'Redirecionamento detectado. Verifique a URL atual da API com o operador.';
    } else if (response.status===404) {
      output.interpretation = 'Rota de teste nao encontrada. Nao permite concluir sobre o login.';
    } else {
      output.interpretation = 'Resposta recebida. O teste nao valida credenciais nem acesso ao catalogo.';
    }
  } catch (e) {
    output.http = ac.signal.aborted?'timeout':'falha de rede';
    output.interpretation = 'Nao foi possivel consultar a API ('+(ac.signal.aborted?'tempo limite':(e?.cause?.code||e?.code||'rede'))+').';
  } finally {clearTimeout(timeout)}
  return output;
}
async function main() {
  console.log('Diagnostico seguro da API Tomato. Sem senha, email, CAPTCHA ou cookies.\n');
  for (const origin of HOSTS) {
    const result=await check(origin);
    console.log('Servidor:', result.server);
    console.log('  DNS:', result.dns, '| HTTP:', result.http, '| Tipo:', result.type);
    console.log('  Resultado:',result.interpretation,'\n');
  }
  console.log('Este teste apenas consulta uma rota publica. HTTP 403 com JSON pode significar API online; nao prova funcionamento do login.');
  console.log('Se o aplicativo Android oficial fizer login e este site nao, a integracao web pode estar incompativel com a autenticacao exigida.');
}
if(require.main===module)main().catch(e=>{console.error('Falha no diagnostico:',e.message);process.exitCode=1});
module.exports = {check, HOSTS, PATH};
