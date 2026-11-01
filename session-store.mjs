// Persistent refresh credential, scoped to this website. Access tokens and
// passwords are never written. IndexedDB is kept out of the source/download.
export function browserSessionStore(indexedDB=globalThis.indexedDB){
 let opening;
 const open=()=>opening||(opening=new Promise((resolve,reject)=>{
  if(!indexedDB){reject(new Error('Armazenamento de sessão indisponível.'));return}
  const req=indexedDB.open('tomato-login',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('session');
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();opening=null};resolve(db)};
  req.onerror=()=>{opening=null;reject(new Error('Não foi possível abrir o armazenamento de login.'))};
  req.onblocked=()=>{opening=null;reject(new Error('Feche as outras abas do Tomato e tente novamente.'))};
 }));
 async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction('session',mode);let result;
  const request=action(tx.objectStore('session'));
  request.onsuccess=()=>result=request.result;
  tx.oncomplete=()=>resolve(result??null);
  tx.onerror=tx.onabort=()=>reject(new Error('O navegador não permitiu salvar ou ler o login.'));
 })}
 return {load:()=>transaction('readonly',s=>s.get('current')),save:record=>transaction('readwrite',s=>s.put(record,'current')),clear:()=>transaction('readwrite',s=>s.delete('current'))};
}
