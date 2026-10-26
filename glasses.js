// Near-eye tracking inspired by JEOresearch/EyeTracker (MIT); original implementation.
// No upstream 3D gaze code is included. This demo calibrates an affine 2D cursor.
const gazeTargets=[[.5,.5],[.15,.5],[.85,.5],[.5,.15],[.5,.85]];
const glassesExplanations={binary:'Trong ROI, tìm ô 9×9 có mức xám trung bình thấp nhất trên ảnh Gaussian. Thử các mức tối +5, +15, +25 rồi chọn vùng có hình dạng phù hợp. Nếu tắt tự động, ngưỡng thủ công áp dụng lên ảnh Gaussian. Không dùng điều kiện màu R−B cho cấu hình kính.',morphology:'Đóng rồi mở 3×3 trên vùng nhị phân quanh ô tối; chỉ giữ vùng tìm kiếm trong ROI đã chỉnh.',result:'Khung xanh là ROI của camera kính. Chữ thập đỏ là trọng tâm ứng viên đồng tử, ellipse xanh được ước lượng từ moment. Chỉnh ROI để tránh gọng kính và nền tối; chưa có phép đo hướng nhìn 3D. Hiệu chuẩn 5 điểm bên dưới dùng để chạy con trỏ mô phỏng 2D.'};
let gazeSamples=[],gazeModel=null,gazeTarget=-1,gazeCollecting=false,gazeBuffer=[],gazeObservation=null,gazeSmooth=null;
const gazeTiming={settleMs:1400,stableMs:1200,minFrames:12,maxGapMs:700,maxStd:.0075,maxSpan:.03};
let gazePhase='idle',gazeTargetSince=0,gazeLastSampleAt=0;
function setCameraProfile(){const glasses=document.getElementById('cameraProfile').value==='glasses';document.getElementById('glassesSettings').hidden=!glasses;document.getElementById('autoThresholdText').textContent=glasses?'Thử nhiều ngưỡng quanh vùng tối':'Ngưỡng tự động Otsu';cameraVideo.style.transform=glasses?`rotate(${document.getElementById('glassesRotate').checked?180:0}deg) scaleX(${document.getElementById('glassesMirror').checked?-1:1})`:'';if(glasses){document.getElementById('liveChannel').value='gray';liveStage='result'}updateLiveStage();resetGazeCalibration();}
function getGlassesROI(w,h){const n=id=>Number(document.getElementById(id).value),x=Math.floor(w*n('glassesX')/100),y=Math.floor(h*n('glassesY')/100);return {x,y,right:Math.min(w,x+Math.floor(w*n('glassesW')/100)),bottom:Math.min(h,y+Math.floor(h*n('glassesH')/100))}}
function detectGlassesPupil(gray,w,h,roi,fixedThreshold=null){
 const integral=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=gray[y*w+x];integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+sum}}
 const r=4;let darkest=Infinity,seed=null;
 for(let y=roi.y+r+1;y<roi.bottom-r-1;y+=3)for(let x=roi.x+r+1;x<roi.right-r-1;x+=3){const left=x-r,top=y-r,right=x+r+1,bottom=y+r+1,mean=(integral[bottom*(w+1)+right]-integral[top*(w+1)+right]-integral[bottom*(w+1)+left]+integral[top*(w+1)+left])/81;if(mean<darkest){darkest=mean;seed={x,y}}}
 let best=null,fallback=null;const levels=fixedThreshold===null?[5,15,25].map(d=>Math.min(255,Math.round(darkest+d))):[fixedThreshold];
 if(!seed)return {roi,pupil:null,binary:new Uint8Array(w*h),clean:new Uint8Array(w*h),threshold:0};
 const radius=Math.round(Math.min(roi.right-roi.x,roi.bottom-roi.y)*.52);
 for(const threshold of [...new Set(levels)]){const binary=new Uint8Array(w*h);for(let y=Math.max(roi.y,seed.y-radius);y<Math.min(roi.bottom,seed.y+radius);y++)for(let x=Math.max(roi.x,seed.x-radius);x<Math.min(roi.right,seed.x+radius);x++)binary[y*w+x]=gray[y*w+x]<=threshold?255:0;
  const clean=morph3(morph3(morph3(morph3(binary,w,h,true),w,h,false),w,h,false),w,h,true),pupil=findLivePupil(clean,w,h,roi).pupil,result={roi,pupil,binary,clean,threshold,seed};fallback=result;
  if(pupil&&(!best||pupil.score>best.pupil.score))best=result;
 }
 return best||fallback;
}
function fitGazeAffine(samples){
 if(samples.length<5)throw Error('Cần đủ 5 điểm.');
 const xs=samples.map(s=>s.eye[0]),ys=samples.map(s=>s.eye[1]);if(Math.max(...xs)-Math.min(...xs)<.01||Math.max(...ys)-Math.min(...ys)<.01)throw Error('Chuyển động đồng tử chưa đủ theo hai chiều; hãy nhìn lại đủ 5 điểm.');
 const normal=Array.from({length:3},()=>[0,0,0]),bx=[0,0,0],by=[0,0,0];
 for(const s of samples){const row=[s.eye[0],s.eye[1],1];for(let i=0;i<3;i++){bx[i]+=row[i]*s.target[0];by[i]+=row[i]*s.target[1];for(let j=0;j<3;j++)normal[i][j]+=row[i]*row[j]}}
 function solve(b){const a=normal.map((r,i)=>[...r,b[i]]);for(let c=0;c<3;c++){let pivot=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;if(Math.abs(a[pivot][c])<1e-9)throw Error('Các điểm hiệu chuẩn gần thẳng hàng; hãy hiệu chuẩn lại.');[a[c],a[pivot]]=[a[pivot],a[c]];const d=a[c][c];for(let j=c;j<4;j++)a[c][j]/=d;for(let r=0;r<3;r++)if(r!==c){const f=a[r][c];for(let j=c;j<4;j++)a[r][j]-=f*a[c][j]}}return a.map(r=>r[3])}
 return {x:solve(bx),y:solve(by)};
}
function mapGaze(model,eye){const row=[...eye,1];return [model.x.reduce((s,v,i)=>s+v*row[i],0),model.y.reduce((s,v,i)=>s+v*row[i],0)]}
function setGazeCalibrationButtons(active){document.getElementById('beginGazeCalibration').disabled=active;document.getElementById('stopGazeCalibration').disabled=!active}
function resetGazeCalibration(){gazeSamples=[];gazeModel=null;gazeTarget=-1;gazeCollecting=false;gazeBuffer=[];gazeObservation=null;gazeSmooth=null;gazePhase='idle';gazeTargetSince=0;gazeLastSampleAt=0;setGazeCalibrationButtons(false);document.getElementById('gazeProgress').value=0;document.getElementById('gazeStatus').textContent='Bấm Hiệu chuẩn tự động một lần, rồi nhìn theo chấm cam. Chương trình tự ghi và chuyển đủ 5 điểm.';drawGazePanel()}
function beginGazeCalibration(){
 if(!cameraStream){document.getElementById('gazeStatus').textContent='Bật camera của kính trước khi hiệu chuẩn.';return}
 resetGazeCalibration();gazeTarget=0;gazePhase='settling';gazeTargetSince=performance.now();setGazeCalibrationButtons(true);
 document.getElementById('gazeStatus').textContent='Điểm 1/5 · Nhìn chấm cam và giữ đầu ổn định. Không cần bấm thêm.';drawGazePanel();
}
function stopGazeCalibration(){resetGazeCalibration();document.getElementById('gazeStatus').textContent='Đã dừng hiệu chuẩn. Bấm Hiệu chuẩn tự động khi sẵn sàng.'}
function gazeWindowStable(buffer){
 if(buffer.length<2)return false;
 for(let axis=0;axis<2;axis++){const values=buffer.map(sample=>sample.eye[axis]),mean=values.reduce((a,b)=>a+b,0)/values.length,std=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);if(std>gazeTiming.maxStd||Math.max(...values)-Math.min(...values)>gazeTiming.maxSpan)return false}
 return true;
}
function acceptAutomaticGazePoint(now){
 const median=values=>values.sort((a,b)=>a-b)[values.length>>1];
 const eye=[median(gazeBuffer.map(s=>s.eye[0])),median(gazeBuffer.map(s=>s.eye[1]))];
 gazeSamples.push({eye,target:gazeTargets[gazeTarget]});gazeBuffer=[];gazeLastSampleAt=0;gazeCollecting=false;gazeTarget++;
 document.getElementById('gazeProgress').value=gazeSamples.length;
 if(gazeTarget===gazeTargets.length){
  try{gazeModel=fitGazeAffine(gazeSamples);gazePhase='done';document.getElementById('gazeStatus').textContent='Đã tự ghi đủ 5 điểm. Chấm xanh là con trỏ mô phỏng 2D; độ chính xác chưa được đánh giá.'}
  catch(error){gazeModel=null;gazePhase='error';document.getElementById('gazeStatus').textContent=error.message+' Bấm Hiệu chuẩn tự động để thử lại.'}
  gazeTarget=-1;setGazeCalibrationButtons(false);
 }else{gazePhase='settling';gazeTargetSince=now;document.getElementById('gazeStatus').textContent=`Điểm ${gazeTarget+1}/5 · Chuyển mắt theo chấm cam; chương trình sẽ tự ghi.`}
}
function updateGazeObservation(pupil,w,h,now=performance.now()){
 gazeObservation=pupil?[pupil.cx/w,pupil.cy/h]:null;
 if(gazeTarget>=0&&!document.hidden){
  const status=document.getElementById('gazeStatus');
  if(gazePhase==='settling'){
   const remaining=gazeTiming.settleMs-(now-gazeTargetSince);
   if(remaining>0)status.textContent=`Điểm ${gazeTarget+1}/5 · Nhìn chấm cam · Bắt đầu ghi sau ${(remaining/1000).toFixed(1)} giây.`;
   else{gazePhase='collecting';gazeCollecting=true;gazeBuffer=[];gazeLastSampleAt=0}
  }
  if(gazePhase==='collecting'){
   if(!gazeObservation){gazeBuffer=[];gazeLastSampleAt=0;document.getElementById('gazeProgress').value=gazeSamples.length;status.textContent=`Điểm ${gazeTarget+1}/5 · Đang chờ thấy đồng tử; vẫn giữ mắt nhìn chấm cam.`}
   else{
    if(gazeLastSampleAt&&now-gazeLastSampleAt>gazeTiming.maxGapMs)gazeBuffer=[];
    gazeLastSampleAt=now;gazeBuffer.push({eye:gazeObservation,time:now});
    // Keep a recent window so motion delays capture instead of contaminating it.
    gazeBuffer=gazeBuffer.filter(sample=>now-sample.time<=gazeTiming.stableMs+gazeTiming.maxGapMs).slice(-90);
    if(gazeBuffer.length>1&&!gazeWindowStable(gazeBuffer)){gazeBuffer=[gazeBuffer[gazeBuffer.length-1]];document.getElementById('gazeProgress').value=gazeSamples.length;status.textContent=`Điểm ${gazeTarget+1}/5 · Mắt còn di chuyển; giữ nhìn chấm cam để tự ghi.`}
    else{
     const duration=now-gazeBuffer[0].time,progress=Math.min(1,duration/gazeTiming.stableMs,gazeBuffer.length/gazeTiming.minFrames);
     document.getElementById('gazeProgress').value=gazeSamples.length+progress;
     status.textContent=`Điểm ${gazeTarget+1}/5 · Đang tự lấy mẫu ổn định: ${Math.round(progress*100)}%.`;
     if(duration>=gazeTiming.stableMs&&gazeBuffer.length>=gazeTiming.minFrames)acceptAutomaticGazePoint(now);
    }
   }
  }
 }
 if(gazeModel&&gazeObservation){const p=mapGaze(gazeModel,gazeObservation);gazeSmooth=gazeSmooth?p.map((v,i)=>gazeSmooth[i]*.7+v*.3):p}else gazeSmooth=null;
 drawGazePanel();
}
function drawGazePanel(){const canvas=document.getElementById('gazeCanvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#20262b';ctx.lineWidth=1;for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(w*i/3,0);ctx.lineTo(w*i/3,h);ctx.stroke()}ctx.fillStyle='#939da7';ctx.font='16px system-ui';ctx.fillText('Màn hình mô phỏng 2D',18,26);if(gazeTarget>=0){const p=gazeTargets[gazeTarget];ctx.fillStyle='#e88a1c';ctx.beginPath();ctx.arc(p[0]*w,p[1]*h,12,0,Math.PI*2);ctx.fill();ctx.fillText(String(gazeTarget+1),p[0]*w+18,p[1]*h+5)}else if(gazeModel){if(gazeSmooth){ctx.fillStyle='#087e8b';ctx.beginPath();ctx.arc(Math.max(0,Math.min(1,gazeSmooth[0]))*w,Math.max(0,Math.min(1,gazeSmooth[1]))*h,10,0,Math.PI*2);ctx.fill()}else ctx.fillText('Mất dấu đồng tử — tạm ẩn con trỏ',18,54)}}
for(const input of document.querySelectorAll('#glassesGeometry input'))input.addEventListener('change',()=>{if(!input.checkValidity()){input.reportValidity();return}const rotate=document.getElementById('glassesRotate').checked,mirror=document.getElementById('glassesMirror').checked;cameraVideo.style.transform=`rotate(${rotate?180:0}deg) scaleX(${mirror?-1:1})`;resetGazeCalibration()});
for(const id of ['autoGamma','liveGamma','autoThreshold','liveThreshold','liveChannel'])document.getElementById(id).addEventListener('input',()=>{if(gazeModel||gazeTarget>=0)resetGazeCalibration()});
document.addEventListener('visibilitychange',()=>{if(gazeTarget>=0){gazeBuffer=[];gazeLastSampleAt=0;gazeCollecting=false;gazePhase='settling';gazeTargetSince=performance.now();document.getElementById('gazeProgress').value=gazeSamples.length}});
drawGazePanel();
