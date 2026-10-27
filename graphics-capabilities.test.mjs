import {test} from 'node:test';
import assert from 'node:assert/strict';
import {highCapabilityReport} from './dist/graphics-capabilities.js';
test('High accepts capable phones and computers based on features only',()=>{
 for(const device of ['phone','desktop'])assert.equal(highCapabilityReport({device,maxTextureSize:8192,maxRenderbufferSize:4096,fragmentSamplers:16,hdr:true}).supported,true);
});
test('High explains missing framebuffer, texture, or HDR capabilities without device assumptions',()=>{
 const report=highCapabilityReport({maxTextureSize:16384,maxRenderbufferSize:1024,fragmentSamplers:4,hdr:false});
 assert.equal(report.supported,false);assert.equal(report.reasons.length,3);assert.equal(report.textureLimit,1024);
 assert.equal(highCapabilityReport({maxTextureSize:2048,maxRenderbufferSize:2048,fragmentSamplers:8,hdr:true}).supported,true);
});
