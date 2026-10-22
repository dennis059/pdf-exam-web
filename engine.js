
let d={pages:[],questions:[],responses:{}},qs=[],pos=-1,dirty=false;
const el=id=>document.getElementById(id);const warn=e=>el('msg').textContent=e;
async function api(path,body,headers={}){let r=await fetch('/api/'+path,{method:'POST',body,headers});let x=await r.json();if(!r.ok)throw Error(x.error||'伺服器操作失敗');return x}
async function load(){try{let r=await fetch('/api/data');if(!r.ok)throw Error('無法讀取題庫');d=await r.json();qs=d.questions.map(x=>({...x}));dirty=false;render();warn(qs.length?'題庫已就緒，請直接按「開始考試」。':'請先匯入 PDF。')}catch(e){warn('載入失敗：'+e.message)}}
function scopeQuestions(){return d.questions.filter(q=>q.bank_id===referenceBank()?.id)}
function referenceBank(){return d.banks.find(b=>b.id===d.active_bank)||d.banks[0]}
function render(){renderReference();renderRows();stats()}
function renderReference(){let b=referenceBank();el('info').textContent=b?`${b.source_file}｜${b.pages.length} 頁（目前對照的 PDF）`:'尚未匯入 PDF';el('page').innerHTML=(b?.pages||[]).map((_,i)=>`<option value="${i}">${i+1}</option>`).join('');el('pdfLink').href=b?'/source.pdf?bank='+b.id:'#';renderPage()}
function renderPage(){let b=referenceBank(),p=+el('page').value;el('pageText').textContent=b?.pages[p]||'（本頁沒有可擷取的文字）'}
let importing=false;
async function upload(){if(importing)return;resetAdvance();importing=true;warn('正在匯入 PDF，請稍候…');try{let f=el('pdf').files[0];if(!f)throw Error('請選擇 PDF');d=await api('pdf',await f.arrayBuffer(),{'X-Filename':encodeURIComponent(f.name)});qs=d.questions.map(q=>({...q}));dirty=false;exam=[];pos=-1;el('retryChoice').hidden=true;el('answerButtons').innerHTML='';el('question').textContent='尚未開始';el('result').textContent='';render();warn('匯入完成，'+el('count').textContent+'。請直接開始考試。')}catch(e){warn('匯入失敗：'+e.message+'。目前仍是 '+(referenceBank()?.source_file||'尚未匯入 PDF'))}finally{importing=false}}
function fullText(q){return q.original_text+(q.type==='choice'?'\n'+q.options.map(o=>`${o.key}. ${o.text}`).join('\n'):'')}
function bankName(q){return d.banks.find(b=>b.id===q.bank_id)?.source_file||''}
function questionTitle(q){return `${q.type==='choice'?'選擇題':'是非題'} 第${q.original_number}題`}
function renderRows(){let list=scopeQuestions(),ready=list.filter(q=>q.status==='ready').length;el('count').textContent=`這份 PDF 可考 ${ready} 題；略過 ${list.length-ready} 題`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function startExam(){if(importing)return warn('PDF 正在匯入，請稍候');resetAdvance();let all=scopeQuestions().filter(q=>q.status==='ready');let start=el('start').value.trim();let i=start?all.findIndex(q=>q.original_number===start || Number(q.original_number)===Number(start)):0;if(i<0||!all.length)return warn('沒有可考題目或找不到起始題號，請確認已匯入含答案的 PDF');el('retryChoice').hidden=true;exam=all;pos=i;showQuestion()}
let exam=[];function showQuestion(){stopSpeak();pendingAdvance=false;el('pauseExam').textContent='暫停考試';el('pauseExam').disabled=!exam[pos];el('progress').textContent=exam[pos]?`${pos+1} / ${exam.length}`:'考試結束';let q=exam[pos];if(!q){pos=-1;el('answerButtons').innerHTML='';el('question').textContent='考試結束';el('result').textContent='請查看下方成績與錯題整理';showRetryChoice();return}el('question').textContent=questionTitle(q)+'，'+q.original_text;let options=q.type==='choice'?q.options:[{key:'對',text:'對'},{key:'錯',text:'錯'}];el('answerButtons').innerHTML=options.map(o=>`<button onclick="submitAnswer('${o.key}')" style="text-align:left;white-space:normal">${escapeHtml(q.type==='choice'?o.key+'. '+o.text:o.text)}</button>`).join('');el('result').textContent='';speak()}
function speak(){if(answerBusy||examPaused||!el('readAloud').checked)return;if(pos<0||!exam[pos])return;stopSpeak();if(!('speechSynthesis'in window))return warn('此瀏覽器不支援朗讀');let q=exam[pos];let u=new SpeechSynthesisUtterance(questionTitle(q)+'，'+q.original_text+(q.type==='choice'?'。'+q.options.map(o=>'選項'+o.key+'，'+o.text).join('。'):''));u.lang='zh-TW';u.rate=Number(el('speed').value)||1.4;speechSynthesis.speak(u)}
function stopSpeak(){if('speechSynthesis'in window)speechSynthesis.cancel()}
let answerBusy=false,examRun=0,advanceTimer=null,examPaused=false,pendingAdvance=false,feedbackMessage='',recognition=null;
function setAnswerBusy(value){answerBusy=value;document.querySelectorAll('button[onclick^="submitAnswer"],button[onclick="listen()"],button[onclick="speak()"]').forEach(b=>b.disabled=value||examPaused)}
function resetAdvance(){examRun++;examPaused=false;pendingAdvance=false;if(recognition){recognition.abort();recognition=null}el('pauseExam').textContent='暫停考試';el('pauseExam').disabled=true;clearTimeout(advanceTimer);advanceTimer=null;stopSpeak();setAnswerBusy(false)}
function announceThenAdvance(message,run){if(examPaused)return;
    const started=Date.now();let finished=false;
    const advance=()=>{if(run!==examRun||finished||examPaused)return;finished=true;clearTimeout(advanceTimer);advanceTimer=setTimeout(()=>{if(run!==examRun||examPaused)return;advanceTimer=null;pendingAdvance=false;setAnswerBusy(false);pos++;showQuestion()},Math.max(80,350-(Date.now()-started)))};
    advanceTimer=setTimeout(advance,2500);
    if(!el('readAloud').checked||!('speechSynthesis' in window)){advance();return}
    try{let u=new SpeechSynthesisUtterance(message);u.lang='zh-TW';u.rate=Number(el('speed').value)||1.4;u.onend=advance;u.onerror=advance;speechSynthesis.speak(u)}catch(e){advance()}
}
async function submitAnswer(a){
    if(answerBusy||examPaused)return;
    if(pos<0||!exam[pos])return warn('請先開始考試');
    const run=examRun,q=exam[pos];setAnswerBusy(true);stopSpeak();
    try{
        let x=await api('answer',JSON.stringify({id:q.id,answer:a}),{'Content-Type':'application/json'});
        if(run!==examRun)return;
        d.responses[q.id]=x.response;
        const prefix=x.response.result==='答對'?'答對！':x.response.result==='答錯'?'答錯！':'已跳過。';
        const message=prefix;
        el('result').textContent=message;stats();pendingAdvance=true;feedbackMessage=message;if(!examPaused)announceThenAdvance(message,run);
    }catch(e){if(run===examRun){setAnswerBusy(false);warn(e.message)}}
}
function wrongQuestions(){return scopeQuestions().filter(q=>q.status==='ready'&&d.responses[q.id]?.result==='答錯')}
function stats(){let ids=new Set(scopeQuestions().map(q=>q.id));let r=Object.entries(d.responses||{}).filter(([id])=>ids.has(id));let right=r.filter(([,x])=>x.result==='答對').length,wrong=r.filter(([,x])=>x.result==='答錯'),skipped=r.filter(([,x])=>x.result==='跳過').length,n=right+wrong.length;el('stats').textContent=n?`已作答 ${n}；答對 ${right}；答錯 ${wrong.length}；跳過 ${skipped}；正確率 ${(100*right/n).toFixed(1)}%`:'尚無成績';
let list=wrongQuestions();el('reviewWrongButton').disabled=!list.length;
el('wrongSummary').innerHTML=list.length?`<h3>錯題整理（${list.length} 題）</h3><div style="max-height:400px;overflow:auto"><table><thead><tr><th>題號</th><th>PDF 頁碼</th><th>題目原文</th><th>你的回答</th></tr></thead><tbody>${list.map(q=>`<tr><td>${questionTitle(q)}<br><small>${escapeHtml(bankName(q))}</small></td><td>${q.page}</td><td style="white-space:pre-wrap">${escapeHtml(fullText(q))}</td><td>${escapeHtml(d.responses[q.id].user_answer)}</td></tr>`).join('')}</tbody></table></div>`:'目前沒有答錯的題目。';}
function showRetryChoice(){stats();let count=wrongQuestions().length;el('retryChoice').hidden=false;el('retryWrong').hidden=!count;el('retryPrompt').textContent=count?`考試結束，已整理 ${count} 題錯題。要只重考這些題目嗎？`:'考試結束，目前沒有錯題。';el('retryChoice').scrollIntoView({block:'center',behavior:'smooth'})}
function dismissRetry(){el('retryChoice').hidden=true;warn('已保留錯題整理，之後可按「重考錯題」。')}
function reviewWrong(){let wrong=wrongQuestions();if(!wrong.length)return warn('目前沒有可重考的錯題');resetAdvance();el('retryChoice').hidden=true;exam=wrong;pos=0;warn(`開始重考 ${exam.length} 題錯題。答對的題目會從錯題清單移除。`);showQuestion();el('question').scrollIntoView({block:'center',behavior:'smooth'})}
function voiceAnswer(t){if(examPaused)return;t=t.trim().replace(/[。！!，,\s]/g,'');if(/^(暫停|等一下)$/.test(t)){pauseExam();return}if(/^(跳過|下一題)$/.test(t)){submitAnswer('跳過');return}let q=exam[pos];if(!q||answerBusy)return;if(q.type==='choice'){let m=t.match(/^(?:選|選項|答案是?|第)?([1-4１-４一二三四ABCDabcd])(?:個|項|號)?$/);if(m){let c=m[1],key=/[1-4１-４]/.test(c)?String(Number(c.normalize('NFKC'))):'一二三四'.includes(c)?String('一二三四'.indexOf(c)+1):String('ABCD'.indexOf(c.toUpperCase())+1);if(q.options.some(o=>o.key===key)){submitAnswer(key);return}}warn('請回答選項一、二、三或四，或直接點選按鈕。')}else if(/^(錯|不對|錯誤)$/.test(t))submitAnswer('錯');else if(/^(對|正確|是|沒錯)$/.test(t))submitAnswer('對');else warn('未能辨識答案：'+t)}
function listen(){if(answerBusy||examPaused)return;if(pos<0||!exam[pos])return warn('請先開始考試');let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return warn('此瀏覽器不支援語音辨識，請直接點選答案');stopSpeak();let run=examRun,current=exam[pos].id;let r=new SR();recognition=r;r.lang='zh-TW';r.onresult=e=>{if(!examPaused&&run===examRun&&exam[pos]?.id===current)voiceAnswer(e.results[0][0].transcript)};r.onerror=e=>{if(!examPaused&&run===examRun)warn('語音辨識失敗：'+e.error)};r.start()}
function pauseExam(){if(examPaused||pos<0||!exam[pos])return;examPaused=true;clearTimeout(advanceTimer);advanceTimer=null;if(recognition){recognition.abort();recognition=null}stopSpeak();setAnswerBusy(answerBusy);el('pauseExam').textContent='繼續考試';warn('考試已暫停，進度已保留。按「繼續考試」接著考。')}
function togglePause(){if(!examPaused){pauseExam();return}examPaused=false;setAnswerBusy(answerBusy);el('pauseExam').textContent='暫停考試';warn('已繼續考試。');if(pendingAdvance)announceThenAdvance(feedbackMessage,examRun);else if(!answerBusy)speak()}
window.addEventListener('error',e=>warn('操作錯誤：'+e.message));
window.addEventListener('unhandledrejection',e=>warn('操作失敗：'+(e.reason?.message||e.reason)));
