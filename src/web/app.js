import { START_FEN, parseFen, serializeFen } from '../core/fen.js';
import { moveToIccs } from '../core/rules.js';
import { analyzePosition } from '../engine/search.js';
import { AnalysisController } from '../app/analysis-controller.js';
import { captureVideoSample, signatureFromPixels } from '../app/video.js';
import { clearOverlay, drawMoveArrow } from '../overlay/draw.js';

const $=id=>{const node=document.getElementById(id);if(!node)throw new Error(`Missing UI element #${id}`);return node;};
const el={
  file:/** @type {HTMLInputElement} */($('fileInput')), stage:/** @type {HTMLDivElement} */($('stage')), video:/** @type {HTMLVideoElement} */($('video')), image:/** @type {HTMLImageElement} */($('image')), overlay:/** @type {HTMLCanvasElement} */($('overlay')),
  analyze:/** @type {HTMLButtonElement} */($('analyzeBtn')), auto:/** @type {HTMLButtonElement} */($('autoBtn')), calibrate:/** @type {HTMLButtonElement} */($('calibrateBtn')), reset:/** @type {HTMLButtonElement} */($('clearCalibrationBtn')),
  status:$('status'), dot:$('statusDot'), confidence:$('confidence'), moves:$('topMoves'), fen:/** @type {HTMLTextAreaElement} */($('fenInput')), fenAnalyze:/** @type {HTMLButtonElement} */($('fenAnalyzeBtn')), board:$('board'), turn:$('turnBadge'), timeline:$('timeline'), count:$('eventCount'), explain:/** @type {HTMLButtonElement} */($('explainBtn')), explanation:$('explanation')
};
let calibration=[],calibrating=false,autoTimer=null,lastLines=[],objectUrl=null,currentMode=null;

function status(text,type=''){el.status.textContent=text;el.dot.className=`dot ${type}`;}
function scoreText(score){if(Math.abs(score)>900000)return score>0?'MATE':'-MATE';return `${score>=0?'+':''}${(score/100).toFixed(2)}`;}
function pieceLabel(p){return ({K:'帥',A:'仕',B:'相',N:'馬',R:'車',C:'炮',P:'兵',k:'將',a:'士',b:'象',n:'馬',r:'車',c:'砲',p:'卒'})[p]||'';}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

function renderBoard(fen){
  const {board,sideToMove}=parseFen(fen);el.board.innerHTML='';
  for(const rank of board)for(const p of rank){const sq=document.createElement('div');sq.className='sq';if(p){const pc=document.createElement('div');pc.className=`piece ${p===p.toUpperCase()?'red':'black'}`;pc.textContent=pieceLabel(p);sq.append(pc);}el.board.append(sq);}
  el.turn.textContent=sideToMove==='red'?'Đỏ đi':'Đen đi';
}
function renderMoves(lines){
  lastLines=lines||[];el.moves.innerHTML='';
  if(!lastLines.length){el.moves.innerHTML='<div class="muted">Chưa có nước phân tích.</div>';return;}
  lastLines.forEach((line,i)=>{const d=document.createElement('div');d.className='move-card';const pv=(line.pv||[]).slice(0,5).map(moveToIccs).join(' ');d.innerHTML=`<div class="move-rank">#${i+1}</div><div><div class="move-uci">${moveToIccs(line.move)}</div><div class="move-pv">PV ${pv}</div></div><div class="score">${scoreText(line.score)}</div>`;d.addEventListener('click',()=>drawBest(line));el.moves.append(d);});
}
function syncOverlaySize(){const w=currentMode==='video'?el.video.videoWidth:el.image.naturalWidth;const h=currentMode==='video'?el.video.videoHeight:el.image.naturalHeight;if(!w||!h)return;el.overlay.width=w;el.overlay.height=h;if(calibration.length!==4)calibration=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];drawCalibration();}
function drawCalibration(){const c=el.overlay.getContext('2d');clearOverlay(c,el.overlay.width,el.overlay.height);if(calibration.length){c.save();c.strokeStyle='#facc15';c.fillStyle='#facc15';c.lineWidth=Math.max(2,el.overlay.width/500);c.beginPath();calibration.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(calibration.length===4){c.closePath();c.stroke();}for(const p of calibration){c.beginPath();c.arc(p.x,p.y,Math.max(5,el.overlay.width/160),0,Math.PI*2);c.fill();}c.restore();}if(lastLines[0])drawMoveArrow(c,lastLines[0].move,calibration,{lineWidth:Math.max(5,el.overlay.width/220),headSize:Math.max(16,el.overlay.width/45)});}
function drawBest(line){if(calibration.length!==4)return;const c=el.overlay.getContext('2d');clearOverlay(c,el.overlay.width,el.overlay.height);drawMoveArrow(c,line.move,calibration,{lineWidth:Math.max(5,el.overlay.width/220),headSize:Math.max(16,el.overlay.width/45)});}
function renderEvent(event){const old=el.timeline.querySelector('.muted');if(old)old.remove();const d=document.createElement('div');d.className='event';d.innerHTML=`<span class="time">${formatTime(event.timestamp||0)}</span><span>${event.move?moveToIccs(event.move):'state'} <small class="reason">${event.reason||''}</small></span><span>${event.candidate?Math.round(event.candidate.confidence*100)+'%':''}</span>`;el.timeline.prepend(d);el.count.textContent=`${controller.events.length} trạng thái`;}

