import test from 'node:test';
import assert from 'node:assert/strict';
import { signatureFromPixels } from './video.js';

test('frame signature is stable for identical RGBA pixels and changes for visible difference',()=>{
  const a=new Uint8ClampedArray([0,0,0,255, 255,255,255,255]);
  const b=new Uint8ClampedArray(a);
  const c=new Uint8ClampedArray([0,0,0,255, 0,0,0,255]);
  assert.equal(signatureFromPixels(a),signatureFromPixels(b));
  assert.notEqual(signatureFromPixels(a),signatureFromPixels(c));
});
