const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseKakaoText}=require('./kakao-text.js');
test('PC export header, date, multiline, CRLF and attachment text',()=>{
 const p=parseKakaoText('\uFEFF샘플 님과 카카오톡 대화\r\n저장한 날짜 : 2026-09-22 12:00:00\r\n\r\n--------------- 2026년 9월 8일 화요일 ---------------\r\n[가] [오후 3:14] 첫 줄\r\n둘째 줄\r\n\r\n넷째 줄\r\n[나] [오전 9:01] 사진 2장\r\n');
 assert.deepEqual(p.names,['가','나']);assert.equal(p.messages.length,2);assert.equal(p.messages[0].date,'2026-09-08');assert.equal(p.messages[0].text,'첫 줄\n둘째 줄\n\n넷째 줄');assert.equal(p.messages[1].text,'사진 2장');assert.equal(p.warnings.length,0);
});
test('date change and identical names reuse one participant',()=>{const p=parseKakaoText('--- 2026년 9월 8일 ---\n[가] [13:01] 하나\n--- 2026년 9월 9일 ---\n[가] [13:02] 둘');assert.equal(p.names.length,1);assert.equal(p.messages[1].date,'2026-09-09');});
test('unrecognized lines are reported, not silently discarded',()=>{const p=parseKakaoText('알 수 없는 안내\n[가] [오후 1:00] 내용');assert.equal(p.skipped[0].text,'알 수 없는 안내');assert.equal(p.messages[0].date,'');assert.equal(p.warnings.length,2);});
test('non-message bracket content and HTML are preserved as text',()=>{const p=parseKakaoText('[가] [오후 1:00] <img src=x onerror=alert(1)>\n[첨부 설명]\n저장한 날짜 : 본문');assert.equal(p.messages.length,1);assert.match(p.messages[0].text,/\[첨부 설명\]\n저장한 날짜/);});
test('empty and unsupported exports cannot import',()=>{assert.equal(parseKakaoText('').messages.length,0);assert.equal(parseKakaoText('2026. 9. 22. 사용자 : 내용').messages.length,0);});
