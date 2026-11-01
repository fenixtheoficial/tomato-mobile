// Public hCaptcha sitekey extracted from TomatoSignUp.humanTest. Validation
// belongs to the Tomato server; this client never solves or bypasses challenges.
export const CAPTCHA_SITEKEY='d0706611-1d89-4b8c-af79-3caf0f14feba';
let loading;
function sdk(){
 if(window.hcaptcha?.render)return Promise.resolve(window.hcaptcha);
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://js.hcaptcha.com/1/api.js?render=explicit';script.async=true;
  let poll;
  const fail=()=>{clearTimeout(timer);clearInterval(poll);script.remove();loading=null;reject(new Error('Não foi possível carregar a verificação. Confira sua conexão ou bloqueadores de conteúdo.'))};
  const timer=setTimeout(fail,15000);script.onerror=fail;
  script.onload=()=>{poll=setInterval(()=>{if(window.hcaptcha?.render){clearInterval(poll);clearTimeout(timer);resolve(window.hcaptcha)}},100)};
  document.head.append(script);
 });return loading;
}
export function captchaWidget(container,status){
 let widget=null,service=null,token='',version=0;
 const clear=()=>{version++;token='';if(widget!==null&&service)try{service.remove(widget)}catch{}widget=null;container.replaceChildren()};
 return {
  async load(){const v=++version;status('Carregando verificação do Tomato…');try{service=await sdk();if(v!==version)return;
   widget=service.render(container,{sitekey:CAPTCHA_SITEKEY,theme:'dark',size:container.clientWidth<310?'compact':'normal',callback:value=>{if(v===version){token=value;status('Verificação concluída. Agora envie o formulário.')}},'expired-callback':()=>{if(v===version){token='';status('A verificação expirou. Resolva novamente.')}},'error-callback':()=>{if(v===version){token='';status('A verificação não pôde ser concluída. Se este domínio não for aceito, o responsável pelo hCaptcha do Tomato precisa autorizá-lo.')}}});
   status('Resolva a verificação, caso seja exigida pelo Tomato.');
  }catch(e){if(v===version)status(e.message);throw e}},
  getToken:()=>token,
  isLoaded:()=>widget!==null,
  reset(){token='';if(widget!==null&&service)try{service.reset(widget)}catch{}},
  clear
 };
}
