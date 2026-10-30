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
// Deterministic bounded RANSAC for a partially visible pupil contour.
// This is a classical-DIP extension, not the neural model from the dataset paper.
function ellipseBoundarySupport(points,e){
 const ca=Math.cos(e.angle),sa=Math.sin(e.angle),bins=new Uint8Array(24),inliers=[];let error=0;
 for(const p of points){const dx=p[0]-e.cx,dy=p[1]-e.cy,u=ca*dx+sa*dy,v=-sa*dx+ca*dy,f=(u/e.rx)**2+(v/e.ry)**2-1,gradient=2*Math.hypot(u/(e.rx*e.rx),v/(e.ry*e.ry)),d=Math.abs(f)/Math.max(gradient,1e-9);
  if(d<=1.25){inliers.push(p);error+=d;const t=(Math.atan2(v/e.ry,u/e.rx)+2*Math.PI)%(2*Math.PI);bins[Math.floor(t*24/(2*Math.PI))%24]=1}
 }
 let longestGap=0,gap=0;for(let i=0;i<48;i++){gap=bins[i%24]?0:gap+1;longestGap=Math.max(longestGap,Math.min(24,gap))}
 return {inliers,supportFraction:inliers.length/Math.max(1,points.length),arcCoverage:bins.reduce((a,b)=>a+b,0)/24,maxGap:longestGap/24,supportError:error/Math.max(1,inliers.length)};
}
function fitVisiblePupilBoundary(points,area){
 const direct=fitEllipseFromBoundary(points),directQuality=ellipseRegionQuality(points,direct,area);
 const baseline=direct&&directQuality?{...direct,...directQuality,method:'least-squares',occluded:false,reconstructionEligible:true}:null;
 // Clean complete ellipses and very thin rasterized ellipses keep the direct fit.
 if(points.length<24||(directQuality&&directQuality.fitError<.035)||(direct&&direct.ry<5))return baseline;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const [x,y]of points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 const extent=Math.hypot(maxX-minX,maxY-minY);let seed=1234567,best=null;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const consider=e=>{
  if(!e||e.ry<5||e.ry/e.rx<.12||e.rx>extent||e.cx<minX-e.rx*.25||e.cx>maxX+e.rx*.25||e.cy<minY-e.ry*.5||e.cy>maxY+e.ry*.5)return;
  const fill=area/(Math.PI*e.rx*e.ry);if(fill<.7||fill>1.2)return;
  const support=ellipseBoundarySupport(points,e);
  if(support.supportFraction<.58||support.arcCoverage<.58||support.maxGap>.46)return;
  const rank=.65*support.supportFraction+.2*Math.min(1,fill)-.45*support.supportError;
  if(!best||rank>best.rank)best={ellipse:e,support,rank,fill};
 };
 consider(direct);
 for(let trial=0;trial<128;trial++){const sample=[];for(let n=0;n<6;n++)sample.push(points[Math.floor(random()*points.length)]);consider(fitEllipseFromBoundary(sample.concat(sample)))}
 if(!best)return baseline&&ellipseBoundarySupport(points,direct).supportFraction>=.8?baseline:null;
 for(let i=0;i<3;i++){const refined=fitEllipseFromBoundary(best.support.inliers);if(refined)consider(refined)}
 const {ellipse:e,support,fill}=best,occluded=fill<.94&&support.supportFraction<.97;
 if(!occluded)return baseline&&ellipseBoundarySupport(points,direct).supportFraction>=.8?baseline:null;
 // Do not replace a plausible direct ellipse unless visible arcs support a better explanation.
 if(baseline&&ellipseBoundaryError(support.inliers,e)>.03)return ellipseBoundarySupport(points,direct).supportFraction>=.8?baseline:null;
 return {...e,ratio:e.ry/e.rx,fill,fitError:ellipseBoundaryError(support.inliers,e),fitQuality:Math.exp(-support.supportError),score:.65*support.supportFraction+.2*support.arcCoverage+.15*Math.exp(-support.supportError),method:'ransac-visible-arcs',occluded:true,reconstructionEligible:false,supportFraction:support.supportFraction,arcCoverage:support.arcCoverage,supportError:support.supportError};
}
function selectedPupilMask(mask,w,h,pupil){
 const output=new Uint8Array(mask.length);if(!pupil||!Number.isInteger(pupil.componentSeed)||!mask[pupil.componentSeed])return output;
 const queue=new Int32Array(mask.length);let head=0,tail=1;queue[0]=pupil.componentSeed;output[queue[0]]=255;
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const next of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(next>=0&&mask[next]&&!output[next]){output[next]=255;queue[tail++]=next}}
 return output;
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
