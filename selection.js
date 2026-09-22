'use strict';
// Dragging selects whole messages; editing controls and touch scrolling stay native.
const messageList=$('messages');
let selectionDrag=null, selectionFrame=0;
function syncSelection(){
 const currentIds=new Set(messages().map(m=>m.id));
 for(const id of selected)if(!currentIds.has(id))selected.delete(id);
 messageList.querySelectorAll('[data-message-id]').forEach(row=>{
   const checked=selected.has(row.dataset.messageId);
   row.classList.toggle('is-selected',checked);
   row.querySelector('[data-select]').checked=checked;
 });
 $('selection-count').textContent=selected.size?`${selected.size}개 선택됨`:'선택한 대화 없음';
 $('clear-selection').disabled=!selected.size;
 $('delete-selected').disabled=!selected.size;
}
function selectDragRange(){
 if(!selectionDrag)return;
 const d=selectionDrag;
 // Nearest message also handles the whitespace between cards and folded boundaries.
 let end=0,distance=Infinity;
 d.rows.forEach((row,i)=>{const r=row.getBoundingClientRect();const delta=Math.max(r.top-d.y,0,d.y-r.bottom);if(delta<distance){distance=delta;end=i;}});
 selected=new Set(d.rows.slice(Math.min(d.start,end),Math.max(d.start,end)+1).map(r=>r.dataset.messageId));
 syncSelection();
}
function dragScroll(){
 if(!selectionDrag)return;
 const r=messageList.getBoundingClientRect(),d=selectionDrag;
 const top=Math.max(r.top,0),bottom=Math.min(r.bottom,window.innerHeight);
 const speed=d.y<top+40?-12:d.y>bottom-40?12:0;
 if(speed){const before=messageList.scrollTop;messageList.scrollTop+=speed;if(before===messageList.scrollTop)window.scrollBy(0,speed);selectDragRange();}
 selectionFrame=requestAnimationFrame(dragScroll);
}
function finishSelectionDrag(cancel=false){
 if(!selectionDrag)return;
 const d=selectionDrag;selectionDrag=null;
 cancelAnimationFrame(selectionFrame);
 if(cancel)selected=d.previous;
 if(messageList.hasPointerCapture(d.pointerId))messageList.releasePointerCapture(d.pointerId);
 messageList.classList.remove('is-dragging');
 syncSelection();
}
messageList.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.pointerType==='touch'||selectionDrag||e.target.closest('button,input,textarea,select,a,label'))return;
 const row=e.target.closest('[data-message-id]');if(!row)return;
 // Stay in one contiguous group, so a drag cannot accidentally make a nested fold.
 const siblings=Array.from(row.parentElement.children);const at=siblings.indexOf(row);
 let first=at,last=at;
 while(first>0&&siblings[first-1].matches('[data-message-id]'))first--;
 while(last+1<siblings.length&&siblings[last+1].matches('[data-message-id]'))last++;
 const rows=siblings.slice(first,last+1);
 selectionDrag={rows,start:rows.indexOf(row),y:e.clientY,pointerId:e.pointerId,previous:new Set(selected)};
 e.preventDefault();window.getSelection()?.removeAllRanges();
 messageList.setPointerCapture(e.pointerId);messageList.classList.add('is-dragging');
 selectDragRange();selectionFrame=requestAnimationFrame(dragScroll);
});
messageList.addEventListener('pointermove',e=>{if(selectionDrag?.pointerId!==e.pointerId)return;selectionDrag.y=e.clientY;selectDragRange();});
messageList.addEventListener('pointerup',e=>{if(selectionDrag?.pointerId===e.pointerId){selectionDrag.y=e.clientY;selectDragRange();finishSelectionDrag();}});
messageList.addEventListener('pointercancel',()=>finishSelectionDrag(true));
messageList.addEventListener('lostpointercapture',()=>finishSelectionDrag());
window.addEventListener('blur',()=>finishSelectionDrag());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectionDrag){e.preventDefault();finishSelectionDrag(true);}});
$('clear-selection').onclick=()=>{selected.clear();syncSelection();};
syncSelection();
