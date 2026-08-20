export function captureVideoFrame(video,{maxWidth=960,quality=.82}={}){
  if(!video.videoWidth||!video.videoHeight) throw new Error('Video frame is not ready');
  const scale=Math.min(1,maxWidth/video.videoWidth);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale)); canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false}); ctx.drawImage(video,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',quality);
}

export function waitForVideoReady(video){
  if(video.readyState>=2) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const ok=()=>{cleanup();resolve();}, bad=()=>{cleanup();reject(new Error('Video failed to load'));};
    const cleanup=()=>{video.removeEventListener('loadeddata',ok);video.removeEventListener('error',bad);};
    video.addEventListener('loadeddata',ok,{once:true}); video.addEventListener('error',bad,{once:true});
  });
}

export function signatureFromPixels(data){
  let h=2166136261;
  for(let i=0;i<data.length;i+=4){
    const y=((data[i]*3+data[i+1]*6+data[i+2]) / 10)|0;
    h^=y; h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16);
}

export function captureVideoSample(video,{maxWidth=960,quality=.82,signatureSize=16}={}){
  if(!video.videoWidth||!video.videoHeight) throw new Error('Video frame is not ready');
  const scale=Math.min(1,maxWidth/video.videoWidth);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale)); canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext('2d',{alpha:false}); ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const tiny=document.createElement('canvas'); tiny.width=signatureSize; tiny.height=signatureSize;
  const tctx=tiny.getContext('2d',{alpha:false}); tctx.drawImage(video,0,0,signatureSize,signatureSize);
  const signature=signatureFromPixels(tctx.getImageData(0,0,signatureSize,signatureSize).data);
  return {dataUrl:canvas.toDataURL('image/jpeg',quality),signature,width:canvas.width,height:canvas.height};
}
