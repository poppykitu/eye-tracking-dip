// Boundary least-squares ellipse fit in normalized coordinates (no learned model).
function solveEllipseSystem(matrix, vector){
 const n=vector.length,a=matrix.map((row,i)=>[...row,vector[i]]);
 for(let col=0;col<n;col++){let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;
  if(Math.abs(a[pivot][col])<1e-10)return null;[a[pivot],a[col]]=[a[col],a[pivot]];const scale=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=scale;
  for(let row=0;row<n;row++)if(row!==col){const factor=a[row][col];for(let j=col;j<=n;j++)a[row][j]-=factor*a[col][j]}
 }
 return a.map(row=>row[n]);
}
function fitEllipseFromBoundary(points){
 if(points.length<12)return null;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const [x,y]of points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 const ox=(minX+maxX)/2,oy=(minY+maxY)/2,sx=(maxX-minX)/2,sy=(maxY-minY)/2;if(sx<1||sy<1)return null;
 const normal=Array.from({length:5},()=>Array(5).fill(0)),rhs=Array(5).fill(0);
 for(const [px,py]of points){const x=(px-ox)/sx,y=(py-oy)/sy,row=[x*x,x*y,y*y,x,y];for(let i=0;i<5;i++){rhs[i]+=row[i];for(let j=0;j<5;j++)normal[i][j]+=row[i]*row[j]}}
 const solution=solveEllipseSystem(normal,rhs);if(!solution)return null;
 const [A,B,C,D,E]=solution,det=A*C-B*B/4;if(A<=0||C<=0||det<=1e-9)return null;
 const nx=-(C*D-B*E/2)/(2*det),ny=-(A*E-B*D/2)/(2*det),level=1+A*nx*nx+B*nx*ny+C*ny*ny;
 const qx=A/(sx*sx),qy=C/(sy*sy),qxy=B/(2*sx*sy),delta=Math.hypot(qx-qy,2*qxy),low=(qx+qy-delta)/2,high=(qx+qy+delta)/2;
 if(low<=0||level<=0)return null;
 const ellipse={cx:ox+sx*nx,cy:oy+sy*ny,rx:Math.sqrt(level/low),ry:Math.sqrt(level/high),angle:.5*Math.atan2(2*qxy,qx-qy)+Math.PI/2};
 if(!Object.values(ellipse).every(Number.isFinite))return null;
 return ellipse;
}
function ellipseBoundaryError(points,ellipse){const ca=Math.cos(ellipse.angle),sa=Math.sin(ellipse.angle);let error=0;for(const [x,y]of points){const dx=x-ellipse.cx,dy=y-ellipse.cy,u=ca*dx+sa*dy,v=-sa*dx+ca*dy;error+=Math.abs(Math.hypot(u/ellipse.rx,v/ellipse.ry)-1)}return error/Math.max(1,points.length)}
function ellipseRegionQuality(points,ellipse,area){
 if(!ellipse||ellipse.rx<4||ellipse.ry<1.2)return null;
 const ratio=ellipse.ry/ellipse.rx,fill=area/(Math.PI*ellipse.rx*ellipse.ry),error=ellipseBoundaryError(points,ellipse);
 if(ratio<.12||ratio>1.001||fill<.5||fill>1.8||error>.22)return null;
 return {ratio,fill,fitError:error,fitQuality:Math.exp(-6*error),score:.8*Math.exp(-6*error)+.2*Math.exp(-Math.abs(Math.log(fill)))};
}
function ellipseExteriorBackground(mask,w,h,roi={x:0,y:0,right:w,bottom:h}){
 const outside=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let head=0,tail=0;
 const add=(x,y)=>{const p=y*w+x;if(!mask[p]&&!outside[p]){outside[p]=1;queue[tail++]=p}};
 for(let x=roi.x;x<roi.right;x++){add(x,roi.y);add(x,roi.bottom-1)}for(let y=roi.y;y<roi.bottom;y++){add(roi.x,y);add(roi.right-1,y)}
 while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);if(x>roi.x)add(x-1,y);if(x<roi.right-1)add(x+1,y);if(y>roi.y)add(x,y-1);if(y<roi.bottom-1)add(x,y+1)}
 return outside;
}
function ellipsePupilComponents(mask,w,h){
 const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),outside=ellipseExteriorBackground(mask,w,h);let best=null;
 for(let seed=0;seed<mask.length;seed++){
  if(!mask[seed]||seen[seed])continue;
  let head=0,tail=1,area=0,perimeter=0,touches=false;const boundary=[];queue[0]=seed;seen[seed]=1;
  while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);area++;let edge=false;if(x===0||y===0||x===w-1||y===h-1)touches=true;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h){perimeter++;edge=true;continue}const next=ny*w+nx;if(!mask[next]){perimeter++;if(outside[next])edge=true;continue}if(!seen[next]){seen[next]=1;queue[tail++]=next}}
   if(edge)boundary.push([x,y]);
  }
  if(touches||area<Math.max(16,mask.length*.0015)||area>mask.length*.15)continue;
  const ellipse=fitEllipseFromBoundary(boundary),quality=ellipseRegionQuality(boundary,ellipse,area);if(!quality||ellipse.rx*2<.08*Math.min(w,h))continue;
  quality.score=.7*quality.fitQuality+.15*Math.exp(-Math.abs(Math.log(quality.fill)))+.15*Math.min(1,area/(mask.length*.018));
  if(!best||quality.score>best.score)best={...ellipse,...quality,roundness:4*Math.PI*area/(perimeter*perimeter),area};
 }
 return best;
}
