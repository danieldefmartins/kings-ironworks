import type { Point3 } from './measure-geometry';
export function drawingProjection(view: 'side' | 'plan' | 'iso', azimuth = 0) {
  const angle = azimuth * Math.PI / 180;
  const rotate = (p: Point3) => ({ x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle), z: p.z });
  return {
    project(p: Point3): [number, number] {
      if (view === 'side') return [p.x * 6, -p.z * 6];
      if (view === 'plan') return [p.x * 6, p.y * 6];
      const q = rotate(p);
      return [(q.x + q.y) * Math.sqrt(3) / 2 * 6, (-q.x / 2 + q.y / 2 - q.z) * 6];
    },
    // Larger values are closer to this orthographic camera. Draw far faces first.
    depth(points: Point3[]) {
      return points.reduce((sum, p) => { const q = rotate(p); return sum + (view === 'plan' ? q.z : -q.x + q.y + q.z); }, 0) / points.length;
    },
  };
}

/** Hide labels belonging to surfaces behind another flight or landing. */
export function drawingPointOccluded(point: Point3, faces: Point3[][], camera: ReturnType<typeof drawingProjection>) {
  const [x,y]=camera.project(point), depth=camera.depth([point]);
  return faces.some(face => {
    for(let i=1;i<face.length-1;i++) {
      const triangle=[face[0],face[i],face[i+1]], [a,b,c]=triangle.map(camera.project);
      const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(denominator)<1e-8)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/denominator;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/denominator;
      if(u< -1e-6||v< -1e-6||u+v>1+1e-6)continue;
      const front=u*camera.depth([triangle[0]])+v*camera.depth([triangle[1]])+(1-u-v)*camera.depth([triangle[2]]);
      if(front>depth+1e-5)return true;
    }
    return false;
  });
}
