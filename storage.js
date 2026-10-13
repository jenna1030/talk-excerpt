'use strict';
// Autosave also goes to IndexedDB: localStorage holds only ~5MB, which photo messages fill quickly.
// Every save carries a timestamp, so the newest copy wins when the page opens.
let autosaveDb=null;
function openAutosave(){
 return autosaveDb||(autosaveDb=new Promise((resolve,reject)=>{
   const request=indexedDB.open('talk-excerpt',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('autosave');
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 }));
}
function autosaveTx(mode,run){
 return openAutosave().then(db=>new Promise((resolve,reject)=>{
   const tx=db.transaction('autosave',mode),request=run(tx.objectStore('autosave'));
   tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error);
 }));
}
function persistLarge(json,at,storedSmall){
 autosaveTx('readwrite',store=>store.put({savedAt:at,json},'current'))
   .catch(()=>{if(!storedSmall)notice('자동 저장에 실패했습니다. 프로젝트 저장 버튼으로 파일을 보관하세요.');});
}
autosaveTx('readonly',store=>store.get('current')).then(saved=>{
 // First run after this update: copy the localStorage project over.
 if(!saved){if(savedAt)persistLarge(JSON.stringify(state),savedAt,true);return;}
 // Edits made while this was loading, or a newer localStorage copy, win.
 if(saved.savedAt<=savedAt)return;
 try{state=validate(JSON.parse(saved.json));}catch{return notice('브라우저 자동 저장을 불러오지 못했습니다. 프로젝트 파일로 복원할 수 있어요.');}
 savedAt=saved.savedAt;activePerson=state.people[0]?.id||null;selected.clear();render();
 if(initialNotice)notice('');
},()=>{});
