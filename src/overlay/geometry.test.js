import test from 'node:test';
import assert from 'node:assert/strict';
import { solveHomography, projectPoint, squareCenterToVideo } from './geometry.js';

function close(a,b,eps=1e-7){ assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`); }

test('identity homography preserves points', () => {
  const pts=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const H=solveHomography(pts,pts);
  const p=projectPoint(H,{x:.25,y:.75});
  close(p.x,.25); close(p.y,.75);
});

test('homography maps a unit square to a scaled rectangle', () => {
  const src=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const dst=[{x:10,y:20},{x:210,y:20},{x:210,y:120},{x:10,y:120}];
  const H=solveHomography(src,dst);
  const p=projectPoint(H,{x:.5,y:.5});
  close(p.x,110); close(p.y,70);
});

test('perspective mapping hits all four calibration corners', () => {
  const src=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const dst=[{x:30,y:10},{x:230,y:35},{x:210,y:180},{x:5,y:160}];
  const H=solveHomography(src,dst);
  for(let i=0;i<4;i++){
    const p=projectPoint(H,src[i]); close(p.x,dst[i].x,1e-5); close(p.y,dst[i].y,1e-5);
  }
});

test('square center converts 9x10 board coordinate through calibration', () => {
  const corners=[{x:0,y:0},{x:80,y:0},{x:80,y:90},{x:0,y:90}];
  const p=squareCenterToVideo({rank:9,file:8},corners);
  close(p.x,80); close(p.y,90);
});
