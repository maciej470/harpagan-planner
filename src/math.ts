import type { ControlPoint, ImagePoint, LatLng } from './types';
export function solveLinear(a:number[][], b:number[]):number[]{ const n=b.length; const m=a.map((r,i)=>[...r,b[i]]); for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;[m[c],m[p]]=[m[p],m[c]];if(Math.abs(m[c][c])<1e-10)throw Error('Punkty kalibracyjne są współliniowe');const q=m[c][c];for(let j=c;j<=n;j++)m[c][j]/=q;for(let r=0;r<n;r++)if(r!==c){const f=m[r][c];for(let j=c;j<=n;j++)m[r][j]-=f*m[c][j];}}return m.map(r=>r[n]); }
export function homography(points:ControlPoint[]):number[]{ if(points.length<4)throw Error('Potrzeba co najmniej 4 punktów'); const a:number[][]=[],b:number[]=[]; for(const p of points){const {x,y}=p.image,{lat,lon}=p.geo;a.push([x,y,1,0,0,0,-lon*x,-lon*y]);b.push(lon);a.push([0,0,0,x,y,1,-lat*x,-lat*y]);b.push(lat);}const normal=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>a.reduce((sum,row)=>sum+row[i]*row[j],0)));const rhs=Array.from({length:8},(_,i)=>a.reduce((sum,row,k)=>sum+row[i]*b[k],0));return [...solveLinear(normal,rhs),1]; }
export function imageToGeo(point:ImagePoint,h:number[]):LatLng{const [a,b,c,d,e,f,g,i,j]=h;const q=g*point.x+i*point.y+j;return{lon:(a*point.x+b*point.y+c)/q,lat:(d*point.x+e*point.y+f)/q};}
export function geoToImage(point:LatLng,h:number[]):ImagePoint{
  const [a,b,c,d,e,f,g,i,j]=h;
  const A=e*j-f*i,B=c*i-b*j,C=b*f-c*e,D=f*g-d*j,E=a*j-c*g,F=c*d-a*f,G=d*i-e*g,H=b*g-a*i,I=a*e-b*d;
  const q=G*point.lon+H*point.lat+I;
  if(Math.abs(q)<1e-12)throw Error('Punkt znajduje się poza odwzorowaniem');
  return{x:(A*point.lon+B*point.lat+C)/q,y:(D*point.lon+E*point.lat+F)/q};
}
export function geoDistance(a:LatLng,b:LatLng){const R=6371000,p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLon=(b.lon-a.lon)*p;const q=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
export function geometryFallback(points:LatLng[]){return points.slice();}
