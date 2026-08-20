import { stateKey } from '../core/board.js';
import { parseFen, serializeFen } from '../core/fen.js';
import { parseVisionCandidate } from '../vision/schema.js';
import { reconcileCandidate } from '../vision/reconcile.js';

export class AnalysisController {
  constructor({recognizer,engine,hashFrame,confidenceThreshold=.55,engineOptions={depth:2,multiPv:3,maxNodes:35000}}){
    this.recognizer=recognizer; this.engine=engine; this.hashFrame=hashFrame;
    this.confidenceThreshold=confidenceThreshold; this.engineOptions=engineOptions;
    this.lastFrameHash=null; this.board=null; this.sideToMove=null; this.fen=null;
    this.engineCache=new Map(); this.events=[];
  }

  analyzeTrusted(){
    const key=`${stateKey(this.board,this.sideToMove)}|${JSON.stringify(this.engineOptions)}`;
    if(!this.engineCache.has(key)) this.engineCache.set(key,this.engine(this.board,this.sideToMove,this.engineOptions));
    return this.engineCache.get(key);
  }

  async analyzeFrame(frame,timestamp=0){
    const hash=await this.hashFrame(frame);
    if(hash===this.lastFrameHash) return {status:'skipped',reason:'unchanged-frame',timestamp};
    this.lastFrameHash=hash;
    const raw=await this.recognizer(frame,{previousFen:this.fen,sideToMove:this.sideToMove});
    const candidate=parseVisionCandidate(raw);
    if(candidate.confidence<this.confidenceThreshold) return {status:'rejected',reason:'low-confidence',candidate,timestamp};
    const parsed=parseFen(candidate.fen);
    if(!this.board){
      this.board=parsed.board; this.sideToMove=candidate.sideToMove; this.fen=serializeFen(this.board,this.sideToMove);
      const lines=this.analyzeTrusted();
      const event={status:'accepted',reason:'cold-start',move:null,candidate,lines,fen:this.fen,timestamp}; this.events.push(event); return event;
    }
    const rec=reconcileCandidate(this.board,parsed.board,this.sideToMove);
    if(rec.status!=='accepted') return {...rec,candidate,timestamp,fen:this.fen};
    if(rec.move){ this.board=parsed.board; this.sideToMove=rec.nextSide; }
    this.fen=serializeFen(this.board,this.sideToMove);
    const lines=this.analyzeTrusted();
    const event={...rec,candidate,lines,fen:this.fen,timestamp}; this.events.push(event); return event;
  }
}

export async function sha256DataUrl(dataUrl){
  if(globalThis.crypto?.subtle){
    const bytes=new TextEncoder().encode(dataUrl);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  let h=2166136261; for(let i=0;i<dataUrl.length;i++){ h^=dataUrl.charCodeAt(i); h=Math.imul(h,16777619); }
  return (h>>>0).toString(16);
}
