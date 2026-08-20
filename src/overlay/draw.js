import { squareCenterToVideo } from './geometry.js';

export function clearOverlay(ctx,width,height){ ctx.clearRect(0,0,width,height); }

export function drawMoveArrow(ctx,move,corners,options={}){
  if(!move||!corners||corners.length!==4) return;
  const from=squareCenterToVideo(move.from,corners), to=squareCenterToVideo(move.to,corners);
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1;
  const ux=dx/len,uy=dy/len;
  const head=Number(options.headSize||18), lineWidth=Number(options.lineWidth||7);
  ctx.save();
  ctx.lineWidth=lineWidth; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=options.color||'#22d3ee'; ctx.fillStyle=options.color||'#22d3ee';
  ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x-ux*head*.65,to.y-uy*head*.65); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(to.x,to.y); ctx.lineTo(to.x-ux*head-uy*head*.55,to.y-uy*head+ux*head*.55); ctx.lineTo(to.x-ux*head+uy*head*.55,to.y-uy*head-ux*head*.55); ctx.closePath(); ctx.fill();
  ctx.restore();
}
