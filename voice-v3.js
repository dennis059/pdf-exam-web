// One opt-in per exam; suspend recognition during all spoken prompts.
let voiceEnabled=false,voiceTimer=null,voiceEpoch=0,voiceFailures=0;
function voiceLabel(){el('voiceButton').textContent=voiceEnabled?'🎙 關閉連續語音':'🎙 開啟連續語音';el('voiceButton').disabled=false;el('voiceButton').setAttribute('aria-pressed',String(voiceEnabled))}
function stopListening(){voiceEpoch++;clearTimeout(voiceTimer);voiceTimer=null;let old=recognition;recognition=null;if(old){old.onend=null;old.onresult=null;old.onerror=null;try{old.abort()}catch(e){}}}
function armListening(delay=250){stopListening();if(!voiceEnabled||answerBusy||examPaused||document.hidden||!exam[pos])return;const token=voiceEpoch,run=examRun,id=exam[pos].id;voiceTimer=setTimeout(()=>{if(token!==voiceEpoch||!voiceEnabled||run!==examRun||examPaused||answerBusy||exam[pos]?.id!==id)return;
 let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;let r=new SR;recognition=r;r.lang='zh-TW';r.continuous=false;r.interimResults=false;let blocked=false;
 r.onstart=()=>warn('正在聆聽：請說「對／錯」或選項號碼；也可以直接點答案。');
 r.onresult=e=>{if(token!==voiceEpoch||run!==examRun||exam[pos]?.id!==id||examPaused||answerBusy)return;voiceFailures=0;for(let i=e.resultIndex||0;i<e.results.length;i++)if(e.results[i].isFinal){voiceAnswer(e.results[i][0].transcript);break}};
 r.onerror=e=>{if(token!==voiceEpoch)return;if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){blocked=true;voiceEnabled=false;voiceLabel();warn('無法使用麥克風，請確認瀏覽器麥克風權限；仍可點選答案。')}else if(e.error!=='no-speech'&&e.error!=='aborted'){voiceFailures++;if(voiceFailures>=3){blocked=true;voiceEnabled=false;voiceLabel();warn('語音服務連線不穩，已停止連續語音。可稍後重新開啟或點選答案。')}}};
 r.onend=()=>{if(recognition===r)recognition=null;if(!blocked&&token===voiceEpoch)armListening(400)};
 try{r.start()}catch(e){voiceEnabled=false;voiceLabel();warn('語音無法啟動：'+e.message)}
 },delay)}
const baseStopSpeak=stopSpeak,baseSetAnswerBusy=setAnswerBusy;
stopSpeak=function(){stopListening();baseStopSpeak()};
setAnswerBusy=function(value){baseSetAnswerBusy(value);voiceLabel()};
listen=function(){if(voiceEnabled){voiceEnabled=false;stopListening();voiceLabel();warn('已關閉連續語音。');return}if(!(window.SpeechRecognition||window.webkitSpeechRecognition))return warn('此瀏覽器不支援語音辨識，請使用支援的瀏覽器或點選答案。');voiceEnabled=true;voiceFailures=0;voiceLabel();if(exam[pos]&&!examPaused&&!answerBusy)speak();else warn('連續語音已開啟，開始或繼續考試後會自動聆聽。')};
speak=function(){stopSpeak();if(answerBusy||examPaused||!exam[pos])return;if(!el('readAloud').checked){armListening();return}if(!('speechSynthesis'in window)){armListening();return}let q=exam[pos],run=examRun,id=q.id,u=new SpeechSynthesisUtterance(questionTitle(q)+'，'+q.original_text+(q.type==='choice'?'。'+q.options.map(o=>'選項'+o.key+'，'+o.text).join('。'):''));u.lang='zh-TW';u.rate=Number(el('speed').value)||1.4;u.onend=()=>{if(run===examRun&&exam[pos]?.id===id)armListening()};u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted'&&run===examRun&&exam[pos]?.id===id)armListening()};speechSynthesis.speak(u)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopListening()});voiceLabel();
