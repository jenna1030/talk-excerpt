'use strict';
let parsedKakao=null;
function resetKakaoAnalysis(){parsedKakao=null;$('kakao-analysis').innerHTML='';$('kakao-apply').disabled=true;}
$('paste-kakao').onclick=()=>{$('kakao-dialog').showModal();$('kakao-source').focus();};
$('kakao-source').oninput=resetKakaoAnalysis;
$('kakao-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const bytes=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('euc-kr',{fatal:true}).decode(bytes);}$('kakao-source').value=text;resetKakaoAnalysis();analyzeKakao();}catch{alert('텍스트를 읽지 못했습니다. TXT 내용을 직접 복사해 붙여 넣어주세요.');}finally{e.target.value='';}};
function analyzeKakao(){
 parsedKakao=parseKakaoText($('kakao-source').value);const p=parsedKakao;
 $('kakao-analysis').innerHTML=`<p><b>인물 ${p.names.length}명 · 대화 ${p.messages.length}개</b></p>${p.warnings.map(w=>`<p class="hint">${esc(w)}</p>`).join('')}${p.skipped.length?`<details><summary>인식하지 못한 줄 확인</summary><pre style="white-space:pre-wrap">${p.skipped.map(l=>`${l.line}행: ${esc(l.text)}`).join('\n')}</pre></details><label><input type="checkbox" id="kakao-skip-ok" style="width:auto"> 위 줄을 제외하고 가져오는 것에 동의합니다</label>`:''}${p.names.map((name,i)=>{const matches=state.people.filter(x=>x.name===name);return `<label>${esc(name)} 연결<select data-kakao-person="${i}"><option value="new">새 인물로 추가</option>${state.people.map(person=>`<option value="${person.id}" ${matches.length===1&&person.id===matches[0].id?'selected':''}>${esc(person.name)} (${person.side==='left'?'왼쪽':'오른쪽'})</option>`).join('')}</select></label>`;}).join('')}<label>새로 추가할 인물 중 오른쪽에 놓을 사람<select id="kakao-right"><option value="">모두 왼쪽</option>${p.names.map((n,i)=>`<option value="${i}">${esc(n)}</option>`).join('')}</select></label><p class="hint">기존 인물에 연결하면 그 인물의 프사·색상·좌우 설정을 유지합니다. 사진·이모티콘·파일은 TXT의 문구로 남습니다. 답장 관계는 자동 복원되지 않습니다.</p>${p.messages.length?'<p><b>가져오기 미리보기 (처음 5개)</b></p>':''}${p.messages.slice(0,5).map(m=>`<article class="message-row"><small>${esc(m.date)} ${esc(m.time)} · ${esc(m.name)}</small><p>${esc(m.text)}</p></article>`).join('')}`;
 $('kakao-apply').disabled=!p.messages.length;
}
$('kakao-analyze').onclick=analyzeKakao;
$('kakao-apply').onclick=()=>{
 if(!parsedKakao?.messages.length)return;
 if(parsedKakao.skipped.length&&!$('kakao-skip-ok').checked)return alert('인식하지 못한 줄을 확인하고 제외 여부를 선택하세요.');
 const replace=$('kakao-mode').value==='replace';
 if(replace&&messages().length&&!confirm('기존 대화를 모두 교체할까요? 인물 설정은 유지됩니다. 실행 취소로 되돌릴 수 있습니다.'))return;
 checkpoint();const mapping=new Map();
 parsedKakao.names.forEach((name,i)=>{const choice=document.querySelector(`[data-kakao-person="${i}"]`).value;if(choice!=='new'){mapping.set(name,choice);return;}const right=$('kakao-right').value===String(i);const p={id:uid(),name,side:right?'right':'left',photo:'',nick:'#54725b',text:'#34423c',bubble:right?'#e1ebcf':'#ffffff'};state.people.push(p);mapping.set(name,p.id);});
 const imported=parsedKakao.messages.map(m=>({...makeMessage(mapping.get(m.name),m.text),time:m.time,date:m.date}));
 if(replace)state.blocks=imported;else state.blocks.push(...imported);
 selected.clear();activePerson=mapping.values().next().value;commit();$('kakao-dialog').close();notice(`${imported.length}개 대화를 ${replace?'교체':'추가'}했습니다. 실행 취소로 되돌릴 수 있어요.`);
 $('kakao-source').value='';resetKakaoAnalysis();
};
