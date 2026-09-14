const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cache = path.join(root, '.cache');
fs.mkdirSync(cache, { recursive: true });
const raw=fs.readFileSync(path.join(root, 'public/models/tesla-model-3.glb'));
const len=raw.readUInt32LE(12), gltf=JSON.parse(raw.subarray(20,20+len).toString()), bin=raw.subarray(28+len);
const scope={module:{exports:{}},require, __dirname: root+'/node_modules/three/examples/jsm/libs/draco',process,console,Buffer,TextDecoder,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(path.join(root, 'node_modules/three/examples/jsm/libs/draco/draco_decoder.js'),'utf8'),scope);
(async()=>{
const d=await scope.DracoDecoderModule(); const decoder=new d.Decoder();
const output=[];
for (let meshId of [54,64,74]) {
 const prim=gltf.meshes[meshId].primitives[0],ext=prim.extensions.KHR_draco_mesh_compression,bv=gltf.bufferViews[ext.bufferView],bytes=bin.subarray(bv.byteOffset,bv.byteOffset+bv.byteLength);
 const buffer=new d.DecoderBuffer();buffer.Init(bytes,bytes.length);const mesh=new d.Mesh();const result=decoder.DecodeBufferToMesh(buffer,mesh);if(!result.ok())throw Error(result.error_msg());
 const attrs={};for(const [name,uid] of Object.entries(ext.attributes)){ const attr=decoder.GetAttributeByUniqueId(mesh,uid), data=new d.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(mesh,attr,data);attrs[name]=Array.from({length:data.size()},(_,i)=>data.GetValue(i));d.destroy(data); }
 const idx=new d.DracoInt32Array(), indices=[]; for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,idx);indices.push(idx.GetValue(0),idx.GetValue(1),idx.GetValue(2));}d.destroy(idx);
 output.push({id:meshId,name:gltf.meshes[meshId].name,attrs,indices});d.destroy(mesh);d.destroy(buffer);
}
fs.writeFileSync(path.join(cache, 'tesla-seat-parts.json'),JSON.stringify(output));d.destroy(decoder);console.log('Decoded candidates',output.map(m=>[m.id,m.indices.length/3]));
})();
