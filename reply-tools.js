'use strict';
// Reply helpers: a dedicated reply dialog that only asks for what a reply needs.
let replySource=null;
const oneLine=text=>String(text||'').replace(/\s+/g,' ').trim();
function quoteCard(name,text,image=''){return `<div class="reply-quote"><b>${esc(name)}에게 답장</b>${image?`<img src="${esc(image)}" alt="">`:''}${oneLine(text)?`<span>${esc(oneLine(text).slice(0,120))}</span>`:''}</div>`;}
function openReply(id){
 if(!state.people.length)return notice('인물을 먼저 추가하거나 카톡 TXT를 가져오세요.');
 const m=messages().find(x=>x.id===id);if(!m)return;
 replySource={kind:'local',id};
 $('reply-quote').innerHTML=quoteCard(person(m.person).name,m.text,safePhoto(m.image||''));
 // Usually the other person answers, so default to someone who is not the original author.
 const other=state.people.find(p=>p.id!==m.person&&p.side!==person(m.person).side)||state.people.find(p=>p.id!==m.person)||person(m.person);
 $('reply-person').innerHTML=state.people.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('reply-person').value=other.id;
 $('reply-text').value='';$('reply-date').value=m.date||'';$('reply-time').value='';$('reply-position').value='after';
 $('reply-dialog').showModal();$('reply-text').focus();
}
$('reply-form').onsubmit=e=>{
 e.preventDefault();if(!replySource)return;
 const text=$('reply-text').value;if(!text.trim())return alert('답장 내용을 입력하세요.');
 const original=replySource.kind==='local'&&locationOf(replySource.id);
 if(replySource.kind==='local'&&!original)return alert('원문을 찾을 수 없습니다. 원문이 삭제되었는지 확인하세요.');
 checkpoint();
 const m={...makeMessage($('reply-person').value,text),date:$('reply-date').value,time:$('reply-time').value,reply:{...replySource}};
 if(original&&$('reply-position').value==='after')original.array.splice(original.index+1,0,m);else state.blocks.push(m);
 $('reply-dialog').close();commit();notice('답장을 넣었습니다. 실행 취소로 되돌릴 수 있어요.');
 document.querySelector(`[data-message-id="${m.id}"]`)?.scrollIntoView({block:'nearest'});
};

// Preview menu: click a bubble to reply to it, or to choose which earlier message it answers.
let pickFor=null;
function hidePreviewMenu(){$('preview-menu').hidden=true;}
function setPick(id){
 pickFor=id;$('pick-banner').hidden=!id;$('preview').classList.toggle('is-picking',!!id);
 const m=id&&messages().find(x=>x.id===id);
 if(m)$('pick-banner').innerHTML=`<span>‘${esc(oneLine(snippet(m)).slice(0,30))}’의 원문이 될 말풍선을 누르세요.</span><button type="button" id="pick-cancel">취소</button>`;
}
$('preview').addEventListener('click',e=>{
 if(e.target.closest('a,summary'))return;
 hidePreviewMenu();
 const row=e.target.closest('.te-row');if(!row)return;
 const id=row.id.replace(/^preview-/,''),m=messages().find(x=>x.id===id);if(!m)return;
 if(pickFor){
   const reply=messages().find(x=>x.id===pickFor);
   if(!reply)return setPick(null);
   if(id===pickFor)return notice('자기 자신은 원문이 될 수 없어요. 다른 말풍선을 누르세요.');
   setPick(null);checkpoint();reply.reply={kind:'local',id};commit();return notice('답장을 연결했습니다. 실행 취소로 되돌릴 수 있어요.');
 }
 const menu=$('preview-menu'),panel=menu.parentElement.getBoundingClientRect();
 menu.innerHTML=[['reply','이 말에 답장 달기'],['pick',m.reply?'이 말의 원문 다시 고르기':'이 말의 원문 고르기'],...(m.reply?[['unlink','답장 연결 해제']]:[]),['edit','수정']].map(([a,n])=>`<button type="button" data-menu="${a}" data-id="${id}">${n}</button>`).join('');
 menu.style.left=Math.max(8,Math.min(e.clientX-panel.left,panel.width-190))+'px';menu.style.top=(e.clientY-panel.top+8)+'px';menu.hidden=false;
});
$('preview-menu').onclick=e=>{
 const b=e.target.closest('[data-menu]');if(!b)return;hidePreviewMenu();
 const {menu:action,id}=b.dataset;
 if(action==='reply')openReply(id);
 if(action==='pick')setPick(id);
 if(action==='edit')openMessage(id);
 if(action==='unlink'){checkpoint();messages().find(x=>x.id===id).reply=null;commit();notice('답장 연결을 해제했습니다.');}
};
$('pick-banner').onclick=e=>{if(e.target.id==='pick-cancel')setPick(null);};
$('preview').addEventListener('scroll',hidePreviewMenu);
document.addEventListener('click',e=>{if(!e.target.closest('#preview-menu,#preview'))hidePreviewMenu();});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;hidePreviewMenu();if(pickFor)setPick(null);});
