"""Extract the existing Model 3 seat's connected surfaces into an articulated GLB.
Run node scripts/inspect-seats.cjs first. No new geometry or external assets.
"""
import json, struct
from pathlib import Path
import numpy as np
root = Path(__file__).resolve().parents[1]
source=json.loads((root / '.cache/tesla-seat-parts.json').read_text())
# The tall side trim belongs to the backrest, not the stationary cushion.
selection={54:{0:('hinge','back'),1:('under-cushion','base'),2:('rear-shell','back'),4:('hinge','back')},64:{0:('base','base')},74:{0:('bolster','back'),1:('under-cushion','base'),2:('leather','base'),4:('leather','back'),5:('rear-shell','back'),6:('insert','base'),10:('insert','back'),14:('insert','back')}}
materials=[{'name':n,'pbrMetallicRoughness':{'baseColorFactor':c+[1],'metallicFactor':0,'roughnessFactor':.64}} for n,c in [('leather',[.75,.74,.70]),('insert',[.76,.75,.71]),('bolster',[.64,.63,.60]),('rear-shell',[.035,.040,.047]),('under-cushion',[.047,.052,.060]),('hinge',[.075,.082,.09]),('base',[.045,.050,.060])]]
g={'asset':{'version':'2.0','generator':'Model 3 front-seat surface extraction','copyright':'See credits.html for original authors and CC BY 4.0 attribution.'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'FrontSeat','children':[1]},{'name':'SeatCarriage','children':[2,3]},{'name':'SeatBase','children':[]},{'name':'SeatBackPivot','translation':[0,.164,-.13],'children':[]}],'meshes':[],'materials':materials,'buffers':[],'bufferViews':[],'accessors':[]}
chunks=bytearray()
def accessor(arr,typ,component):
    while len(chunks)%4:chunks.append(0)
    index=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(chunks),'byteLength':arr.nbytes});chunks.extend(arr.tobytes());item={'bufferView':index,'componentType':component,'count':len(arr),'type':typ}
    if typ=='VEC3':item.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
    g['accessors'].append(item);return len(g['accessors'])-1
for p in source:
    if p['id'] not in selection:continue
    pos=np.array(p['attrs']['POSITION']).reshape(-1,3);tris=np.array(p['indices']).reshape(-1,3)
    _,weld=np.unique((pos*10000).round().astype(int),axis=0,return_inverse=True);parent=list(range(int(weld.max())+1))
    def find(x):
        while x!=parent[x]:parent[x]=parent[parent[x]];x=parent[x]
        return x
    for a,b,c in weld[tris]:parent[find(b)]=find(a);parent[find(c)]=find(a)
    roots=np.array([find(int(a)) for a in weld[tris[:,0]]])
    for k,r in enumerate(sorted(set(roots))):
        if k not in selection[p['id']]:continue
        mat,group=selection[p['id']][k];tt=tris[roots==r];ids,inv=np.unique(tt.flatten(),return_inverse=True)
        pts=pos[ids];points=np.column_stack([pts[:,0]+.4705,pts[:,2]+.404,pts[:,1]-.21])
        if group=='back':points-=np.array([0,.164,-.13])
        normals=np.array(p['attrs']['NORMAL']).reshape(-1,3)[ids][:,[0,2,1]]
        # Swapping up/forward reflects handedness, so reverse the triangle winding.
        indices=inv.reshape(-1,3)[:,[0,2,1]].flatten().astype('<u2')
        attrs={'POSITION':accessor(points.astype('<f4'),'VEC3',5126),'NORMAL':accessor(normals.astype('<f4'),'VEC3',5126)}
        if 'TEXCOORD_0' in p['attrs']:attrs['TEXCOORD_0']=accessor(np.array(p['attrs']['TEXCOORD_0']).reshape(-1,2)[ids].astype('<f4'),'VEC2',5126)
        g['meshes'].append({'name':f'{mat}-{p["id"]}-{k}','primitives':[{'attributes':attrs,'indices':accessor(indices,'SCALAR',5123),'material':next(i for i,m in enumerate(materials) if m['name']==mat)}]})
        g['nodes'].append({'name':f'{mat}-{p["id"]}-{k}','mesh':len(g['meshes'])-1});g['nodes'][3 if group=='back' else 2]['children'].append(len(g['nodes'])-1)
while len(chunks)%4:chunks.append(0)
g['buffers']=[{'byteLength':len(chunks)}];js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
raw=struct.pack('<III',0x46546c67,2,28+len(js)+len(chunks))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(chunks),b'BIN\0')+chunks
(root / 'public/models/tesla-front-seat.glb').write_bytes(raw)
print('Extracted',len(g['meshes']),'surfaces,',len(raw),'bytes')
