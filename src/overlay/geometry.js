function solveLinear(A,b){
  const n=b.length;
  const M=A.map((row,i)=>[...row,b[i]]);
  for(let col=0;col<n;col++){
    let pivot=col;
    for(let r=col+1;r<n;r++) if(Math.abs(M[r][col])>Math.abs(M[pivot][col])) pivot=r;
    if(Math.abs(M[pivot][col])<1e-12) throw new Error('Degenerate homography calibration');
    [M[col],M[pivot]]=[M[pivot],M[col]];
    const d=M[col][col];
    for(let c=col;c<=n;c++) M[col][c]/=d;
    for(let r=0;r<n;r++){
      if(r===col) continue;
      const f=M[r][col];
      if(!f) continue;
      for(let c=col;c<=n;c++) M[r][c]-=f*M[col][c];
    }
  }
  return M.map(row=>row[n]);
}

export function solveHomography(src,dst){
  if(!Array.isArray(src)||!Array.isArray(dst)||src.length!==4||dst.length!==4) throw new Error('Homography requires four source and destination points');
  const A=[], b=[];
  for(let i=0;i<4;i++){
    const {x,y}=src[i], {x:u,y:v}=dst[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v);
  }
  const h=solveLinear(A,b);
  return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
}

export function projectPoint(H,p){
  const d=H[6]*p.x+H[7]*p.y+H[8];
  if(Math.abs(d)<1e-12) throw new Error('Point projects to infinity');
  return {x:(H[0]*p.x+H[1]*p.y+H[2])/d,y:(H[3]*p.x+H[4]*p.y+H[5])/d};
}

export function squareCenterToVideo(square,corners){
  const src=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const H=solveHomography(src,corners);
  return projectPoint(H,{x:square.file/8,y:square.rank/9});
}
