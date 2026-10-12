'use strict';
// Reply helpers: a dedicated reply dialog that only asks for what a reply needs.
let replySource=null;
const oneLine=text=>String(text||'').replace(/\s+/g,' ').trim();
function quoteCard(name,text,image=''){return `<div class="reply-quote"><b>${esc(name)}에게 답장</b>${image?`<img src="${esc(image)}" alt="">`:''}${oneLine(text)?`<span>${esc(oneLine(text).slice(0,120))}</span>`:''}</div>`;}
function openReply(id=null){
 if(!state.people.length)return notice('인물을 먼저 추가하거나 카톡 TXT를 가져오세요.');
 const m=id&&messages().find(x=>x.id===id);if(id&&!m)return;
 // Without an id the original lives in another post and arrives as a pasted reply code.
 replySource=m?{kind:'local',id}:null;
 $('reply-title').textContent=m?'답장 달기':'다른 글에 답장';$('reply-code-field').hidden=!!m;$('reply-position-field').hidden=!m;$('reply-code').value='';
 $('reply-quote').innerHTML=m?quoteCard(person(m.person).name,m.text,safePhoto(m.image||'')):'<p class="hint">답장 코드를 붙여 넣으면 원문이 여기에 표시됩니다.</p>';
 // Usually the other person answers, so default to someone who is not the original author.
 const other=m?state.people.find(p=>p.id!==m.person&&p.side!==person(m.person).side)||state.people.find(p=>p.id!==m.person)||person(m.person):person(activePerson)||state.people[0];
 $('reply-person').innerHTML=state.people.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('reply-person').value=other.id;
 $('reply-text').value='';$('reply-date').value=m?.date||'';$('reply-time').value='';$('reply-position').value='after';
 $('reply-dialog').showModal();$(m?'reply-text':'reply-code').focus();
}
$('reply-form').onsubmit=e=>{
 e.preventDefault();if(!replySource)return alert('원본 글에서 복사한 답장 코드를 붙여 넣으세요.');
 const text=$('reply-text').value;if(!text.trim())return alert('답장 내용을 입력하세요.');
 const original=replySource.kind==='local'&&locationOf(replySource.id);
 if(replySource.kind==='local'&&!original)return alert('원문을 찾을 수 없습니다. 원문이 삭제되었는지 확인하세요.');
 checkpoint();
 const m={...makeMessage($('reply-person').value,text),date:$('reply-date').value,time:$('reply-time').value,reply:{...replySource}};
 if(original&&$('reply-position').value==='after')original.array.splice(original.index+1,0,m);else state.blocks.push(m);
 $('reply-dialog').close();commit();notice(m.reply.kind==='external'?(safeUrl(state.url)?'답장을 넣었습니다. 원본 글에 돌아가는 링크를 달려면 이 답장의 ‘돌아가기 코드’를 누르세요.':'답장을 넣었습니다. 원본 글에 돌아가는 링크를 달려면 먼저 이 글의 게시 주소를 입력하세요.'):'답장을 넣었습니다. 실행 취소로 되돌릴 수 있어요.');
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

// Linking two posts: plain-text codes carry the link, author, quote and original id between projects.
const REPLY_CODE='[톡갈피 답장 코드]',BACK_CODE='[톡갈피 돌아가기 코드]';
const codeLines=text=>String(text).trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
function messageLink(id){const u=new URL(state.url);u.hash=targetId(id);return u.href;}
function needPostUrl(){if(safeUrl(state.url))return true;alert('이 글의 게시 주소를 먼저 입력하세요. 코드에 이 글로 가는 링크가 들어갑니다.');$('post-url').focus();return false;}
function showCode(title,help,code){
 $('code-title').textContent=title;$('code-help').textContent=help;$('code-output').value=code;$('code-copy').textContent='복사';
 $('code-dialog').showModal();$('code-output').select();
 copy(code).then(ok=>{if(ok)$('code-copy').textContent='복사 완료';});
}
$('code-copy').onclick=async()=>{if(await copy($('code-output').value))$('code-copy').textContent='복사 완료';else $('code-output').select();};
function copyReplyCode(id){
 if(!needPostUrl())return;const m=messages().find(x=>x.id===id);
 showCode('다른 글용 답장 코드','답장을 쓸 글에서 ‘다른 글에 답장’을 누르고 이 코드를 붙여 넣으세요. 메시지 링크만 필요하면 둘째 줄 주소를 쓰면 됩니다.',[REPLY_CODE,messageLink(id),`${person(m.person).name}: ${oneLine(snippet(m)).slice(0,100)}`,'#'+id].join('\n'));
}
function parseReplyCode(text){
 const l=codeLines(text);if(l[0]!==REPLY_CODE)return null;
 const url=safeUrl(l[1]||''),line=l[2]||'',at=line.indexOf(': '),origin=(l[3]||'').replace(/^#/,'');
 if(!url||at<1)return null;
 return {kind:'external',url,name:line.slice(0,at),text:line.slice(at+2),...(/^t[a-zA-Z0-9-]+$/.test(origin)?{origin}:{})};
}
function copyBackCode(id){
 if(!needPostUrl())return;const m=messages().find(x=>x.id===id);
 const origin=m.reply.origin||new URL(m.reply.url).hash.slice(1);
 if(!origin)return alert('원문 메시지를 알 수 없습니다. 수정 창에서 원본 글의 답장 코드를 다시 붙여 넣으세요.');
 const label=(state.title.trim()||'답장 보기').replace(/\|/g,'/');
 showCode('돌아가기 코드','원본 글에서 ‘받은 답장 연결’을 누르고 이 코드를 붙여 넣으면 원문 아래에 이 답장으로 오는 링크가 달립니다.',[BACK_CODE,'#'+origin,`${label} | ${messageLink(id)}`].join('\n'));
}
function parseBackCode(text){
 const l=codeLines(text);if(l[0]!==BACK_CODE)return null;
 const id=(l[1]||'').replace(/^#/,''),line=l[2]||'',at=line.lastIndexOf(' | ');if(at<1)return null;
 const url=safeUrl(line.slice(at+3));return url?{id,label:line.slice(0,at),url}:null;
}
$('reply-external').onclick=()=>openReply();
$('reply-code').oninput=()=>{
 replySource=parseReplyCode($('reply-code').value);
 $('reply-quote').innerHTML=replySource?quoteCard(replySource.name,replySource.text):`<p class="hint">${$('reply-code').value.trim()?'답장 코드를 읽지 못했습니다. 원본 글에서 ‘다른 글용 복사’로 만든 코드인지 확인하세요.':'답장 코드를 붙여 넣으면 원문이 여기에 표시됩니다.'}</p>`;
};
$('external-code').oninput=()=>{
 const r=parseReplyCode($('external-code').value);if(!r)return;
 $('external-url').value=r.url;$('external-name').value=r.name;$('external-quote').value=r.text;$('external-origin').value=r.origin||'';
};
$('external-url').addEventListener('input',()=>{$('external-origin').value='';});
let pendingBack=null;
$('link-back').onclick=()=>{pendingBack=null;$('back-code').value='';$('back-result').innerHTML='';$('back-dialog').showModal();$('back-code').focus();};
$('back-code').oninput=()=>{
 const b=parseBackCode($('back-code').value);
 // A code made from an old plain link may point at a fold; attach to that fold's first message.
 const target=b&&(messages().find(x=>x.id===b.id)||state.blocks.find(x=>x.type==='fold'&&x.id===b.id)?.children[0]);
 pendingBack=target?{...b,target:target.id}:null;
 $('back-result').innerHTML=!$('back-code').value.trim()?'':!b?'<p class="hint">돌아가기 코드를 읽지 못했습니다. 답장 글에서 ‘돌아가기 코드’로 만든 내용인지 확인하세요.</p>':!target?'<p class="hint">이 프로젝트에서 원문을 찾지 못했습니다. 원문이 있는 프로젝트를 열었는지 확인하세요.</p>':`<div class="reply-quote"><b>원문 · ${esc(person(target.person).name)}</b><span>${esc(oneLine(snippet(target)).slice(0,120))}</span></div><p class="hint">원문 아래에 달릴 링크: ↗ ${esc(b.label)}</p>`;
};
$('back-form').onsubmit=e=>{
 e.preventDefault();if(!pendingBack)return alert('돌아가기 코드를 붙여 넣고 원문이 표시되는지 확인하세요.');
 const m=messages().find(x=>x.id===pendingBack.target);
 $('back-dialog').close();
 if(m.links.some(l=>l.url===pendingBack.url))return notice('이미 달려 있는 링크입니다.');
 checkpoint();m.links.push({label:pendingBack.label,url:pendingBack.url});commit();
 notice('원문 아래에 답장 링크를 달았습니다. HTML을 다시 내보내 원본 글에 붙여 넣으세요.');
};
