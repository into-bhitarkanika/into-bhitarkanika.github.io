"""Bake the credited CC0 coastal scan into a compact, repeatable High asset library.

Source geometry/textures remain in .sites-runtime/photographic-forest-source.
No network is needed here. Development only: numpy, scipy, fast-simplification.
The application reads the baked buffers; it does not generate these tree shapes.
"""
import json,sys,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'.sites-runtime/mesh-tools'))
import fast_simplification as simplify
SOURCE=BASE/'.sites-runtime/photographic-forest-source'
OUT=BASE/'dist/assets/high/estuary';OUT.mkdir(parents=True,exist_ok=True)
g=json.loads((BASE/'.sites-runtime/island_tree_01.gltf').read_text());blob=(SOURCE/'island_tree_01.bin').read_bytes()
def attribute(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 return np.frombuffer(blob,dtype={5126:np.float32,5125:np.uint32,5123:np.uint16}[a['componentType']],count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n).copy()
def primitive(i):
 p=g['meshes'][0]['primitives'][i]
 return {'position':attribute(p['attributes']['POSITION']),'normal':attribute(p['attributes']['NORMAL']),'uv':attribute(p['attributes']['TEXCOORD_0']),'index':attribute(p['indices']).reshape(-1,3)}
trunk,leaf,branch=[primitive(i)for i in range(3)]
def structural_branches(source,keep=220):
 f=source['index'];row=np.concatenate([f[:,0],f[:,1],f[:,2]]);col=np.concatenate([f[:,1],f[:,2],f[:,0]])
 count,labels=connected_components(coo_matrix((np.ones(len(row)),(row,col)),shape=(len(source['position']),len(source['position']))),directed=False)
 low=np.full((count,3),np.inf);high=np.full((count,3),-np.inf);np.minimum.at(low,labels,source['position']);np.maximum.at(high,labels,source['position'])
 spans=np.linalg.norm(high-low,axis=1);threshold=max(.19,np.sort(spans)[max(0,count-keep)])
 faces=f[spans[labels[f[:,0]]]>=threshold];ids,inverse=np.unique(faces,return_inverse=True)
 print('Retain structural boughs',count,'->',len(np.unique(labels[ids])),'threshold',threshold,flush=True)
 return {'position':source['position'][ids],'normal':source['normal'][ids],'uv':source['uv'][ids],'index':inverse.reshape(-1,3).astype('u4')}
branch=structural_branches(branch)
def decimate(source,count,preserve=True):
 points,faces=simplify.simplify(source['position'],source['index'].astype(np.int32),target_count=count,agg=7,preserve_border=preserve)
 _,nearest=cKDTree(source['position']).query(points)
 return {'position':points.astype('f4'),'normal':source['normal'][nearest].copy(),'uv':source['uv'][nearest].copy(),'index':faces.astype('u4')}
print('Optimizing photographed trunk and branch skeleton',flush=True)
wood=decimate(trunk,3400);coarse=decimate(trunk,850,False);bough=decimate(branch,4400,False);bough_far=decimate(structural_branches(branch,36),850,False)
# Exported source contains exactly 21 vertices per disconnected leaf. Use its
# true photographed UV envelope and least-squares surface plane, preserving the
# source's irregular crown arrangement instead of inventing random leaf blobs.
cache=BASE/'.sites-runtime/tree-components.npz'
if cache.exists(): labels=np.load(cache)['labels']
else:
 f=leaf['index'];row=np.concatenate([f[:,0],f[:,1],f[:,2]]);col=np.concatenate([f[:,1],f[:,2],f[:,0]])
 _,labels=connected_components(coo_matrix((np.ones(len(row)),(row,col)),shape=(len(leaf['position']),len(leaf['position']))),directed=False)
groups=np.argsort(labels,kind='stable').reshape(-1,21)
leaf_positions=leaf['position'][groups];leaf_uv=leaf['uv'][groups]
centers=leaf_positions.mean(axis=1)
orders=np.random.default_rng(938721).permutation(len(groups))
def foliage(stride,enlarge):
 ids=orders[::stride];positions=[];normals=[];uvs=[];faces=[]
 for k in ids:
  points=leaf_positions[k];tex=leaf_uv[k];mn=tex.min(axis=0);mx=tex.max(axis=0)
  fit=np.linalg.lstsq(np.column_stack([tex,np.ones(21)]),points,rcond=None)[0]
  uv=np.array([[mn[0],mn[1]],[mx[0],mn[1]],[mx[0],mx[1]],[mn[0],mx[1]]])
  p=np.column_stack([uv,np.ones(4)])@fit;c=points.mean(axis=0)
  p=c+(p-c)*enlarge
  normal=leaf['normal'][groups[k]].mean(axis=0);normal/=max(np.linalg.norm(normal),1e-7)
  off=len(positions)*4;faces.extend([[off,off+1,off+2],[off,off+2,off+3]])
  positions.append(p);uvs.append(uv);normals.append(np.tile(normal,(4,1)))
 return {'position':np.concatenate(positions).astype('f4'),'normal':np.concatenate(normals).astype('f4'),'uv':np.concatenate(uvs).astype('f4'),'index':np.asarray(faces,dtype='u4')}
near=foliage(3,2.1);mid=foliage(10,3.9);far=foliage(26,6.3)
def transform(source,scale,bend,twist,phase):
 output={key:value.copy()for key,value in source.items()};p=output['position'];y=p[:,1];a=twist*np.maximum(y-.8,0)+phase
 x=p[:,0]*np.cos(a)-p[:,2]*np.sin(a);z=p[:,0]*np.sin(a)+p[:,2]*np.cos(a)
 p[:,0]=x*scale[0]+bend*(y/5)**2;p[:,1]=y*scale[1];p[:,2]=z*scale[2]
 n=output['normal'];nx=n[:,0]*np.cos(a)-n[:,2]*np.sin(a);nz=n[:,0]*np.sin(a)+n[:,2]*np.cos(a)
 n[:,0]=nx/scale[0];n[:,1]/=scale[1];n[:,2]=nz/scale[2];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-6)
 return output
