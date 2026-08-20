import { parseVisionCandidate } from '../vision/schema.js';

function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
}

async function bodyJson(request){
  try { return await request.json(); }
  catch { return null; }
}

export function createApiHandler({aiRunner=null,buildId='dev',maxImageChars=8_000_000}={}){
  return async function handle(request){
    const url=new URL(request.url);
    if(url.pathname==='/api/health'){
      if(request.method!=='GET') return json({error:'method_not_allowed'},405,{allow:'GET'});
      return json({ok:true,service:'xiangqi-lens',buildId,ai:Boolean(aiRunner)});
    }
    if(url.pathname==='/api/recognize'){
      if(request.method!=='POST') return json({error:'method_not_allowed'},405,{allow:'POST'});
      const body=await bodyJson(request);
      if(!body||typeof body.imageDataUrl!=='string'||!body.imageDataUrl.startsWith('data:image/')) return json({error:'invalid_request',message:'imageDataUrl is required'},400);
      if(body.imageDataUrl.length>maxImageChars) return json({error:'image_too_large'},413);
      if(!aiRunner?.recognize) return json({error:'ai_unavailable'},503);
      try{
        const raw=await aiRunner.recognize({imageDataUrl:body.imageDataUrl,previousFen:body.previousFen||null,sideToMove:body.sideToMove||null});
        return json({candidate:parseVisionCandidate(raw)});
      }catch(error){
        return json({error:'recognition_failed',message:error instanceof Error?error.message:String(error)},422);
      }
    }
    if(url.pathname==='/api/explain'){
      if(request.method!=='POST') return json({error:'method_not_allowed'},405,{allow:'POST'});
      const body=await bodyJson(request);
      if(!body||typeof body.fen!=='string'||!Array.isArray(body.lines)) return json({error:'invalid_request'},400);
      if(!aiRunner?.explain) return json({error:'ai_unavailable'},503);
      try { return json({text:await aiRunner.explain({fen:body.fen,lines:body.lines})}); }
      catch(error){ return json({error:'explain_failed',message:error instanceof Error?error.message:String(error)},502); }
    }
    return null;
  };
}
