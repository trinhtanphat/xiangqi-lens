const VISION_MODEL='@cf/meta/llama-4-scout-17b-16e-instruct';
const VISION_PROMPT=`You are a Xiangqi board reconstruction vision system. Inspect the image and return ONLY one JSON object with keys fen, sideToMove, confidence, orientation, boardCorners, notes. Board is 9 files by 10 ranks. FEN uses r,n,b,a,k,c,p for black and uppercase for red, exactly 10 ranks, then w for red-to-move or b for black-to-move. sideToMove is red or black. confidence is 0..1. boardCorners is null or four normalized {x,y} points ordered top-left, top-right, bottom-right, bottom-left. Never invent hidden pieces; lower confidence when occluded.`;

function json(body,status=200,extra={}){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
}
function extractText(result){
  if(typeof result==='string') return result;
  if(typeof result?.response==='string') return result.response;
  if(typeof result?.result?.response==='string') return result.result.response;
  if(Array.isArray(result?.choices)&&typeof result.choices[0]?.message?.content==='string') return result.choices[0].message.content;
  return JSON.stringify(result);
}
function cleanJsonText(text){
  const t=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const i=t.indexOf('{'),j=t.lastIndexOf('}'); return i>=0&&j>i?t.slice(i,j+1):t;
}
function normalizeCandidate(raw){
  let v=raw;
  if(typeof v==='string'){try{v=JSON.parse(cleanJsonText(v));}catch{throw new Error('Workers AI did not return valid JSON');}}
  if(!v||typeof v!=='object'||typeof v.fen!=='string') throw new Error('Missing FEN in vision result');
  if(v.sideToMove!=='red'&&v.sideToMove!=='black') throw new Error('Invalid sideToMove');
  if(typeof v.confidence!=='number'||v.confidence<0||v.confidence>1) throw new Error('Invalid confidence');
  const ranks=v.fen.trim().split(/\s+/)[0].split('/'); if(ranks.length!==10) throw new Error('Invalid Xiangqi FEN rank count');
  const placement=ranks.join('');
  if((placement.match(/K/g)||[]).length!==1||(placement.match(/k/g)||[]).length!==1) throw new Error('FEN must contain one king per side');
  if(v.boardCorners!=null&&(!Array.isArray(v.boardCorners)||v.boardCorners.length!==4)) v.boardCorners=null;
  return {fen:v.fen,sideToMove:v.sideToMove,confidence:v.confidence,orientation:typeof v.orientation==='string'?v.orientation:'unknown',boardCorners:v.boardCorners??null,notes:typeof v.notes==='string'?v.notes:''};
}
function dataUrlBytes(dataUrl){const comma=dataUrl.indexOf(',');const raw=comma>=0?dataUrl.slice(comma+1):dataUrl;const bin=atob(raw);return Array.from(bin,c=>c.charCodeAt(0));}
async function recognizeWithAi(env,imageDataUrl,previousFen,sideToMove){
  if(!env?.AI?.run) throw new Error('AI binding unavailable');
  const context=previousFen?` Previous trusted FEN: ${previousFen}. Expected current side: ${sideToMove||'unknown'}.`:'';
  const prompt=VISION_PROMPT+context;
  try{
    const result=await env.AI.run(VISION_MODEL,{messages:[{role:'system',content:'Return strict JSON only.'},{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageDataUrl}}]}],response_format:{type:'json_object'}});
    return normalizeCandidate(extractText(result));
  }catch(first){
    const result=await env.AI.run(VISION_MODEL,{prompt,image:dataUrlBytes(imageDataUrl)});
    return normalizeCandidate(extractText(result));
  }
}
async function explainWithAi(env,fen,lines){
  if(!env?.AI?.run) throw new Error('AI binding unavailable');
  const result=await env.AI.run(VISION_MODEL,{messages:[{role:'system',content:'Bạn là huấn luyện viên cờ tướng. Chỉ giải thích dựa trên FEN và engine lines đã cho, ngắn gọn bằng tiếng Việt, không bịa xác suất.'},{role:'user',content:`FEN: ${fen}\nEngine lines: ${JSON.stringify(lines)}\nGiải thích best move, ý đồ, nguy cơ và phản ứng chính.`}]});
  return extractText(result);
}
function securityHeaders(type){
  return {'content-type':type,'x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'cache-control':type.startsWith('text/html')?'no-cache':'public, max-age=300'};
}
async function readJson(request){try{return await request.json();}catch{return null;}}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health'){
      if(request.method!=='GET')return json({error:'method_not_allowed'},405,{allow:'GET'});
      return json({ok:true,service:'xiangqi-lens',buildId:env?.BUILD_ID||'dev',ai:Boolean(env?.AI?.run),visionModel:VISION_MODEL});
    }
    if(url.pathname==='/api/recognize'){
      if(request.method!=='POST')return json({error:'method_not_allowed'},405,{allow:'POST'});
      const body=await readJson(request); if(!body||typeof body.imageDataUrl!=='string'||!body.imageDataUrl.startsWith('data:image/')) return json({error:'invalid_request',message:'imageDataUrl is required'},400);
      if(body.imageDataUrl.length>8_000_000)return json({error:'image_too_large'},413);
      if(!env?.AI?.run)return json({error:'ai_unavailable'},503);
      try{return json({candidate:await recognizeWithAi(env,body.imageDataUrl,body.previousFen||null,body.sideToMove||null)});}catch(error){return json({error:'recognition_failed',message:error instanceof Error?error.message:String(error)},422);}
    }
    if(url.pathname==='/api/explain'){
      if(request.method!=='POST')return json({error:'method_not_allowed'},405,{allow:'POST'});
      const body=await readJson(request);if(!body||typeof body.fen!=='string'||!Array.isArray(body.lines))return json({error:'invalid_request'},400);
      if(!env?.AI?.run)return json({error:'ai_unavailable'},503);
      try{return json({text:await explainWithAi(env,body.fen,body.lines)});}catch(error){return json({error:'explain_failed',message:error instanceof Error?error.message:String(error)},502);}
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405});
    const assets=globalThis.__XIANGQI_ASSETS__||{}; const key=url.pathname==='/'?'/':url.pathname; const asset=assets[key];
    if(!asset)return new Response('Not Found',{status:404,headers:securityHeaders('text/plain; charset=utf-8')});
    return new Response(request.method==='HEAD'?null:asset.body,{status:200,headers:securityHeaders(asset.type)});
  }
};
