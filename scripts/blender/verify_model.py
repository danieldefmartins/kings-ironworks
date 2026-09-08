"""Blender integration check: reopened geometry must match the measurement payload."""
import json
import bpy
from mathutils import Vector
payload=json.loads(bpy.data.texts['KIW measurement snapshot.json'].as_string())
for surface in payload['surfaces']:
    obj=bpy.data.objects[surface['label']]
    for vertex,expected in zip(obj.data.vertices,surface['corners']):
        assert (vertex.co-Vector((expected['x'],expected['y'],expected['z']))).length<.0001
for post in payload['posts']:
    obj=bpy.data.objects[post['label']]
    for vertex,key in zip(obj.data.splines[0].points,('base','top')):
        expected=post[key]
        assert (Vector(vertex.co[:3])-Vector((expected['x'],expected['y'],expected['z']))).length<.0001
assert {'ISO','Plan','Side'}.issubset(bpy.data.scenes.keys())
assert abs(bpy.data.scenes['ISO'].unit_settings.scale_length-.0254)<.00001
print('PASS: saved Blender geometry, post references, cameras and inch units match the measuring payload')