async function recognize(frame,ctx){
  const imageDataUrl=frame.dataUrl||frame;
  const r=await fetch('/api/recognize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl,previousFen:ctx.previousFen,sideToMove:ctx.sideToMove})});
  const data=await r.json();if(!r.ok)throw new Error(data.message||data.error||`HTTP ${r.status}`);return data.candidate;
}
const controller=new AnalysisController({recognizer:recognize,engine:(board,side,opt)=>analyzePosition(board,side,opt),hashFrame:async frame=>frame.signature||String(frame).slice(-256),engineOptions:{depth:2,multiPv:3,maxNodes:35000}});

async function analyzeSample(sample,timestamp){
  status('Workers AI đang nhận diện…','busy');
  try{const event=/** @type {any} */(await controller.analyzeFrame(sample,timestamp));if(event.status==='skipped'){status('Frame gần như không đổi — bỏ qua','ok');return;}if(event.status!=='accepted'){status(`Không cập nhật trusted state: ${event.reason}`,'bad');if(event.candidate)el.confidence.textContent=`Confidence ${Math.round(event.candidate.confidence*100)}%`;return;}el.fen.value=event.fen;renderBoard(event.fen);renderMoves(event.lines);renderEvent(event);el.confidence.textContent=`Vision ${Math.round(event.candidate.confidence*100)}%`;if(event.candidate.boardCorners&&event.candidate.boardCorners.length===4){calibration=event.candidate.boardCorners.map(p=>({x:p.x*el.overlay.width,y:p.y*el.overlay.height}));}drawCalibration();status(event.move?`Đã xác nhận nước ${moveToIccs(event.move)}`:'Đã xác nhận thế cờ','ok');}catch(e){status(`Lỗi: ${e.message}`,'bad');}
}

async function analyzeCurrent(){
  if(currentMode==='video'){if(!el.video.videoWidth)return status('Video chưa sẵn sàng','bad');return analyzeSample(captureVideoSample(el.video),el.video.currentTime||0);}
  if(currentMode==='image'){const canvas=document.createElement('canvas');const max=960,scale=Math.min(1,max/el.image.naturalWidth);canvas.width=Math.round(el.image.naturalWidth*scale);canvas.height=Math.round(el.image.naturalHeight*scale);const c=canvas.getContext('2d');c.drawImage(el.image,0,0,canvas.width,canvas.height);const tiny=document.createElement('canvas');tiny.width=16;tiny.height=16;const tc=tiny.getContext('2d');tc.drawImage(el.image,0,0,16,16);return analyzeSample({dataUrl:canvas.toDataURL('image/jpeg',.85),signature:signatureFromPixels(tc.getImageData(0,0,16,16).data)},0);}
  status('Hãy chọn video hoặc ảnh trước','bad');
}

el.file.addEventListener('change',()=>{const file=el.file.files?.[0];if(!file)return;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);controller.lastFrameHash=null;controller.board=null;controller.sideToMove=null;controller.fen=null;controller.events=[];el.timeline.innerHTML='<div class="muted">Chưa có dữ liệu phân tích.</div>';el.count.textContent='0 trạng thái';calibration=[];if(file.type.startsWith('video/')){currentMode='video';el.stage.className='stage has-media has-video';el.video.src=objectUrl;el.image.removeAttribute('src');el.video.addEventListener('loadedmetadata',syncOverlaySize,{once:true});status('Video đã nạp — có thể bật Auto','ok');}else{currentMode='image';el.stage.className='stage has-media has-image';el.image.src=objectUrl;el.video.pause();el.video.removeAttribute('src');el.image.onload=()=>{syncOverlaySize();status('Ảnh đã nạp','ok');};}});
el.analyze.addEventListener('click',analyzeCurrent);
el.auto.addEventListener('click',()=>{if(autoTimer){clearInterval(autoTimer);autoTimer=null;el.auto.textContent='Auto: Tắt';return;}if(currentMode!=='video')return status('Auto chỉ dùng cho video','bad');autoTimer=setInterval(()=>{if(!el.video.paused&&!el.video.ended)analyzeCurrent();},2500);el.auto.textContent='Auto: Bật';status('Auto analysis mỗi ~2.5 giây khi video chạy','ok');});
el.calibrate.addEventListener('click',()=>{calibrating=true;calibration=[];status('Click 4 góc theo thứ tự: trái-trên → phải-trên → phải-dưới → trái-dưới','busy');drawCalibration();});
el.reset.addEventListener('click',()=>{calibration=[];syncOverlaySize();status('Đã reset calibration theo toàn khung','ok');});
el.overlay.addEventListener('click',e=>{if(!calibrating)return;const r=el.overlay.getBoundingClientRect();calibration.push({x:(e.clientX-r.left)*el.overlay.width/r.width,y:(e.clientY-r.top)*el.overlay.height/r.height});drawCalibration();if(calibration.length===4){calibrating=false;status('Đã lưu 4 góc bàn cờ','ok');}});
el.fenAnalyze.addEventListener('click',()=>{try{const {board,sideToMove}=parseFen(el.fen.value.trim());const lines=analyzePosition(board,sideToMove,{depth:3,multiPv:3,maxNodes:60000});renderBoard(serializeFen(board,sideToMove));renderMoves(lines);drawCalibration();status('Đã phân tích FEN bằng engine local','ok');}catch(e){status(`FEN lỗi: ${e.message}`,'bad');}});
el.explain.addEventListener('click',async()=>{if(!lastLines.length)return status('Chưa có dòng engine để giải thích','bad');status('Đang tạo giải thích tiếng Việt…','busy');const body={fen:el.fen.value,lines:lastLines.map(l=>({move:moveToIccs(l.move),score:l.score,pv:l.pv.slice(0,6).map(moveToIccs)}))};try{const r=await fetch('/api/explain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.message||d.error);el.explanation.textContent=d.text;status('Đã giải thích','ok');}catch(e){status(`Không giải thích được: ${e.message}`,'bad');}});

el.fen.value=START_FEN;renderBoard(START_FEN);renderMoves(analyzePosition(parseFen(START_FEN).board,'red',{depth:2,multiPv:3,maxNodes:25000}));
fetch('/api/health').then(r=>r.json()).then(h=>status(h.ai?'Worker online · Workers AI sẵn sàng':'Worker online · AI binding chưa sẵn sàng',h.ai?'ok':'bad')).catch(()=>{});
