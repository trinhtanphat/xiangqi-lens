import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findProhibited } from './license-guard.mjs';

test('license guard flags bundled unapproved model and NNUE files', async()=>{
  const root=await mkdtemp(join(tmpdir(),'xql-')); await mkdir(join(root,'models'));
  await writeFile(join(root,'models','bad.nnue'),'x'); await writeFile(join(root,'models','bad.onnx'),'x');
  const found=await findProhibited(root);
  assert.deepEqual(found.map(x=>x.replaceAll('\\','/')).sort(),['models/bad.nnue','models/bad.onnx']);
});

test('license guard ignores documentation and ordinary source files', async()=>{
  const root=await mkdtemp(join(tmpdir(),'xql-')); await writeFile(join(root,'README.md'),'mentions .onnx and .nnue'); await writeFile(join(root,'app.js'),'ok');
  assert.deepEqual(await findProhibited(root),[]);
});
