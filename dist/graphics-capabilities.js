// Quality choice depends on required graphics features, never on a device name.
export function highCapabilityReport({maxTextureSize=0,maxRenderbufferSize=0,fragmentSamplers=0,hdr=false}={}){
 const limit=Math.min(maxTextureSize,maxRenderbufferSize);
 const reasons=[];
 if(limit<2048)reasons.push('High needs support for larger graphics surfaces.');
 if(fragmentSamplers<8)reasons.push('High needs more simultaneous texture support.');
 if(!hdr)reasons.push('High needs HDR lighting support.');
 return {supported:reasons.length===0,reasons,textureLimit:limit,hdr,fragmentSamplers};
}
