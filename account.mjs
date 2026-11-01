import {secret,request} from './core.mjs';
export const DEVICE_MODEL='Tomato Mobile Web';
export function createProfile(name){
 name=String(name||'').trim();
 if(name.length<1||name.length>32)throw new Error('Use um nome de 1 a 32 caracteres para seu perfil.');
 return {id:typeof crypto.randomUUID==='function'?crypto.randomUUID():secret(),name,createdAt:new Date().toISOString()};
}
export function readProfile(storage){
 try{const p=JSON.parse(storage.getItem('tomato-profile'));return p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=32?{id:p.id,name:p.name,createdAt:p.createdAt}:null}catch{return null}
}
export function writeProfile(storage,profile){
 // Only these public local-profile fields can be persisted. No password,
 // email, Google credential or Tomato session is stored here.
 storage.setItem('tomato-profile',JSON.stringify({id:profile.id,name:profile.name,createdAt:profile.createdAt}));
}
export function registrationBody(input,refreshToken=secret()){
 const username=String(input.username||'').trim(),email=String(input.email||'').trim(),password=input.password;
 if(input.consent!==true)throw new Error('Confirme que quer criar uma conta real no Tomato.');
 const letters=username.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,'').trim();
 if(username.length<3||username.length>24||letters.length<3)throw new Error('Use um usuário de 3 a 24 caracteres, com pelo menos 3 letras ou números.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe um e-mail válido.');
 if(typeof password!=='string'||password.length<6||password.length>127)throw new Error('A senha precisa ter entre 6 e 127 caracteres.');
 if(password!==input.confirm)throw new Error('As duas senhas precisam ser iguais.');
 if(typeof input.verification!=='string'||!input.verification.trim())throw new Error('Resolva o hCaptcha antes de enviar o cadastro.');
 return {username,email,password,verification:input.verification||'',fingerprint:'Web/Tomato-Mobile',refresh_token:refreshToken,device_model:DEVICE_MODEL};
}
export function requireSession(result,refreshToken=null){
 if(typeof result?.access_token!=='string'||!result.access_token.trim())throw new Error('O Tomato não retornou uma sessão válida. Verifique seu e-mail e tente entrar; o cadastro pode exigir confirmação.');
 return {token:result.access_token,refreshToken:typeof result.refresh_token==='string'&&result.refresh_token?result.refresh_token:refreshToken,sessionId:typeof result.session_id==='string'?result.session_id:null};
}
export async function authenticate(host,mode,input,{signal,refreshToken=secret()}={}){
 if(!['login','register'].includes(mode))throw new Error('Operação de conta inválida.');
 const body=mode==='register'?registrationBody(input,refreshToken):{email:input.email.trim(),password:input.password,verification:input.verification||'',fingerprint:'Web/Tomato-Mobile',refresh_token:refreshToken,device_model:DEVICE_MODEL};
 const result=await request(host,'/v3/auth/'+mode,{body,signal});
 return {session:requireSession(result,refreshToken),account:result.account||null};
}
export function authError(error,mode){
 const code=String(error.code||'')+' '+error.message;
 if(error.code==='non_json_upstream'){
  const http=Number(error.upstream_status)||null;
  const host=error.upstream_host==='alternativo'?'alternativo':'principal';
  const detail=http>=500?`O servidor ${host} do Tomato falhou (HTTP ${http}) e não devolveu JSON. Não é possível corrigir esse erro interno alterando o site.`:
    http===403||http===401?`O Tomato recusou a requisição (HTTP ${http}). Confira a verificação humana e a autorização de acesso.`:
    http===404?'O Tomato não encontrou a rota solicitada (HTTP 404). A integração pode estar desatualizada.':
    `O Tomato respondeu em formato inesperado${http?` (HTTP ${http})`:''}.`;
  return detail+' Use “Testar conexão com a API” para identificar o serviço com problema.'+(mode==='register'?' Não envie outro cadastro até conferir se a conta já existe.':'');
 }
 if(error.code==='upstream_unreachable'||error.code==='upstream_timeout')return `${error.message} Use “Testar conexão com a API”.${mode==='register'?' Confira se o cadastro já foi recebido antes de tentar novamente.':''}`;
 if(error.status===429)return 'O Tomato limitou as tentativas. Aguarde antes de tentar novamente.';
 if(/captcha|verification|human_test/i.test(code))return 'O Tomato exige verificação humana. Carregue a verificação abaixo, resolva o desafio e envie novamente.';
 if(/already|exists|in.use|já.*(uso|cadastr)/i.test(code)&&mode==='register')return 'Este e-mail ou usuário já está cadastrado. Use Entrar ou a recuperação de senha.';
 if(error.name==='TimeoutError'||!error.status&&/conectar|rede|CORS|network|fetch|timeout|demorou/i.test(code))return mode==='register'?'Não foi possível confirmar o cadastro. Confira seu e-mail e tente entrar antes de repetir; o servidor pode ter recebido o pedido.':error.message;
 return error.message||'Não foi possível concluir esta operação.';
}
