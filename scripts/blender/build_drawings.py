# SPDX-License-Identifier: GPL-3.0-or-later
"""Run with Blender --background --factory-startup --python-exit-code 1 --python this.py -- payload.json output-dir."""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from drawing_sheets import generate_sheets


def line(name, points, material):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=.08;curve.bevel_resolution=0
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for target,point in zip(spline.points,points): target.co=(*point,1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
    obj['reference_only']=True
    return obj


def point(p): return (p['x'],p['y'],p['z'])


def material(name,color):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);return mat


def main():
    args=sys.argv[sys.argv.index('--')+1:]
    payload=json.loads(Path(args[0]).read_text());output=Path(args[1]);output.mkdir(parents=True,exist_ok=True)
    if payload.get('version')!=2 or payload.get('engine')!='blender' or payload.get('units')!='inches' or payload.get('draft') is not True:
        raise ValueError('Unsupported drawing payload')
    if not payload.get('surfaces') or len(payload['surfaces'])>3000: raise ValueError('Invalid geometry size')
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.name='ISO';scene.unit_settings.system='IMPERIAL';scene.unit_settings.scale_length=.0254;scene.unit_settings.length_unit='INCHES'
    scene['request_id']=payload['id'];scene['draft']=True;scene['source_updated_at']=payload.get('sourceUpdatedAt','')
    measured=material('Measured surfaces',(.55,.65,.72));verify=material('VERIFY - unresolved dimensions',(.95,.45,.08));steel=material('Rail and post centerline references',(.12,.16,.2))
    text=bpy.data.texts.new('KIW measurement snapshot.json');text.write(json.dumps(payload,indent=2))
    for s in payload['surfaces']:
        vertices=[point(p) for p in s['corners']];faces=[(0,1,2),(0,2,3)]
        if s.get('riseDepth',0)>0:
            vertices += [(vertices[0][0],vertices[0][1],vertices[0][2]-s['riseDepth']),(vertices[3][0],vertices[3][1],vertices[3][2]-s['riseDepth'])]
            faces += [(4,0,3,5)]
        mesh=bpy.data.meshes.new(s['label']);mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new(s['label'],mesh);scene.collection.objects.link(obj);obj.data.materials.append(verify if s['provisional'] else measured)
        obj['measurements']=json.dumps(s);obj['provisional']=bool(s['provisional'])
    for p in payload['posts']:
        obj=line(p['label'],[point(p['base']),point(p['top'])],verify if p['provisional'] else steel)
        obj['measurements']=json.dumps(p)
        text=bpy.data.curves.new(p['label']+' label','FONT');text.body=p['label'];text.size=2
        label=bpy.data.objects.new(p['label']+' label',text);scene.collection.objects.link(label);label.location=Vector(point(p['top']))+Vector((1,0,1));label.rotation_euler=(math.pi/2,0,0)
    posts=[p for p in payload['posts'] if p.get('pointType')=='railing_post']
    for i,p in enumerate(posts):
        q=next((q for q in posts[i+1:] if q['segment']==p['segment'] and q['side']==p['side']),None)
        if q:line(f"Top rail reference {p['label']}-{q['label']}",[point(p['top']),point(q['top'])],verify if p['provisional'] or q['provisional'] else steel)
    for t in payload['transitions']:line(t['label'],[point(p) for p in t['points']],verify if t['provisional'] else steel)
    for i,w in enumerate(payload.get('walls',[])):line(f'Wall boundary {i+1}',[point(p) for p in w['points']],measured)
    coords=[Vector(point(p)) for s in payload['surfaces'] for p in s['corners']]+[Vector(point(p['top'])) for p in payload['posts']]
    low=Vector(tuple(min(p[i] for p in coords) for i in range(3)));high=Vector(tuple(max(p[i] for p in coords) for i in range(3)));center=(low+high)/2;extent=max(50,(high-low).length)
    for name,direction in [('ISO',(1,-1,1)),('Plan',(0,0,1)),('Side',(0,-1,0))]:
        camera=bpy.data.cameras.new(name+' camera');camera.type='ORTHO';camera.ortho_scale=extent*1.2;camera.clip_end=extent*10
        obj=bpy.data.objects.new(name+' camera',camera);scene.collection.objects.link(obj);obj.location=center+Vector(direction).normalized()*extent*2;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
        target=scene if name=='ISO' else bpy.data.scenes.new(name)
        if target!=scene:
            for item in list(scene.objects):target.collection.objects.link(item)
            target.unit_settings.system='IMPERIAL';target.unit_settings.scale_length=.0254;target.unit_settings.length_unit='INCHES'
        target.camera=obj;target.render.resolution_x=1600;target.render.resolution_y=1100
    scene.world.color=(.8,.8,.8)
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(output/'railing.blend'),check_existing=False)
    count=generate_sheets(payload,output)
    (output/'measurements.json').write_text(json.dumps(payload,indent=2))
    (output/'manifest.json').write_text(json.dumps({'engine':'blender','blenderVersion':bpy.app.version_string,'draft':True,'request':payload['id'],'sheets':count,'surfaces':len(payload['surfaces']),'posts':len(payload['posts'])},indent=2))
    print(f'KIW drawing built: {count} sheets, {len(payload["surfaces"])} surfaces, {len(payload["posts"])} posts')


if __name__=='__main__': main()
