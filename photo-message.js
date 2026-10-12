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
function showMessageImage(){
 const typed=$('message-image-url').value.trim(),src=typed?safeUrl(typed):$('message-image-data').value;
 $('message-image-preview').innerHTML=src?`<img src="${esc(src)}" alt="넣을 사진">`:'';
 $('message-image-clear').hidden=!src&&!typed;
}
function setMessageImage(src){
 messagePhotoRequest++;
 const data=src.startsWith('data:')?safePhoto(src):'';
 $('message-image-data').value=data;$('message-image-url').value=data?'':safeUrl(src);
 $('message-image-status').textContent='';showMessageImage();
}
$('message-image-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 const request=++messagePhotoRequest,input=e.target;
 $('message-image-status').textContent='사진을 준비하고 있어요…';
 try{
   const src=await readMessagePhoto(file);
   if(request!==messagePhotoRequest)return;
   $('message-image-data').value=src;$('message-image-url').value='';showMessageImage();
   $('message-image-status').textContent=`사진이 준비됐어요 (${Math.round(src.length*3/4/1024)}KB). ‘대화 저장’을 누르세요.`;
 }catch(error){if(request===messagePhotoRequest)$('message-image-status').textContent=error.message;}
 finally{input.value='';}
};
$('message-image-url').oninput=showMessageImage;
$('message-image-clear').onclick=()=>setMessageImage('');
