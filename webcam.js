// Offline, classical DIP pipeline for live webcam frames. No network or ML.
let cameraStream = null, cameraRequest = 0, liveFrame = 0, lastFrameAt = 0;
let liveStage = 'contrast', processedFrames = 0;
let videoWorker=null,videoWorkerBusy=false,videoSettingsVersion=0;
const videoWorkerStats={submitted:0,completed:0,pending:0,maxPending:0};
const cameraVideo = document.getElementById('webcam');
const processedCanvas = document.getElementById('processed');
const processedContext = processedCanvas.getContext('2d');
const captureCanvas = document.createElement('canvas');
const captureContext = captureCanvas.getContext('2d', {willReadFrequently:true});
const webcamPreview=document.getElementById('webcamPreview'),webcamPreviewContext=webcamPreview.getContext('2d');
function drawOrientedCamera(source,ctx,w,h,rotation,mirror){ctx.save();ctx.translate(w/2,h/2);if(mirror)ctx.scale(-1,1);ctx.rotate(rotation*Math.PI/180);const quarter=rotation===90||rotation===270;ctx.drawImage(source,-(quarter?h:w)/2,-(quarter?w:h)/2,quarter?h:w,quarter?w:h);ctx.restore()}
const liveNames = {input:'1. Đầu vào',gamma:'2. Gamma',gray:'3. Kênh ảnh',median:'4. Trung vị',gaussian:'5. Gaussian',contrast:'6. Tương phản',binary:'7. Phân ngưỡng',morphology:'8. Hình thái học',histogram:'9. Histogram',result:'10. Tìm tâm đồng tử',selected:'11. Mặt nạ đồng tử nhìn thấy'};
const liveExplanations = {
 input:'Khung hình webcam thu nhỏ về chiều rộng 320 pixel để xử lý trực tiếp.',
 gamma:'Biến đổi s = 255 × (r/255)^γ. Gamma dưới 1 làm sáng; trên 1 làm tối. Chọn tự động hoặc tự kéo thanh gamma.',
 gray:'Chuyển ảnh sau gamma sang mức xám theo độ chói, hoặc lấy kênh đỏ theo lựa chọn của bạn.',
 median:'Lọc trung vị 3×3 trên kênh ảnh, giúp giảm nhiễu điểm. Cửa sổ nhỏ giúp giữ chi tiết và giảm thời gian tính toán.',
 gaussian:'Làm mịn với mặt nạ Gaussian 3×3 = [1,2,1]ᵀ × [1,2,1] / 16 sau bước trung vị.',
 contrast:'Giãn tương phản tuyến tính từ phân vị 2%–98% về 0–255 sau lọc. Không thể tái tạo chi tiết đã cháy sáng.',
 binary:'Ngưỡng đảo: vùng tối thành trắng. Chọn Otsu tự động hoặc kéo ngưỡng thủ công; Otsu tách hai nhóm mức sáng, không xác định đâu là mắt.',
 morphology:'Đóng rồi mở ảnh nhị phân bằng phần tử cấu trúc vuông 3×3: nối khe nhỏ và loại nhiễu nhỏ.',
 histogram:'Phân bố mức xám trước xử lý (xanh lam) và sau giãn tương phản (xanh lá), cùng thang đếm. Trục ngang là mức sáng 0–255.',
 result:'Đặt một mắt cận cảnh trong khung xanh. Từ ảnh nhị phân đã đóng/mở, lọc các vùng liên thông theo diện tích và độ khớp biên ellipse. Chữ thập đỏ là tâm ellipse; ellipse xanh được khớp trực tiếp từ đường biên. Nếu vùng chưa tách đúng, tắt Otsu rồi điều chỉnh ngưỡng. Đây là ứng viên đồng tử, chưa phải điểm nhìn đã hiệu chuẩn.'
};
for (const [key,label] of Object.entries(liveNames)) {
 const button=document.createElement('button');button.textContent=label;button.dataset.liveStage=key;
 button.onclick=()=>{liveStage=key;updateLiveStage()};document.getElementById('liveStages').append(button);
}
function updateLiveStage(){document.getElementById('liveCaption').textContent=liveNames[liveStage];const glasses=document.getElementById('cameraProfile')?.value==='glasses';document.getElementById('liveExplain').textContent=(glasses&&typeof glassesExplanations!=='undefined'&&glassesExplanations[liveStage])||liveExplanations[liveStage];document.querySelectorAll('[data-live-stage]').forEach(b=>{b.classList.toggle('active',b.dataset.liveStage===liveStage);b.hidden=b.dataset.liveStage==='selected'&&!glasses})}
function syncLiveControls(){document.getElementById('liveGamma').disabled=document.getElementById('autoGamma').checked;document.getElementById('liveThreshold').disabled=document.getElementById('autoThreshold').checked}
function switchMode(mode){
 const video=mode==='video';document.getElementById('imageMode').hidden=video;document.getElementById('videoMode').hidden=!video;
 for(const key of ['image','video']){const b=document.getElementById(key+'Tab');b.classList.toggle('active',key===mode);b.setAttribute('aria-selected',String(key===mode))}
 if(timer)toggle();
 if(video){if(!cameraStream&&!document.getElementById('startCamera').disabled)startCamera()}else stopCamera();
}
function stopCamera(message='Camera đã tắt.'){
 if(typeof eyeReconstruction!=='undefined'){if(eyeReconstruction.collecting||eyeReconstruction.fixationActive)stopEyeReconstruction();eyeReconstruction.latest=null}
 if(typeof resetGazeCalibration==='function')resetGazeCalibration();
 cameraRequest++;cancelAnimationFrame(liveFrame);
 if(videoWorker){videoWorker.terminate();videoWorker=null}videoWorkerBusy=false;videoWorkerStats.pending=0;
 if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}
 cameraVideo.srcObject=null;document.getElementById('startCamera').disabled=false;document.getElementById('stopCamera').disabled=true;document.getElementById('saveFrame').disabled=true;
 processedContext.clearRect(0,0,processedCanvas.width,processedCanvas.height);
 webcamPreviewContext.clearRect(0,0,webcamPreview.width,webcamPreview.height);
 document.getElementById('cameraStatus').textContent=message;document.getElementById('liveMetrics').textContent='Chưa có khung hình camera.';
}
async function startCamera(deviceId=''){
 stopCamera('Đang chờ quyền webcam… Hãy chọn Cho phép trong thông báo của trình duyệt.');
 if(typeof resetEyeReconstruction==='function')resetEyeReconstruction();
 const request=++cameraRequest;document.getElementById('startCamera').disabled=true;document.getElementById('stopCamera').disabled=false;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error(),{name:'UnsupportedContext'});
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},...(deviceId?{deviceId:{exact:deviceId}}:{})}});
  if(request!==cameraRequest){stream.getTracks().forEach(t=>t.stop());return}
  cameraStream=stream;cameraVideo.srcObject=stream;await cameraVideo.play();
  if(request!==cameraRequest)return;
  const selected=stream.getVideoTracks()[0].getSettings().deviceId;
  const devices=await navigator.mediaDevices.enumerateDevices();
  if(request!==cameraRequest)return;
  const select=document.getElementById('cameraDevice');select.replaceChildren(new Option('Camera mặc định',''));
  devices.filter(d=>d.kind==='videoinput').forEach((d,i)=>select.add(new Option(d.label||`Camera ${i+1}`,d.deviceId)));select.value=selected||'';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(request===cameraRequest)stopCamera('Camera đã ngắt kết nối. Hãy kết nối lại rồi bấm Bật webcam.')});
  document.getElementById('cameraStatus').textContent='Webcam đang bật · Xử lý trực tiếp trên thiết bị của bạn.';
  document.getElementById('startCamera').disabled=false;processedFrames=0;lastFrameAt=0;
  ensureVideoWorker();liveFrame=requestAnimationFrame(processCameraFrame);
 }catch(error){
  if(request!==cameraRequest)return;
  const messages={NotAllowedError:'Quyền webcam chưa được cho phép. Mở quyền Camera cạnh thanh địa chỉ, cho phép rồi bấm Bật webcam.',NotFoundError:'Không tìm thấy webcam. Kết nối camera rồi thử lại.',NotReadableError:'Không mở được webcam. Hãy đóng ứng dụng khác đang dùng camera rồi thử lại.',OverconstrainedError:'Camera đã chọn không còn khả dụng. Chọn camera mặc định rồi thử lại.',UnsupportedContext:'Trình duyệt không hỗ trợ webcam ở địa chỉ này. Mở bằng Edge/Chrome hoặc chạy demo tại localhost.'};
  stopCamera(messages[error.name]||'Không thể mở webcam. Kiểm tra camera và quyền truy cập rồi thử lại.');
 }
}
function hist(values){const bins=new Uint32Array(256);for(const value of values)bins[value]++;return bins}
function quantile(bins,count,fraction){let sum=0;for(let i=0;i<256;i++){sum+=bins[i];if(sum>=count*fraction)return i}return 255}
function median3(input,w,h){const output=new Uint8Array(input.length),nine=new Uint8Array(9);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)nine[n++]=input[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))];nine.sort();output[y*w+x]=nine[4]}return output}
function gaussian3(input,w,h){const output=new Uint8Array(input.length),weights=[1,2,1];for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=input[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))]*weights[dy+1]*weights[dx+1];output[y*w+x]=Math.round(sum/16)}return output}
function morph3(input,w,h,dilate){const out=new Uint8Array(input.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let value=dilate?0:255;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const sample=input[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))];value=dilate?Math.max(value,sample):Math.min(value,sample)}out[y*w+x]=value}return out}
function otsu(bins,count){let total=0;for(let i=0;i<256;i++)total+=i*bins[i];let weight=0,sum=0,best=-1,threshold=0;for(let i=0;i<256;i++){weight+=bins[i];sum+=i*bins[i];if(!weight)continue;if(weight===count)break;const difference=sum/weight-(total-sum)/(count-weight),variance=weight*(count-weight)*difference*difference;if(variance>best){best=variance;threshold=i}}return threshold}
function applyEyeTone(input,black,white,gamma=1){
 const output=new Uint8Array(input.length),lut=new Uint8Array(256);white=Math.max(black+1,white);
 for(let i=0;i<256;i++){const t=Math.max(0,Math.min(1,(i-black)/(white-black))),s=t*t*(3-2*t);lut[i]=Math.round(255*s**gamma)}
 for(let i=0;i<input.length;i++)output[i]=lut[input[i]];return output;
}
function enhanceLiveContrast(input,{tone=false,black=0,white=135,gamma=1.7}={}){
 const bins=hist(input),low=tone?0:quantile(bins,input.length,.02),high=quantile(bins,input.length,.98);
 const stretched=Uint8Array.from(input,v=>high>low?Math.max(0,Math.min(255,Math.round((v-low)*255/(high-low)))):v);
 // Preserve the dark pupil values: subtracting the 2nd percentile clips these to zero.
 return tone?applyEyeTone(stretched,black,white,gamma):stretched;
}
function syncEyeToneControls(){
 const black=document.getElementById('eyeBlack'),white=document.getElementById('eyeWhite');
 if(+white.value<=+black.value)white.value=+black.value+1;
 for(const id of ['eyeBlack','eyeWhite','eyeToneGamma'])document.getElementById(id+'Value').textContent=document.getElementById(id).value;
}
function findLivePupil(mask,w,h,customROI=null){
 const roi=customROI||{x:Math.floor(.18*w),y:Math.floor(.20*h),right:Math.floor(.87*w),bottom:Math.floor(.85*h)};
 const roiArea=(roi.right-roi.x)*(roi.bottom-roi.y),seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),outside=ellipseExteriorBackground(mask,w,h,roi);
 let best=null;
 for(let y=roi.y;y<roi.bottom;y++)for(let x=roi.x;x<roi.right;x++){
  const seed=y*w+x;if(seen[seed]||!mask[seed])continue;
  let head=0,tail=1,area=0,perimeter=0,touches=false;const boundary=[];queue[0]=seed;seen[seed]=1;
  while(head<tail){
   const at=queue[head++],px=at%w,py=Math.floor(at/w);area++;
   if(px===roi.x||px===roi.right-1||py===roi.y||py===roi.bottom-1)touches=true;
   let isBoundary=false;
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const nx=px+dx,ny=py+dy;
    if(nx<roi.x||nx>=roi.right||ny<roi.y||ny>=roi.bottom){perimeter++;isBoundary=true;continue}
    const next=ny*w+nx;if(!mask[next]){perimeter++;if(outside[next])isBoundary=true;continue}
    if(!seen[next]){seen[next]=1;queue[tail++]=next}
   }
   if(isBoundary)boundary.push([px,py]);
  }
  if(touches||area<Math.max(16,roiArea*.0015)||area>roiArea*.15)continue;
  const fitted=fitVisiblePupilBoundary(boundary,area),circularity=4*Math.PI*area/(perimeter*perimeter);
  if(!fitted||fitted.rx*2<.08*Math.min(roi.right-roi.x,roi.bottom-roi.y)||fitted.cx<=roi.x||fitted.cx>=roi.right||fitted.cy<=roi.y||fitted.cy>=roi.bottom)continue;
  if(!fitted.occluded)fitted.score=.7*fitted.fitQuality+.15*Math.exp(-Math.abs(Math.log(fitted.fill)))+.15*Math.min(1,area/(roiArea*.018));
  if(!best||fitted.score>best.score)best={...fitted,area,circularity,componentSeed:seed};
 }
 return {roi,pupil:best,status:best?(best.occluded?'partial':'tracked'):'unreliable',reason:best?(best.occluded?'Ellipse suy ra từ biên nhìn thấy; không dùng cho 3D.':'Đủ biên để khớp ellipse.'):'Không đủ biên đáng tin: có thể do che khuất, ROI hoặc phân ngưỡng.'};
}
function drawLiveHistogram(before,after,w,h){
 const ctx=processedContext,first=hist(before),second=hist(after),max=Math.max(...first,...second),left=24,right=w-12,top=28,bottom=h-22;
 ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,w,h);ctx.font='10px system-ui';
 for(const [bins,color,label,y] of [[first,'#287bc1','Trước',12],[second,'#168553','Sau',24]]){
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.fillText(label,left,y);ctx.beginPath();
  for(let i=0;i<256;i++){const x=left+i/255*(right-left),y=bottom-bins[i]/Math.max(1,max)*(bottom-top);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();
 }
 ctx.fillStyle='#939da7';ctx.fillText('0',left,h-6);ctx.fillText('128',(left+right)/2-8,h-6);ctx.fillText('255',right-18,h-6);
}
function computeVideoFrame(pixels,w,h,settings){
 const started=performance.now(),count=w*h,gray=new Uint8Array(count),glasses=settings.glasses,stage=settings.stage,frame=new ImageData(pixels,w,h);
  for(let i=0;i<count;i++)gray[i]=Math.round(.299*pixels[i*4]+.587*pixels[i*4+1]+.114*pixels[i*4+2]);
  const median=quantile(hist(gray),count,.5),gamma=settings.autoGamma?(median>=90&&median<=170?1:Math.max(.4,Math.min(1.4,Math.log(130/255)/Math.log(Math.max(1,Math.min(254,median))/255)))):settings.gamma;
  const lut=new Uint8Array(256);for(let i=0;i<256;i++)lut[i]=Math.round(255*(i/255)**gamma);
  const corrected=new Uint8ClampedArray(pixels.length),channel=new Uint8Array(count),red=settings.red;
  for(let i=0;i<count;i++){const j=i*4;corrected[j]=lut[pixels[j]];corrected[j+1]=lut[pixels[j+1]];corrected[j+2]=lut[pixels[j+2]];corrected[j+3]=255;channel[i]=red?corrected[j]:Math.round(.299*corrected[j]+.587*corrected[j+1]+.114*corrected[j+2])}
  const medianFiltered=median3(channel,w,h),gaussian=gaussian3(medianFiltered,w,h);
  const contrast=enhanceLiveContrast(gaussian,{tone:glasses&&settings.tone,black:settings.black,white:settings.white,gamma:settings.toneGamma});
  let threshold=settings.autoThreshold?otsu(hist(contrast),count):settings.threshold;const binary=new Uint8Array(count);
  for(let i=0;i<count;i++)binary[i]=contrast[i]<=threshold?255:0;
  const glassesResult=glasses?detectGlassesPupil(contrast,w,h,settings.roi,settings.autoThreshold?null:threshold):null;
  const frameQuality=glasses?assessPupilFrame(gray,w,h,settings.roi):null;
  if(glassesResult&&frameQuality.lowContrast){glassesResult.pupil=null;glassesResult.status='unreliable';glassesResult.reason=frameQuality.warning}
  if(glassesResult){binary.set(glassesResult.binary);threshold=glassesResult.threshold;}
  let output=frame;
  if(stage==='selected'&&glassesResult){output=new ImageData(w,h);const selected=selectedPupilMask(glassesResult.clean,w,h,glassesResult.pupil);for(let i=0;i<count;i++){output.data[i*4]=output.data[i*4+1]=output.data[i*4+2]=selected[i];output.data[i*4+3]=255}}
  if(stage==='gamma')output=new ImageData(corrected,w,h);
  else if(!['input','result','histogram','selected'].includes(stage)){
   const cleaned=stage==='morphology'?(glassesResult?glassesResult.clean:morph3(morph3(morph3(morph3(binary,w,h,true),w,h,false),w,h,false),w,h,true)):null;
   const values={gray:channel,median:medianFiltered,gaussian,contrast,binary,morphology:cleaned}[stage];output=new ImageData(w,h);
   for(let i=0;i<count;i++){output.data[i*4]=output.data[i*4+1]=output.data[i*4+2]=values[i];output.data[i*4+3]=255}
  }

 const detection=glassesResult||(stage==='result'?findLivePupil(morph3(morph3(morph3(morph3(binary,w,h,true),w,h,false),w,h,false),w,h,true),w,h):null);
 return {pixels:output.data,w,h,gamma,threshold,stage,glasses,detection,frameQuality,gray:stage==='histogram'?gray:null,contrast:stage==='histogram'?contrast:null,processingMs:performance.now()-started};
}
function readVideoSettings(w,h){return {stage:liveStage,glasses:document.getElementById('cameraProfile').value==='glasses',roi:getGlassesROI(w,h),autoGamma:document.getElementById('autoGamma').checked,gamma:Number(document.getElementById('liveGamma').value),red:document.getElementById('liveChannel').value==='red',autoThreshold:document.getElementById('autoThreshold').checked,threshold:Number(document.getElementById('liveThreshold').value),tone:document.getElementById('eyeToneEnabled').checked,black:Number(document.getElementById('eyeBlack').value),white:Number(document.getElementById('eyeWhite').value),toneGamma:Number(document.getElementById('eyeToneGamma').value)}}
function ensureVideoWorker(){
 if(videoWorker)return;
 const functions=[hist,quantile,median3,gaussian3,morph3,otsu,applyEyeTone,enhanceLiveContrast,solveEllipseSystem,fitEllipseFromBoundary,ellipseBoundaryError,ellipseRegionQuality,ellipseBoundarySupport,fitVisiblePupilBoundary,selectedPupilMask,ellipseExteriorBackground,findLivePupil,glassesPhotometricContrast,assessPupilFrame,detectGlassesPupil,computeVideoFrame];
 const source=functions.map(f=>f.toString()).join('\n')+`\nself.onmessage=event=>{const {pixels,w,h,settings,meta}=event.data;try{const result=computeVideoFrame(pixels,w,h,settings),transfer=[result.pixels.buffer];if(result.gray)transfer.push(result.gray.buffer,result.contrast.buffer);self.postMessage({result,meta},transfer)}catch(error){self.postMessage({error:error.message,meta})}};`;
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 try{videoWorker=new Worker(url)}finally{URL.revokeObjectURL(url)}
 videoWorker.onmessage=event=>{videoWorkerBusy=false;videoWorkerStats.pending=0;videoWorkerStats.completed++;const {result,meta,error}=event.data;if(!cameraStream||meta.request!==cameraRequest)return;if(error){stopCamera('Lỗi xử lý video: '+error);return}if(meta.version!==videoSettingsVersion||result.stage!==liveStage)return;presentVideoResult(result,meta)};
 videoWorker.onerror=event=>{console.error(event.message);stopCamera('Không khởi động được bộ xử lý video nền. Hãy tải lại demo bằng Edge/Chrome.')};
}
function presentVideoResult(result,meta){
 const {w,h,gamma,threshold,stage,glasses,detection,gray,contrast}=result,{sourceW,sourceH,interval}=meta;let pupilInfo='';
 if(processedCanvas.width!==w||processedCanvas.height!==h){processedCanvas.width=w;processedCanvas.height=h}
 processedContext.putImageData(new ImageData(result.pixels,w,h),0,0);
 if(glasses){updateGazeObservation(detection.pupil,w,h);observeEyeReconstruction(detection.pupil,w,h,performance.now())}
 if(stage==='histogram')drawLiveHistogram(gray,contrast,w,h);
  if(stage==='result'){
   const {roi,pupil}=detection,ctx=processedContext;
   ctx.strokeStyle='#16a8db';ctx.lineWidth=1;ctx.strokeRect(roi.x,roi.y,roi.right-roi.x,roi.bottom-roi.y);
   if(pupil){
    ctx.strokeStyle=pupil.occluded?'#db922f':'#00e253';ctx.beginPath();ctx.ellipse(pupil.cx,pupil.cy,pupil.rx,pupil.ry,pupil.angle,0,2*Math.PI);ctx.stroke();
    ctx.strokeStyle='#ff263d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pupil.cx-5,pupil.cy);ctx.lineTo(pupil.cx+5,pupil.cy);ctx.moveTo(pupil.cx,pupil.cy-5);ctx.lineTo(pupil.cx,pupil.cy+5);ctx.stroke();
    const x=pupil.cx*sourceW/w,y=pupil.cy*sourceH/h;
    pupilInfo=` · Tâm (${x.toFixed(0)}, ${y.toFixed(0)}) px trên ảnh đã xoay · Tỷ lệ trục ${pupil.ratio.toFixed(2)} · Sai lệch biên ${(pupil.fitError||0).toFixed(3)} · ${pupil.occluded?'Che một phần · ellipse suy ra · bỏ khỏi 3D':'Biên đầy đủ'}`;
   }else pupilInfo=' · '+(detection.reason||'Chưa tìm được vùng đồng tử phù hợp. Đưa mắt gần hơn hoặc điều chỉnh ngưỡng.');
  }
 processedFrames++;document.getElementById('saveFrame').disabled=false;
 document.getElementById('liveMetrics').textContent=`${w} × ${h} px · Gamma ${gamma.toFixed(2)} · Ngưỡng ${threshold} · Xử lý nền ${result.processingMs.toFixed(1)} ms/khung · ${interval?(1000/interval).toFixed(1):'—'} khung xử lý/giây${pupilInfo}${result.frameQuality?.warning?' · '+result.frameQuality.warning:''}`;
}
function processCameraFrame(now){
 if(!cameraStream)return;
 liveFrame=requestAnimationFrame(processCameraFrame);
 // Keep at most one frame in flight; skip capture while the worker is busy.
 if(document.hidden||videoWorkerBusy||now-lastFrameAt<100||cameraVideo.readyState<2)return;
 const interval=lastFrameAt?now-lastFrameAt:0;lastFrameAt=now;
 try{
  const rotation=Number(document.getElementById('cameraRotation').value),quarter=rotation===90||rotation===270,sourceW=quarter?cameraVideo.videoHeight:cameraVideo.videoWidth,sourceH=quarter?cameraVideo.videoWidth:cameraVideo.videoHeight;
  const scale=Math.min(320/sourceW,Math.sqrt(76800/(sourceW*sourceH))),w=Math.max(1,Math.round(sourceW*scale)),h=Math.max(1,Math.round(sourceH*scale));
  if(captureCanvas.width!==w||captureCanvas.height!==h){captureCanvas.width=w;captureCanvas.height=h}
  const settings=readVideoSettings(w,h);
  drawOrientedCamera(cameraVideo,captureContext,w,h,rotation,settings.glasses&&document.getElementById('glassesMirror').checked);
  const frame=captureContext.getImageData(0,0,w,h);
  if(webcamPreview.width!==w||webcamPreview.height!==h){webcamPreview.width=w;webcamPreview.height=h}webcamPreviewContext.putImageData(frame,0,0);
  ensureVideoWorker();videoWorkerBusy=true;videoWorkerStats.submitted++;videoWorkerStats.pending=1;videoWorkerStats.maxPending=Math.max(videoWorkerStats.maxPending,1);
  videoWorker.postMessage({pixels:frame.data,w,h,settings,meta:{request:cameraRequest,version:videoSettingsVersion,sourceW,sourceH,interval}},[frame.data.buffer]);
 }catch(error){stopCamera('Có lỗi khi xử lý khung hình. Hãy bật lại camera.');console.error(error)}
}
// Ignore old results when controls change while a frame is being processed.
for(const event of ['input','change'])document.getElementById('videoMode').addEventListener(event,()=>videoSettingsVersion++);
function saveProcessedFrame(){if(!cameraStream||!processedFrames)return;const a=document.createElement('a');a.download=`eye-${liveStage}-${Date.now()}.png`;a.href=processedCanvas.toDataURL('image/png');a.click()}
window.addEventListener('pagehide',()=>stopCamera());updateLiveStage();syncLiveControls();
