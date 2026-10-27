// Weak-perspective spherical eye model estimated from tracked pupil ellipses.
// Scale is relative to the image; no focal calibration or millimetres are inferred.
const eyeReconstruction={collecting:false,fixationActive:false,samples:[],model:null,latest:null,lastAccepted:0,lastFitCount:0,acceptedCount:0,finishTimer:null,frame:null,status:'idle'};
function reconstructionMedian(values){const a=[...values].sort((x,y)=>x-y);return a[Math.floor(a.length/2)]}
function reconstructionWeightedMedian(values){const sorted=[...values].sort((a,b)=>a.value-b.value),half=sorted.reduce((s,v)=>s+v.weight,0)/2;let sum=0;for(const v of sorted){sum+=v.weight;if(sum>=half)return v.value}return sorted[sorted.length-1]?.value}
function fitEyeSphere(rawSamples){
 const samples=rawSamples.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.a>0&&s.b>0&&s.b/s.a>=.12&&s.b/s.a<=.97&&(s.fitError??0)<.18);
 if(samples.length<24)throw Error('Cần ít nhất 24 ellipse rõ, ở nhiều góc khác nhau.');
 const spanX=Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x)),spanY=Math.max(...samples.map(s=>s.y))-Math.min(...samples.map(s=>s.y));
 if(spanX<.025||spanY<.025)throw Error('Chưa đủ chuyển động theo hai chiều. Xoay đầu nhẹ trái/phải và lên/xuống.');
 const entries=samples.map(s=>{const q=s.b/s.a;return {...s,q,sinTilt:Math.sqrt(1-q*q),vx:Math.cos(s.angle),vy:Math.sin(s.angle),weight:Math.max(.01,(1-q)**2)*Math.exp(-8*(s.fitError??0))}});
 let center=null,weights=entries.map(e=>e.weight),condition=0,seedScore=Infinity,trials=0;
 // Robust initialization from intersections of ellipse-normal projection lines.
 for(let i=0;i<entries.length&&trials<400;i++)for(let j=i+1;j<entries.length&&trials<400;j++){
  const a=entries[i],b=entries[j];if(Math.abs(a.vx*b.vy-a.vy*b.vx)<.2)continue;
  const c=solveEllipseSystem([[a.vx,a.vy],[b.vx,b.vy]],[a.vx*a.x+a.vy*a.y,b.vx*b.x+b.vy*b.y]);if(!c||c.some(v=>v<-.5||v>1.5))continue;trials++;
  const residuals=entries.map(s=>Math.abs(s.vx*(s.x-c[0])+s.vy*(s.y-c[1]))),score=reconstructionMedian(residuals);
  if(score<seedScore){seedScore=score;center=c}
 }
 if(!center)throw Error('Các trục ellipse chưa đủ khác hướng để xác định tâm.');
 const seedScale=Math.max(.002,1.4826*seedScore);
 weights=entries.map(s=>{const u=Math.abs(s.vx*(s.x-center[0])+s.vy*(s.y-center[1]))/(4.685*seedScale);return u<1?s.weight*(1-u*u)**2:0});
 for(let iteration=0;iteration<7;iteration++){
  const a=[[0,0],[0,0]],b=[0,0];for(let i=0;i<entries.length;i++){const s=entries[i],v=[s.vx,s.vy],rhs=s.vx*s.x+s.vy*s.y;for(let r=0;r<2;r++){b[r]+=weights[i]*v[r]*rhs;for(let c=0;c<2;c++)a[r][c]+=weights[i]*v[r]*v[c]}}
  const delta=Math.hypot(a[0][0]-a[1][1],2*a[0][1]),trace=a[0][0]+a[1][1];condition=(trace-delta)/Math.max(trace+delta,1e-12);
  if(condition<.025)throw Error('Các trục ellipse gần song song. Cần nhìn theo nhiều hướng hơn.');
  center=solveEllipseSystem(a,b);if(!center)throw Error('Chưa xác định được tâm nhãn cầu.');
  const residuals=entries.map(s=>Math.abs(s.vx*(s.x-center[0])+s.vy*(s.y-center[1]))),scale=Math.max(.002,1.4826*reconstructionMedian(residuals));
  weights=entries.map((s,i)=>{const u=residuals[i]/(4.685*scale);return u<1?s.weight*(1-u*u)**2:0});
 }
 let distance=reconstructionWeightedMedian(entries.map((s,i)=>({value:Math.hypot(s.x-center[0],s.y-center[1])/s.sinTilt,weight:weights[i]})));
 if(!Number.isFinite(distance)||distance<.025||distance>1.5)throw Error('Bán kính chưa hợp lý. Kiểm tra vùng đồng tử và chiều camera.');
 // Joint robust refinement: ellipse-major-axis lines and foreshortening radius.
 for(let iteration=0;iteration<10;iteration++){
  const residuals=entries.map(s=>Math.abs(Math.hypot(s.x-center[0],s.y-center[1])-distance*s.sinTilt)),scale=Math.max(.002,1.4826*reconstructionMedian(residuals)),a=Array.from({length:3},()=>[0,0,0]),b=[0,0,0];
  for(let index=0;index<entries.length;index++){const s=entries[index],dx=s.x-center[0],dy=s.y-center[1],d=Math.max(1e-8,Math.hypot(dx,dy)),terms=[{r:s.vx*dx+s.vy*dy,j:[-s.vx,-s.vy,0]},{r:d-distance*s.sinTilt,j:[-dx/d,-dy/d,-s.sinTilt]}];
   for(const term of terms){const u=Math.abs(term.r)/(4.685*scale),weight=u<1?weights[index]*(1-u*u)**2:0;for(let r=0;r<3;r++){b[r]-=weight*term.j[r]*term.r;for(let c=0;c<3;c++)a[r][c]+=weight*term.j[r]*term.j[c]}}
  }
  const step=solveEllipseSystem(a,b);if(!step)break;center[0]+=Math.max(-.04,Math.min(.04,step[0]));center[1]+=Math.max(-.04,Math.min(.04,step[1]));distance+=Math.max(-.05,Math.min(.05,step[2]));if(distance<=.01)throw Error('Dữ liệu ellipse không phù hợp mô hình cầu.');if(Math.hypot(...step)<1e-7)break;
 }
 const errors=entries.map(s=>Math.hypot(s.vx*(s.x-center[0])+s.vy*(s.y-center[1]),Math.hypot(s.x-center[0],s.y-center[1])-distance*s.sinTilt)),cut=Math.max(.008,3*1.4826*reconstructionMedian(errors)),inliers=entries.filter((s,i)=>errors[i]<=cut);
 if(inliers.length<18||inliers.length/entries.length<.65)throw Error('Quá nhiều ellipse không nhất quán; tiếp tục thu thêm góc rõ.');
 const rms=Math.sqrt(errors.filter(e=>e<=cut).reduce((sum,e)=>sum+e*e,0)/inliers.length),pupilRadius=reconstructionMedian(inliers.map(s=>s.a));
 if(rms/distance>.12||distance>1.5||center.some(v=>v<-.5||v>1.5))throw Error('Sai số khớp còn cao; chưa chấp nhận mô hình.');
 const points=inliers.map(s=>({x:s.x-center[0],y:-(s.y-center[1]),z:distance*s.q,a:s.a,ratio:s.q,angle:s.angle}));
 return {center,rotationRadius:distance,pupilRadius,radius:Math.hypot(distance,pupilRadius),rms,inlierCount:inliers.length,sampleCount:entries.length,condition,points,assumption:'weak-perspective circular pupil; relative image scale; visible hemisphere'};
}
function reconstructionDirection(pupil,w,h,model=eyeReconstruction.model){if(!pupil||!model)return null;const unit=Math.max(w,h),q=Math.max(.12,Math.min(1,pupil.ry/pupil.rx)),x=pupil.cx/unit-model.center[0],y=-(pupil.cy/unit-model.center[1]),z=model.rotationRadius*q,norm=Math.hypot(x,y,z);return norm?[x/norm,y/norm,z/norm]:null}
function setReconstructionStatus(message){eyeReconstruction.message=message;document.getElementById('reconstructionStatus').textContent=message;if(eyeReconstruction.fixationActive){document.getElementById('gazeStatus').textContent=message;document.getElementById('gazeFullscreenStatus').textContent=message}}
function resetEyeReconstruction(){clearTimeout(eyeReconstruction.finishTimer);const wasOpen=eyeReconstruction.fixationActive;Object.assign(eyeReconstruction,{collecting:false,fixationActive:false,samples:[],model:null,latest:null,lastAccepted:0,lastFitCount:0,acceptedCount:0,finishTimer:null,frame:null,status:'idle'});if(wasOpen)closeGazeFullscreenView();document.getElementById('stopEyeReconstruction').disabled=true;document.getElementById('exportEyeReconstruction').disabled=true;setReconstructionStatus('Chưa có mô hình. Thu nhiều ellipse bằng cách nhìn một điểm cố định và xoay đầu.');document.getElementById('reconstructionMetrics').textContent='Chưa khớp tâm hoặc bán kính.'}
async function beginEyeReconstruction(){
 if(document.getElementById('cameraProfile').value!=='glasses'){document.getElementById('cameraProfile').value='glasses';setCameraProfile()}
 if(!cameraStream){await startCamera();if(!cameraStream){setReconstructionStatus('Chưa mở được camera. Cho phép webcam và chọn camera USB của kính rồi thử lại.');return}}
 resetGazeCalibration();resetEyeReconstruction();document.getElementById('eye3dMode').value='reconstruct';syncEye3DControls();eyeReconstruction.collecting=true;eyeReconstruction.fixationActive=true;eyeReconstruction.status='collecting';document.getElementById('stopEyeReconstruction').disabled=false;
 setReconstructionStatus('Nhìn chấm giữa màn hình. Xoay đầu nhẹ trái/phải, lên/xuống nhưng vẫn nhìn chấm; camera phải cố định trên kính.');openGazeFullscreen();
}
function stopEyeReconstruction(){clearTimeout(eyeReconstruction.finishTimer);eyeReconstruction.collecting=false;eyeReconstruction.fixationActive=false;document.getElementById('stopEyeReconstruction').disabled=true;closeGazeFullscreenView();setReconstructionStatus(eyeReconstruction.model?'Đã giữ mô hình khớp từ dữ liệu tracking.':`Đã dừng thu với ${eyeReconstruction.samples.length} ellipse. ${eyeReconstruction.message||'Chưa đủ dữ liệu để khớp.'}`);}
function observeEyeReconstruction(pupil,w,h,now=performance.now()){
 if(eyeReconstruction.frame&&(eyeReconstruction.frame.width!==w||eyeReconstruction.frame.height!==h)){resetEyeReconstruction();setReconstructionStatus('Kích thước khung hình đã thay đổi. Hãy bắt đầu thu lại.');return}
 eyeReconstruction.latest=pupil?{pupil:{...pupil},w,h}:null;
 if(!eyeReconstruction.collecting)return;
 if(!pupil){setReconstructionStatus(`Đã thu ${eyeReconstruction.samples.length} ellipse · Mất dấu đồng tử. Kiểm tra ROI và ngưỡng ở bước 10; chỉnh để ellipse xanh bám đúng vùng đen.`);return}
 if(now-eyeReconstruction.lastAccepted<140)return;
 const unit=Math.max(w,h),ratio=pupil.ry/pupil.rx;
 if(ratio<.12||ratio>.97||(pupil.fitError??0)>.18){setReconstructionStatus(`Đã thu ${eyeReconstruction.samples.length} ellipse · Tiếp tục xoay đầu; chỉ nhận ellipse rõ, có độ nghiêng.`);return}
 const sample={x:pupil.cx/unit,y:pupil.cy/unit,a:pupil.rx/unit,b:pupil.ry/unit,angle:pupil.angle,fitError:pupil.fitError??0,time:now};
 if(eyeReconstruction.samples.some(s=>Math.hypot(s.x-sample.x,s.y-sample.y)<.002&&Math.abs(s.b/s.a-ratio)<.01&&Math.abs(Math.sin(s.angle-sample.angle))<.04)){setReconstructionStatus(`Đã thu ${eyeReconstruction.samples.length} ellipse · Góc này đã có. Giữ nhìn chấm và xoay đầu thêm lên/xuống, trái/phải.`);return}
 eyeReconstruction.frame={width:w,height:h,unit};eyeReconstruction.lastAccepted=now;eyeReconstruction.acceptedCount++;eyeReconstruction.samples.push(sample);if(eyeReconstruction.samples.length>180)eyeReconstruction.samples.shift();
 setReconstructionStatus(`Nhìn chấm giữa và xoay đầu nhẹ · Đã thu ${eyeReconstruction.samples.length} ellipse ở các góc khác nhau.`);
 if(eyeReconstruction.samples.length>=24&&eyeReconstruction.acceptedCount-eyeReconstruction.lastFitCount>=4){
  eyeReconstruction.lastFitCount=eyeReconstruction.acceptedCount;
  try{eyeReconstruction.model=fitEyeSphere(eyeReconstruction.samples);const m=eyeReconstruction.model;document.getElementById('exportEyeReconstruction').disabled=false;document.getElementById('reconstructionMetrics').textContent=`Tâm chiếu: (${(m.center[0]*unit).toFixed(1)}, ${(m.center[1]*unit).toFixed(1)}) px · Bán kính cầu hiệu dụng: ${(m.radius*unit).toFixed(1)} px\nKhoảng cách tâm quay–tâm đồng tử: ${(m.rotationRadius*unit).toFixed(1)} px · RMS khớp: ${(m.rms*unit).toFixed(2)} px · ${m.inlierCount}/${m.sampleCount} ellipse nhất quán.`;
   if(eyeReconstruction.samples.length>=24){eyeReconstruction.collecting=false;eyeReconstruction.status='fitted';setReconstructionStatus('Đã khớp mô hình nhãn cầu từ các ellipse tracking. Đang mở mô hình 3D…');eyeReconstruction.finishTimer=setTimeout(()=>stopEyeReconstruction(),900)}
  }catch(error){setReconstructionStatus(`${eyeReconstruction.samples.length} ellipse · ${error.message}`)}
 }
}
function drawReconstructionFixation(ctx,w,h){if(!eyeReconstruction.fixationActive)return false;const ready=eyeReconstruction.status==='fitted',progress=Math.min(1,eyeReconstruction.samples.length/24),x=w/2,y=h/2;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.strokeStyle=ready?'#42a881':'#82581f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,15+25*(1-progress),0,2*Math.PI);ctx.stroke();ctx.fillStyle=ready?'#42a881':'#db922f';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8d969f';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText('Giữ nhìn điểm này · Xoay đầu nhẹ theo hai chiều',x,y+65);ctx.fillText(`${eyeReconstruction.samples.length} ellipse đã thu`,x,y+88);ctx.textAlign='start';
 const previewW=Math.min(180,w*.2),previewH=previewW*webcamPreview.height/Math.max(1,webcamPreview.width),px=w-previewW-20,py=h-previewH-45;
 ctx.save();ctx.globalAlpha=.55;ctx.drawImage(webcamPreview,px,py,previewW,previewH);ctx.restore();
 const latest=eyeReconstruction.latest;if(latest){const p=latest.pupil,sx=previewW/latest.w,sy=previewH/latest.h;ctx.save();ctx.translate(px,py);ctx.scale(sx,sy);ctx.strokeStyle='#42a881';ctx.lineWidth=1/sx;ctx.beginPath();ctx.ellipse(p.cx,p.cy,p.rx,p.ry,p.angle,0,Math.PI*2);ctx.stroke();ctx.restore()}
 ctx.fillStyle=latest?'#688b7e':'#c18d65';ctx.font='12px system-ui';ctx.fillText(latest?'Đang bám đồng tử':'Mất dấu đồng tử',px,h-25);
 document.getElementById('gazeFullscreenStatus').textContent=document.getElementById('reconstructionStatus').textContent;document.getElementById('exitGazeFullscreen').textContent='Dừng thu · Esc';return true}
function exportEyeReconstruction(){if(!eyeReconstruction.model)return;const payload={schema:'eye-sphere-weak-perspective-v1',units:'normalized image coordinates; multiply by frame.unit for processed pixels; not millimetres',cameraRotation:Number(document.getElementById('cameraRotation').value),mirror:document.getElementById('glassesMirror').checked,frame:eyeReconstruction.frame,model:eyeReconstruction.model,ellipses:eyeReconstruction.samples},url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='eye-reconstruction.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
