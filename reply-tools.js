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
