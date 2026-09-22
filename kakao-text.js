'use strict';
// PC KakaoTalk TXT: date separator followed by [sender] [time] message.
function parseKakaoText(source) {
  const lines=String(source).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
  const messages=[], warnings=[], skipped=[];let date='', current=null;
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    const day=line.match(/^\s*-{3,}\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s+[^-]*)?\s*-{3,}\s*$/);
    if(day){date=`${day[1]}-${day[2].padStart(2,'0')}-${day[3].padStart(2,'0')}`;current=null;continue;}
    const message=line.match(/^\[(.+?)\]\s+\[((?:(?:오전|오후|AM|PM)\s*)?\d{1,2}:\d{2})\](?: ?)(.*)$/i);
    if(message){current={name:message[1],time:message[2],date,text:message[3]};messages.push(current);continue;}
    if(current){current.text+='\n'+line;continue;}
    if(!line.trim())continue;
    if(!messages.length&&(/님과 카카오톡 대화\s*$/.test(line)||/^저장한 날짜\s*:/.test(line)))continue;
    skipped.push({line:i+1,text:line});
  }
  // Export files commonly end with an empty line; keep interior line breaks intact.
  for(const m of messages)m.text=m.text.replace(/\n+$/,'');
  if(skipped.length)warnings.push(`메시지로 인식하지 못한 ${skipped.length}줄이 있습니다. 아래 원문을 확인하세요.`);
  if(!messages.length)warnings.push('대화를 찾지 못했습니다. [이름] [오후 3:15] 내용 형식인지 확인하세요.');
  if(messages.some(m=>!m.date))warnings.push('날짜 구분선이 없는 대화는 날짜 없이 가져옵니다.');
  return {messages,names:[...new Set(messages.map(m=>m.name))],warnings,skipped};
}
if(typeof module!=='undefined'&&module.exports)module.exports={parseKakaoText};
