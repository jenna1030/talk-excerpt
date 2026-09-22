'use strict';
const presetStorageKey='talk-excerpt-people-presets-v1';
let pendingPreset=null;
function validatePeoplePreset(value){
 if(!value||value.type!=='talk-excerpt-people-preset'||value.version!==1||typeof value.name!=='string'||!Array.isArray(value.people))throw Error('인물 프리셋 JSON 파일이 아닙니다.');
 const ids=new Set();
 const people=value.people.map(p=>{
   if(!p||typeof p.id!=='string'||!/^t[a-zA-Z0-9-]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||!['left','right'].includes(p.side)||typeof p.photo!=='string'||(p.photo&&!safeImage(p.photo))||['nick','text','bubble'].some(k=>typeof p[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(p[k])))throw Error('프리셋의 인물 정보가 올바르지 않습니다.');
   ids.add(p.id);return {id:p.id,name:p.name,side:p.side,photo:p.photo,nick:p.nick,text:p.text,bubble:p.bubble};
 });
 return {type:value.type,version:1,name:value.name,people};
}
function currentPeoplePreset(){return validatePeoplePreset({type:'talk-excerpt-people-preset',version:1,name:$('preset-name').value.trim()||'인물 프리셋',people:state.people});}
function readPresetLibrary(){const raw=localStorage.getItem(presetStorageKey);if(!raw)return [];const library=JSON.parse(raw);if(!Array.isArray(library))throw Error('저장된 프리셋 목록을 읽지 못했습니다.');return library.map(validatePeoplePreset);}
function showPresetLibrary(){
 try{const library=readPresetLibrary();$('preset-saved').innerHTML=library.map((p,i)=>`<option value="${i}">${esc(p.name)} · ${p.people.length}명</option>`).join('');$('preset-load-saved').disabled=!library.length;}
 catch(error){$('preset-saved').innerHTML='';$('preset-load-saved').disabled=true;$('preset-status').textContent=error.message;}
}
function preparePeoplePreset(raw){
 const preset=validatePeoplePreset(raw);pendingPreset=preset;
 const used=state.people.filter(p=>messages().some(m=>m.person===p.id));
 const mappings=used.map(p=>{
   let match=preset.people.findIndex(n=>n.id===p.id);
   if(match<0){const matches=preset.people.map((n,j)=>n.name===p.name?j:-1).filter(j=>j>=0);match=matches.length===1?matches[0]:-1;}
   return `<section class="preset-mapping"><label>${esc(p.name)}의 대화를 누구에게 연결할까요?<select data-preset-map="${p.id}"><option value="">연결 방식 선택</option><optgroup label="프리셋 인물">${preset.people.map((n,j)=>`<option value="${j}" ${j===match?'selected':''}>${esc(n.name)} (${n.side==='left'?'왼쪽':'오른쪽'})</option>`).join('')}</optgroup><option value="keep">기존 인물 유지 — ${esc(p.name)}</option><option value="new">새 인물 추가</option></select></label><div id="preset-new-${p.id}" hidden><label>새 인물 이름<input data-preset-name="${p.id}" maxlength="150" placeholder="새 인물 이름을 입력하세요"></label><p class="hint">프사 없이 기본 색상·왼쪽 배치로 만듭니다. 적용 후 인물 설정에서 바꿀 수 있어요.</p></div></section>`;
 }).join('');
 $('preset-replace').innerHTML=`<h3>${esc(preset.name)} · ${preset.people.length}명</h3><p class="preset-warning">현재 인물 목록이 프리셋으로 교체됩니다. ‘기존 인물 유지’를 선택한 인물만 기존 설정이 유지되며, 나머지 기존 인물은 삭제됩니다. 대화 내용은 유지됩니다. 필요한 설정은 먼저 저장하거나 내보내세요.</p><p class="hint">프리셋 인물로 연결하거나, 기존 인물을 유지하거나, 새 인물을 만들 수 있습니다. 같은 ID 또는 이름이 하나 일치하면 프리셋 인물이 자동 선택됩니다. 자동 선택 결과도 확인하세요.</p>${preset.people.length?`<p class="hint">불러올 인물: ${preset.people.map(p=>esc(p.name)).join(', ')}</p>`:'<p class="hint">빈 프리셋입니다. 기존 대화가 있으면 인물을 유지하거나 새로 만들어 연결하세요.</p>'}${mappings}<label><input id="preset-ack" type="checkbox" style="width:auto"> 유지하지 않은 기존 인물이 삭제되고 인물 목록이 교체되는 것을 확인했습니다.</label><button id="preset-apply" class="primary">선택한 연결로 프리셋 적용</button>`;
}
$('preset-replace').onchange=e=>{
 const id=e.target.dataset.presetMap;if(!id)return;
 const section=$('preset-new-'+id);section.hidden=e.target.value!=='new';
 if(!section.hidden)section.querySelector('input').focus();
};
$('people-presets').onclick=()=>{pendingPreset=null;$('preset-replace').innerHTML='';$('preset-status').textContent='';showPresetLibrary();$('preset-dialog').showModal();};
$('preset-save').onclick=()=>{try{const preset=currentPeoplePreset();const library=readPresetLibrary();library.push(preset);localStorage.setItem(presetStorageKey,JSON.stringify(library));showPresetLibrary();$('preset-saved').value=String(library.length-1);$('preset-status').textContent='현재 인물 설정을 이 브라우저에 저장했습니다. 다른 기기에서는 JSON 파일을 사용하세요.';}catch(error){$('preset-status').textContent='저장하지 못했습니다. '+error.message+' 파일 내보내기를 이용하세요.';}};
$('preset-export').onclick=()=>{try{const preset=currentPeoplePreset();download('talk-excerpt-people-preset.json',JSON.stringify(preset,null,2),'application/json');$('preset-status').textContent='인물 프리셋 파일을 내보냈습니다. 대화 내용은 포함하지 않습니다.';}catch(error){$('preset-status').textContent=error.message;}};
$('preset-load-saved').onclick=()=>{try{preparePeoplePreset(readPresetLibrary()[Number($('preset-saved').value)]);}catch(error){$('preset-status').textContent=error.message;}};
$('preset-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;pendingPreset=null;$('preset-replace').innerHTML='';try{if(file.size>20*1024*1024)throw Error('20MB 이하의 프리셋 파일을 선택하세요.');preparePeoplePreset(JSON.parse(await file.text()));$('preset-status').textContent='파일을 읽었습니다. 아래 안내와 인물 연결을 확인한 뒤 적용하세요.';}catch(error){$('preset-status').textContent='불러오지 못했습니다. '+error.message;}finally{e.target.value='';}};
$('preset-replace').onclick=e=>{
 if(e.target.id!=='preset-apply'||!pendingPreset)return;
 if(!$('preset-ack').checked)return alert('기존 인물 설정이 대체된다는 안내를 확인해주세요.');
 const mapping=new Map();
 const replacements=pendingPreset.people.map(p=>({...p,id:uid()}));
 for(const p of state.people.filter(p=>messages().some(m=>m.person===p.id))){
   const value=document.querySelector(`[data-preset-map="${p.id}"]`).value;
   if(value==='keep'){
     mapping.set(p.id,replacements.length);replacements.push({...p});
   }else if(value==='new'){
     const name=document.querySelector(`[data-preset-name="${p.id}"]`).value.trim();
     if(!name)return alert(p.name+'의 대화에 연결할 새 인물 이름을 입력해주세요.');
     mapping.set(p.id,replacements.length);
     replacements.push({id:uid(),name,side:'left',photo:'',nick:'#54725b',text:'#34423c',bubble:'#ffffff'});
   }else{
     if(!/^\d+$/.test(value)||!pendingPreset.people[Number(value)])return alert('모든 대화 작성자의 연결 방식을 선택해주세요.');
     mapping.set(p.id,Number(value));
   }
 }
 checkpoint();for(const m of messages())m.person=replacements[mapping.get(m.person)].id;
 state.people=replacements;activePerson=state.people[0]?.id||null;selected.clear();$('person-search').value='';
 // A prior TXT analysis may still reference people that have just been replaced.
 if(typeof resetKakaoAnalysis==='function')resetKakaoAnalysis();
 commit();$('preset-dialog').close();pendingPreset=null;notice('선택한 연결 방식으로 인물 프리셋을 적용했습니다. 실행 취소로 되돌릴 수 있어요.');
};
