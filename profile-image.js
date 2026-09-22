'use strict';
let profileImageRequest=0;
function readProfileImage(file){
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return Promise.reject(new Error('JPG, PNG, WebP, GIF 파일을 선택하세요.'));
 if(file.size>10*1024*1024)return Promise.reject(new Error('10MB 이하의 이미지를 선택하세요.'));
 return new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(file),image=new Image();
   const timeout=setTimeout(()=>{cleanup();reject(new Error('이미지를 읽는 데 시간이 너무 오래 걸립니다. 다른 파일을 선택하세요.'));},15000);
   function cleanup(){clearTimeout(timeout);image.onload=null;image.onerror=null;URL.revokeObjectURL(url);}
   image.onerror=()=>{cleanup();reject(new Error('이미지를 읽을 수 없습니다. 다른 파일을 선택하세요.'));};
   image.onload=()=>{try{
     if(!image.naturalWidth||!image.naturalHeight)throw new Error('이미지 크기를 확인할 수 없습니다.');
     const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이 브라우저에서는 이미지 처리를 지원하지 않습니다.');
     const side=Math.min(image.naturalWidth,image.naturalHeight);
     ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,128,128);
     resolve(canvas.toDataURL('image/png'));
   }catch(error){reject(error);}finally{cleanup();}};
   image.src=url;
 });
}
$('person-form').addEventListener('change',async e=>{
 if(e.target.id!=='profile-image-file')return;
 const file=e.target.files[0];if(!file)return;
 const request=++profileImageRequest,form=$('person-form'),data=form.elements.photoData,status=$('profile-image-status'),preview=$('profile-image-preview'),input=e.target;
 status.textContent='사진을 준비하고 있어요…';
 try{
   const src=await readProfileImage(file);
   if(request!==profileImageRequest||!data.isConnected)return;
   data.value=src;form.elements.photo.value='';
   preview.innerHTML=`<img src="${esc(src)}" alt="선택한 프로필 사진" style="width:64px;height:64px;border-radius:50%;object-fit:cover">`;
   status.textContent='사진이 준비됐어요. ‘인물 설정 적용’을 눌러 저장하세요.';
 }catch(error){if(request===profileImageRequest&&data.isConnected)status.textContent=error.message;}
 finally{input.value='';}
});
$('person-form').addEventListener('click',e=>{
 if(e.target.id!=='clear-profile-image')return;
 profileImageRequest++;
 const form=$('person-form');form.elements.photo.value='';form.elements.photoData.value='';
 $('profile-image-preview').innerHTML='';
 $('profile-image-status').textContent='‘인물 설정 적용’을 누르면 프사가 삭제됩니다.';
});