variants=[('Broad creek crown',[2.35,2.12,2.2],.8,.045,.0),('Low river veteran',[2.65,1.65,2.55],1.3,-.055,.45),('Leaning canopy',[2.3,2.45,2.1],2.6,.065,-.35),('Dense shoreline sapling',[1.0,.88,1.1],.2,-.06,.2),('Tall broadleaf elder',[2.45,2.85,2.6],-.9,.035,.9),('Asymmetric estuary crown',[2.8,2.04,1.95],1.9,-.035,1.5)]
spec={'version':1,'source':'Poly Haven Island Tree 01, CC0; optimized and reshaped for an authored mangrove setting','models':[]}
for variant,(name,scale,bend,twist,phase)in enumerate(variants):
 chunks=[];model={'name':name,'url':f'crown-{variant}.bin','geometries':{}};offset=0
 for key,geometry in {'wood':wood,'coarse':coarse,'branch':bough,'coarseBranch':bough_far,'near':near,'mid':mid,'far':far}.items():
  transformed=transform(geometry,scale,bend,twist,phase);attrs={}
  for attr,array in transformed.items():
   data=array.astype('<u4' if attr=='index' else '<f4').tobytes();attrs[attr]={'offset':offset,'count':array.size,'itemSize':array.shape[1] if attr!='index' else 1};chunks.append(data);offset+=len(data)
  model['geometries'][key]=attrs
 binary=b''.join(chunks);(OUT/model['url']).write_bytes(binary);model['bytes']=len(binary);model['sha256']=hashlib.sha256(binary).hexdigest();spec['models'].append(model)
 print(name,len(binary),{k:len(v['index'])for k,v in {'wood':wood,'branch':bough,'near':near,'mid':mid,'far':far}.items()},flush=True)
(OUT/'crowns.json').write_text(json.dumps(spec,separators=(',',':')))
textures={'trunk-color.jpg':'island_tree_01_diff_1k.jpg','trunk-normal.jpg':'island_tree_01_nor_gl_1k.jpg','trunk-arm.jpg':'island_tree_01_arm_1k.jpg','leaf-color.jpg':'island_tree_01_leaves_diff_1k.jpg','leaf-normal.jpg':'island_tree_01_leaves_nor_gl_1k.jpg','leaf-arm.jpg':'island_tree_01_leaves_arm_1k.jpg','leaf-alpha.png':'island-tree-leaf-alpha.png','sediment-color.jpg':'sediment-Diffuse.jpg','sediment-normal.jpg':'sediment-nor_gl.jpg','sediment-roughness.jpg':'sediment-Rough.jpg','sediment-height.jpg':'sediment-Displacement.jpg','sediment-ao.jpg':'sediment-AO.jpg'}
for dest,source in textures.items():shutil.copyfile(SOURCE/source,OUT/dest)
height=np.array(Image.open(SOURCE/'sediment-Displacement.jpg').convert('L').resize((128,128)),dtype='u1');(OUT/'sediment-relief.bin').write_bytes(height.tobytes())
print('Baked',sum(p.stat().st_size for p in OUT.iterdir()),'bytes',flush=True)
