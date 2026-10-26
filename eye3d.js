// Orthographic 3D sphere rendering. Direction is illustrative, derived from 2D.
const eye3DCanvas=document.getElementById('eye3dCanvas'),eye3DCtx=eye3DCanvas.getContext('2d');
const eye3DState={neutral:null,yaw:0,pitch:0,lastFrame:0,animation:0,signal:false,source:'neutral'};
const eye3DGeometry={width:640,height:380,cx:320,cy:190,radius:139,pixels:[]};
const eye3DClamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const eye3DDeg=Math.PI/180;
for(let y=0;y<eye3DGeometry.height;y++)for(let x=0;x<eye3DGeometry.width;x++){
 const nx=(x-eye3DGeometry.cx)/eye3DGeometry.radius,ny=(eye3DGeometry.cy-y)/eye3DGeometry.radius,q=nx*nx+ny*ny;
 if(q>1)continue;const nz=Math.sqrt(1-q),light=Math.max(0,(-.35*nx+.45*ny+nz)/1.15),spec=Math.pow(Math.max(0,(-.18*nx+.24*ny+nz)/1.044),65);
 eye3DGeometry.pixels.push({index:(y*eye3DGeometry.width+x)*4,nx,ny,nz,shade:.22+.74*light,spec});
}
function syncEye3DControls(){const reconstructed=document.getElementById('eye3dMode').value==='reconstruct',follow=document.getElementById('eye3dFollow').checked;document.getElementById('eye3dFollow').disabled=reconstructed;document.getElementById('eye3dYaw').disabled=reconstructed||follow;document.getElementById('eye3dPitch').disabled=reconstructed||follow;eye3DState.lastFrame=0;renderEye3D(performance.now(),true)}
function clearEye3DNeutral(){eye3DState.neutral=null;eye3DState.yaw=0;eye3DState.pitch=0;eye3DState.signal=false;eye3DState.source='neutral'}
function setEye3DNeutral(){if(!gazeObservation||!cameraStream)return;eye3DState.neutral=[...gazeObservation];eye3DState.yaw=0;eye3DState.pitch=0;renderEye3D(performance.now(),true)}
function getEye3DTarget(){
 if(document.getElementById('eye3dMode').value==='reconstruct'){
  if(!eyeReconstruction.model)return {yaw:0,pitch:0,signal:false,source:'unfitted'};
  const latest=eyeReconstruction.latest,normal=latest?reconstructionDirection(latest.pupil,latest.w,latest.h):null;
  if(!normal)return {yaw:eye3DState.yaw,pitch:eye3DState.pitch,signal:false,source:'reconstruction-lost'};
  return {yaw:Math.atan2(normal[0],normal[2])/eye3DDeg,pitch:Math.asin(eye3DClamp(normal[1],-1,1))/eye3DDeg,signal:true,source:'reconstructed'};
 }
 if(!document.getElementById('eye3dFollow').checked)return {yaw:Number(document.getElementById('eye3dYaw').value),pitch:Number(document.getElementById('eye3dPitch').value),signal:true,source:'manual'};
 if(!cameraStream||!gazeObservation)return {yaw:eye3DState.yaw,pitch:eye3DState.pitch,signal:false,source:'lost'};
 if(gazeModel&&gazeSmooth){const neutral=eye3DState.neutral?mapGaze(gazeModel,eye3DState.neutral):[.5,.5];return {yaw:eye3DClamp((gazeSmooth[0]-neutral[0])*70,-40,40),pitch:eye3DClamp((neutral[1]-gazeSmooth[1])*50,-30,30),signal:true,source:'calibrated2d'}}
 const roi=getGlassesROI(1000,1000),neutral=eye3DState.neutral||[(roi.x+roi.right)/2000,(roi.y+roi.bottom)/2000];
 return {yaw:eye3DClamp((gazeObservation[0]-neutral[0])/Math.max(.1,(roi.right-roi.x)/1000)*90,-40,40),pitch:eye3DClamp((neutral[1]-gazeObservation[1])/Math.max(.1,(roi.bottom-roi.y)/1000)*70,-30,30),signal:true,source:'pupil2d'};
}
function eye3DRotate(point,yaw,pitch){const [x,y,z]=point,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),py=y*cp+z*sp,pz=-y*sp+z*cp;return [x*cy+pz*sy,py,-x*sy+pz*cy]}
function eye3DProject(point){return [eye3DGeometry.cx+point[0]*eye3DGeometry.radius,eye3DGeometry.cy-point[1]*eye3DGeometry.radius]}
function drawEye3D(yaw,pitch,orbit,brightness,signal,model=null){
 const ctx=eye3DCtx,{width,height,pixels}=eye3DGeometry,image=ctx.createImageData(width,height);for(let i=3;i<image.data.length;i+=4)image.data[i]=255;
 const angle=(yaw+orbit)*eye3DDeg,vertical=pitch*eye3DDeg,direction=eye3DRotate([0,0,1],angle,vertical),right=[Math.cos(angle),0,-Math.sin(angle)],up=[direction[1]*right[2],direction[2]*right[0]-direction[0]*right[2],-direction[1]*right[0]];
 const visibility=signal?1:.48,pupilRatio=model?eye3DClamp(model.pupilRadius/model.radius,.03,.65):.126,irisRatio=Math.min(.8,pupilRatio*2.85),pupilCos=Math.sqrt(1-pupilRatio*pupilRatio),irisCos=Math.sqrt(1-irisRatio*irisRatio);
 for(const pixel of pixels){const {index,nx,ny,nz,shade,spec}=pixel,dot=nx*direction[0]+ny*direction[1]+nz*direction[2];let r=176,g=181,b=172;
  if(dot>irisCos){
   if(dot>pupilCos){r=3;g=5;b=6}
   else{const tx=nx*right[0]+nz*right[2],ty=nx*up[0]+ny*up[1]+nz*up[2],a=Math.atan2(ty,tx),radial=Math.sqrt(Math.max(0,(1-dot)/Math.max(.001,1-irisCos))),striations=.72+.2*Math.sin(a*74+radial*32)+.1*Math.sin(a*21-radial*53),edge=radial>.9?.55:1;r=102*striations*edge;g=71*striations*edge;b=34*striations*edge}
  }
  const highlight=spec*(dot>irisCos?55:12),light=brightness*visibility;image.data[index]=Math.min(255,(r*shade+highlight)*light);image.data[index+1]=Math.min(255,(g*shade+highlight)*light);image.data[index+2]=Math.min(255,(b*shade+highlight)*light);
 }
 ctx.putImageData(image,0,0);
 if(document.getElementById('eye3dGrid').checked){
  ctx.strokeStyle=signal?'rgba(65,104,109,.38)':'rgba(45,60,64,.28)';ctx.lineWidth=.7;
  const drawCurve=points=>{ctx.beginPath();let active=false;for(const p of points){const q=eye3DRotate(p,angle,vertical);if(q[2]<.015){active=false;continue}const [x,y]=eye3DProject(q);if(active)ctx.lineTo(x,y);else ctx.moveTo(x,y);active=true}ctx.stroke()};
  for(let meridian=0;meridian<8;meridian++){const a=meridian*Math.PI/4,points=[];for(let i=0;i<=100;i++){const t=i*Math.PI/100;points.push([Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)])}drawCurve(points)}
  for(const latitude of [-.6,-.3,0,.3,.6]){const radius=Math.sqrt(1-latitude*latitude),points=[];for(let i=0;i<=140;i++){const t=i*2*Math.PI/140;points.push([radius*Math.cos(t),latitude,radius*Math.sin(t)])}drawCurve(points)}
 }
 if(signal&&direction[2]>0&&document.getElementById('eye3dRay').checked){
  const start=eye3DProject(direction),end=eye3DProject(direction.map(v=>v*1.85)),a=Math.atan2(end[1]-start[1],end[0]-start[0]);
  ctx.strokeStyle='#398a92';ctx.fillStyle='#398a92';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...end);ctx.stroke();ctx.beginPath();ctx.moveTo(...end);ctx.lineTo(end[0]-9*Math.cos(a-.4),end[1]-9*Math.sin(a-.4));ctx.lineTo(end[0]-9*Math.cos(a+.4),end[1]-9*Math.sin(a+.4));ctx.closePath();ctx.fill();
 }
 if(model&&document.getElementById('eye3dSamples').checked)drawReconstructedEyePoints(model,orbit);
 ctx.fillStyle='#68747d';ctx.font='13px system-ui';ctx.fillText(model?'Mặt cầu khớp từ ellipse tracking':'Mô phỏng nhãn cầu 3D',18,25);ctx.fillText(model?'Điểm xanh: tâm đồng tử dựng lại · đơn vị tương đối':'Tia xanh: hướng minh họa',18,height-18);
}
function drawReconstructedEyePoints(model,orbit){
 const ctx=eye3DCtx,view=orbit*eye3DDeg,project=p=>eye3DProject(eye3DRotate(p.map(v=>v/model.radius),view,0));
 for(let index=0;index<model.points.length;index++){
  const p=model.points[index],center=[p.x,p.y,p.z],viewPoint=eye3DRotate(center,view,0);if(viewPoint[2]<0)continue;
  const [x,y]=project(center);ctx.fillStyle='#47a5ad';ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fill();
  if(index%5!==0)continue;const length=Math.hypot(...center),n=center.map(v=>v/length),major=[Math.cos(p.angle),-Math.sin(p.angle),0],dot=major.reduce((s,v,i)=>s+v*n[i],0),u=major.map((v,i)=>v-dot*n[i]),un=Math.hypot(...u);if(un<1e-6)continue;for(let i=0;i<3;i++)u[i]/=un;const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
  ctx.strokeStyle='rgba(53,158,175,.4)';ctx.lineWidth=.8;ctx.beginPath();for(let i=0;i<=48;i++){const t=i*2*Math.PI/48,q=center.map((c,j)=>c+p.a*(u[j]*Math.cos(t)+v[j]*Math.sin(t))),point=project(q);if(i)ctx.lineTo(...point);else ctx.moveTo(...point)}ctx.stroke();
 }
}
function drawUnfittedEyeData(){
 const ctx=eye3DCtx,{width,height}=eye3DGeometry;ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.font='14px system-ui';ctx.fillStyle='#939da7';ctx.fillText('Chưa khớp được nhãn cầu — không dùng hình cầu mặc định',18,25);
 const frame=eyeReconstruction.frame;if(!frame)return;const scale=Math.min((width-80)/(frame.width/frame.unit),(height-90)/(frame.height/frame.unit)),ox=(width-scale*frame.width/frame.unit)/2,oy=(height-scale*frame.height/frame.unit)/2;
 ctx.strokeStyle='rgba(55,143,156,.55)';ctx.lineWidth=1;for(const s of eyeReconstruction.samples){ctx.beginPath();ctx.ellipse(ox+s.x*scale,oy+s.y*scale,s.a*scale,s.b*scale,s.angle,0,Math.PI*2);ctx.stroke()}
 ctx.fillStyle='#68747d';ctx.fillText(`${eyeReconstruction.samples.length} ellipse quan sát được · cần đa dạng góc để xác định tâm`,18,height-15);
}
function renderEye3D(now,force=false){
 const visible=!document.getElementById('videoMode').hidden&&!document.getElementById('glassesSettings').hidden&&!gazeFullscreenOpen&&!document.hidden&&document.getElementById('eye3dPanel').open;
 if(!force&&(!visible||now-eye3DState.lastFrame<50))return;
 eye3DState.lastFrame=now;const target=getEye3DTarget();eye3DState.yaw+=(target.yaw-eye3DState.yaw)*.24;eye3DState.pitch+=(target.pitch-eye3DState.pitch)*.24;eye3DState.signal=target.signal;eye3DState.source=target.source;
 const reconstructed=document.getElementById('eye3dMode').value==='reconstruct';
 document.getElementById('eye3dNeutral').disabled=reconstructed||!cameraStream||!gazeObservation||!document.getElementById('eye3dFollow').checked;
 const source={manual:'Xoay thử bằng thanh điều chỉnh',calibrated2d:'Theo ánh xạ hiệu chuẩn 2D',pupil2d:'Theo độ lệch tâm đồng tử 2D',lost:'Chưa có hoặc mất dấu đồng tử — tạm giữ mô hình mờ'};
 if(reconstructed){const model=eyeReconstruction.model;document.getElementById('eye3dStatus').textContent=model?`Mô hình khớp từ ${model.inlierCount} ellipse · Hướng theo mô hình: ngang ${eye3DState.yaw.toFixed(1)}°, dọc ${eye3DState.pitch.toFixed(1)}°${target.signal?'':' · Mất dấu hiện tại; giữ mô hình đã khớp.'}`:`Đã thu ${eyeReconstruction.samples.length} ellipse · Chưa đủ điều kiện để tái dựng.`;if(!model){drawUnfittedEyeData();return}}
 else document.getElementById('eye3dStatus').textContent=`${source[target.source]} · Góc minh họa: ngang ${eye3DState.yaw.toFixed(1)}°, dọc ${eye3DState.pitch.toFixed(1)}°.`;
 drawEye3D(eye3DState.yaw,eye3DState.pitch,Number(document.getElementById('eye3dOrbit').value),Number(document.getElementById('eye3dBrightness').value),target.signal,reconstructed?eyeReconstruction.model:null);
}
function animateEye3D(now){renderEye3D(now);eye3DState.animation=requestAnimationFrame(animateEye3D)}
window.addEventListener('pagehide',()=>cancelAnimationFrame(eye3DState.animation));
syncEye3DControls();eye3DState.animation=requestAnimationFrame(animateEye3D);
