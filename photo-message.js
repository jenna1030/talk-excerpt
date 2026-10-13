'use strict';
// Photo messages are shrunk in the browser so the project JSON and exported HTML stay small.
let messagePhotoRequest=0;
function readMessagePhoto(file){
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return Promise.reject(new Error('JPG, PNG, WebP, GIF 파일을 선택하세요.'));
 if(file.size>20*1024*1024)return Promise.reject(new Error('20MB 이하의 사진을 선택하세요.'));
 return new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(file),image=new Image();
   const timeout=setTimeout(()=>{cleanup();reject(new Error('사진을 읽는 데 시간이 너무 오래 걸립니다. 다른 파일을 선택하세요.'));},15000);
   function cleanup(){clearTimeout(timeout);image.onload=null;image.onerror=null;URL.revokeObjectURL(url);}
   image.onerror=()=>{cleanup();reject(new Error('사진을 읽을 수 없습니다. 다른 파일을 선택하세요.'));};
   image.onload=()=>{try{
     if(!image.naturalWidth||!image.naturalHeight)throw new Error('사진 크기를 확인할 수 없습니다.');
     const scale=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight));
     const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이 브라우저에서는 사진 처리를 지원하지 않습니다.');
     // JPEG has no transparency, so transparent PNG/GIF areas become white like KakaoTalk's preview.
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
     for(const quality of [.85,.7,.55]){const src=canvas.toDataURL('image/jpeg',quality);if(safePhoto(src)===src)return resolve(src);}
     throw new Error('사진 용량을 줄이지 못했습니다. 티스토리에 사진을 올린 뒤 사진 주소를 입력하세요.');
   }catch(error){reject(error);}finally{cleanup();}};
   image.src=url;
 });
}
// The dialog keeps its own photo list; a message may hold up to 30 like a KakaoTalk album.
const MAX_PHOTOS=30;
let messagePhotos=[];
function showMessageImages(){
 $('message-image-preview').innerHTML=messagePhotos.map((src,i)=>`<figure><img src="${esc(src)}" alt="사진 ${i+1}"><button type="button" data-remove-photo="${i}" aria-label="사진 ${i+1} 빼기">×</button></figure>`).join('');
 $('message-image-clear').hidden=messagePhotos.length<2;
}
function setMessageImages(list){
 messagePhotoRequest++;
 messagePhotos=list.map(safePhoto).filter(Boolean);
 $('message-image-url').value='';$('message-image-status').textContent='';showMessageImages();
}
function getMessageImages(){return messagePhotos.slice();}
async function addPhotoFiles(files){
 const list=[...files].filter(f=>f.type.startsWith('image/'));if(!list.length)return;
 const room=MAX_PHOTOS-messagePhotos.length,request=messagePhotoRequest;
 if(room<=0){$('message-image-status').textContent=`사진은 최대 ${MAX_PHOTOS}장까지 넣을 수 있어요.`;return;}
 $('message-image-status').textContent=`사진 ${Math.min(list.length,room)}장을 준비하고 있어요…`;
 let added=0,failed='';
 for(const file of list.slice(0,room)){
   try{const src=await readMessagePhoto(file);if(request!==messagePhotoRequest)return;messagePhotos.push(src);added++;showMessageImages();}
   catch(error){failed=error.message;}
 }
 if(request!==messagePhotoRequest)return;
 $('message-image-status').textContent=[added?`사진 ${added}장을 넣었어요. ‘대화 저장’을 누르세요.`:'',failed&&`넣지 못한 사진이 있어요: ${failed}`,list.length>room?`최대 ${MAX_PHOTOS}장까지만 넣었어요.`:''].filter(Boolean).join(' ');
}
function addPhotoUrl(){
 const url=safeUrl($('message-image-url').value.trim());
 if(!url)return alert('사진은 http 또는 https 이미지 주소를 입력하세요.');
 if(messagePhotos.length>=MAX_PHOTOS)return alert(`사진은 최대 ${MAX_PHOTOS}장까지 넣을 수 있어요.`);
 messagePhotos.push(url);$('message-image-url').value='';showMessageImages();
}
$('message-image-file').onchange=async e=>{const input=e.target;try{await addPhotoFiles(input.files);}finally{input.value='';}};
$('message-image-add').onclick=addPhotoUrl;
$('message-image-url').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addPhotoUrl();}});
$('message-image-preview').onclick=e=>{const b=e.target.closest('[data-remove-photo]');if(!b)return;messagePhotos.splice(Number(b.dataset.removePhoto),1);showMessageImages();};
$('message-image-clear').onclick=()=>setMessageImages([]);
