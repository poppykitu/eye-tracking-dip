let imageTuning=false,imageWorker=null,imageDebounce=null,imageRevision=0,imageResult=null;
const storedRender=render;
const imageDefaults={imgAutoGamma:true,imgGamma:'1',imgMedian:'5',imgGaussian:'7',imgChannel:'red',imgLow:'2',imgHigh:'98',imgAutoThreshold:true,imgThreshold:'40',imgColorGate:true,imgColorLimit:'8',imgMorph:'5',imgClose:'2',imgOpen:'1',imgWidth:'640'};
function imageParams(){const val=id=>Number(document.getElementById(id).value),check=id=>document.getElementById(id).checked;return {autoGamma:check('imgAutoGamma'),gamma:val('imgGamma'),median:val('imgMedian'),gaussian:val('imgGaussian'),channel:document.getElementById('imgChannel').value,low:val('imgLow'),high:val('imgHigh'),autoThreshold:check('imgAutoThreshold'),threshold:val('imgThreshold'),colorGate:check('imgColorGate'),colorLimit:val('imgColorLimit'),morph:val('imgMorph'),close:val('imgClose'),open:val('imgOpen'),width:val('imgWidth')}}
function imageKey(){return JSON.stringify([idx,document.getElementById('condition').value,imageParams()])}
function syncImageControls(){document.getElementById('imgGamma').disabled=document.getElementById('imgAutoGamma').checked;document.getElementById('imgThreshold').disabled=document.getElementById('imgAutoThreshold').checked;document.getElementById('imgColorLimit').disabled=!document.getElementById('imgColorGate').checked;for(const id of ['imgGamma','imgThreshold','imgColorLimit'])document.getElementById(id+'Value').textContent=document.getElementById(id).value}
for(const input of document.querySelectorAll('#imageSettings input,#imageSettings select'))input.addEventListener('input',()=>{imageTuning=true;syncImageControls();if(timer)toggle();queueImageProcessing()});
function resetImageParameters(){for(const [id,value]of Object.entries(imageDefaults)){const input=document.getElementById(id);if(typeof value==='boolean')input.checked=value;else input.value=value}imageTuning=false;imageRevision++;clearTimeout(imageDebounce);if(imageWorker){imageWorker.terminate();imageWorker=null}imageResult=null;syncImageControls();document.getElementById('imageParamStatus').textContent='Đang xem kết quả Python mặc định. Thay đổi thông số để tính lại ngay trong trình duyệt.';document.getElementById('saveImageStage').disabled=false;render()}
function queueImageProcessing(){
 clearTimeout(imageDebounce);imageRevision++;if(imageWorker){imageWorker.terminate();imageWorker=null}
 document.getElementById('saveImageStage').disabled=true;
 const params=imageParams();
 const invalid=[...document.querySelectorAll('#imageSettings input')].some(e=>!e.disabled&&(!e.checkValidity()||(e.type==='number'&&e.value==='')))||params.low>=params.high;
 if(invalid){document.getElementById('imageParamStatus').textContent='Kiểm tra thông số: hãy nhập giá trị trong khoảng cho phép.';return}
 document.getElementById('imageParamStatus').textContent='Đang tính lại ảnh theo thông số…';
 document.getElementById('metrics').textContent='Đang cập nhật kết quả…';
 imageDebounce=setTimeout(()=>processTunedImage(imageRevision,imageKey()),180);
}
async function processTunedImage(revision,key){try{
 const p=imageParams(),record=allData.find(r=>r.metrics.file===data[idx].metrics.file&&r.metrics.condition===document.getElementById('condition').value),source=new Image();source.src=record.stages.original;await source.decode();if(revision!==imageRevision)return;
 const canvas=document.createElement('canvas'),w=Math.min(p.width,source.naturalWidth),h=Math.round(source.naturalHeight*w/source.naturalWidth);canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data;
 const workerURL=URL.createObjectURL(new Blob([document.getElementById('imageWorkerSource').textContent],{type:'text/javascript'}));
 const worker=new Worker(workerURL);imageWorker=worker;URL.revokeObjectURL(workerURL);
 worker.onerror=()=>{if(revision===imageRevision){document.getElementById('imageParamStatus').textContent='Không tính được ảnh. Hãy khôi phục mặc định và thử lại.';document.getElementById('metrics').textContent='Chưa có kết quả mới.'}worker.terminate()};
 worker.onmessage=({data:out})=>{worker.terminate();if(revision!==imageRevision)return;imageWorker=null;if(out.error){document.getElementById('imageParamStatus').textContent=out.error;return}
  const encoded={original:canvas.toDataURL('image/png')};
  for(const name of ['balanced','denoised','gray','red','enhanced','binary','clean']){
   const image=new ImageData(w,h);image.data.fill(12);for(let i=3;i<image.data.length;i+=4)image.data[i]=255;
   if(name==='balanced'||name==='denoised')image.data.set(out[name]);
   else for(let y=0;y<out.roi.h;y++)for(let x=0;x<out.roi.w;x++){const i=((y+out.roi.y)*w+x+out.roi.x)*4,v=out[name][y*out.roi.w+x];image.data[i]=image.data[i+1]=image.data[i+2]=v}
   ctx.putImageData(image,0,0);encoded[name]=canvas.toDataURL('image/png');
  }
  ctx.drawImage(source,0,0,w,h);ctx.strokeStyle='#16a8db';ctx.lineWidth=2;ctx.strokeRect(out.roi.x,out.roi.y,out.roi.w,out.roi.h);
  if(out.pupil){const q=out.pupil;ctx.strokeStyle='#00df50';ctx.beginPath();ctx.ellipse(q.cx,q.cy,q.rx,q.ry,q.angle,0,2*Math.PI);ctx.stroke();ctx.strokeStyle='#f5263f';ctx.beginPath();ctx.moveTo(q.cx-7,q.cy);ctx.lineTo(q.cx+7,q.cy);ctx.moveTo(q.cx,q.cy-7);ctx.lineTo(q.cx,q.cy+7);ctx.stroke()}
  encoded.result=canvas.toDataURL('image/png');
  ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,w,h);ctx.font='14px system-ui';const maximum=Math.max(...out.histBefore,...out.histAfter);
  for(const [bins,color,label,y]of [[out.histBefore,'#287bc1','Trước',20],[out.histAfter,'#168553','Sau gamma + trung vị',40]]){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.fillText(label,30,y);ctx.beginPath();for(let i=0;i<256;i++){const x=30+i/255*(w-55),y=h-30-bins[i]/Math.max(1,maximum)*(h-85);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.stroke()}
  ctx.fillStyle='#939da7';ctx.fillText('0',30,h-8);ctx.fillText('255',w-45,h-8);encoded.histogram=canvas.toDataURL('image/png');
  imageResult={key,stages:encoded,out,p,source:record.metrics};document.getElementById('imageParamStatus').textContent='Đã tính lại từ ảnh đầu vào · Thông số áp dụng cho tất cả các bước.';document.getElementById('saveImageStage').disabled=false;paintTunedImage();
 };
 worker.postMessage({pixels,w,h,p},[pixels.buffer]);
 }catch(e){if(revision===imageRevision)document.getElementById('imageParamStatus').textContent='Không mở được ảnh: '+e.message}}
function paintTunedImage(){if(!imageResult||imageResult.key!==imageKey())return;const {out,p,stages:images,source}=imageResult,m=out.metrics;document.getElementById('view').src=images[stage];document.getElementById('before').src=images.original;
 const detail={original:`Ảnh đầu vào ${out.w} × ${out.h} px.`,balanced:`Gamma ${m.gamma.toFixed(2)}; ${p.autoGamma?'tự động':'thủ công'}.`,denoised:`Lọc trung vị ${p.median===1?'đã tắt':p.median+' × '+p.median}.`,histogram:'Histogram toàn khung trước và sau gamma + trung vị.',gray:'Ảnh xám trong ROI, đặt đúng tọa độ so với ảnh gốc.',red:'Kênh đỏ trong ROI, đặt đúng tọa độ so với ảnh gốc.',enhanced:`Kênh ${p.channel==='red'?'đỏ':'xám'} → Gaussian ${p.gaussian} × ${p.gaussian} → giãn tương phản phân vị ${p.low}%–${p.high}%.`,binary:`Ngưỡng đảo T=${m.threshold} (${p.autoThreshold?'Otsu trên các pixel đủ điều kiện':'thủ công'}). ${p.colorGate?'Kết hợp R−B ≤ '+p.colorLimit+' và mức xám < 200 để giảm vùng nâu và phản xạ mạnh.':'Không dùng điều kiện màu.'}`,clean:`Phần tử ellipse ${p.morph} × ${p.morph}; đóng ${p.close} lần, mở ${p.open} lần.`,result:'Lọc vùng liên thông theo diện tích và hình dạng. Tâm và hai trục được khớp từ đường biên ellipse; chấp nhận ellipse thon khi biên phù hợp. Vẫn có thể sai khi ảnh bị che hoặc phản xạ.'};document.getElementById('explain').textContent=detail[stage];
 let summary=`Bản chỉnh trực tiếp · ${out.w} × ${out.h} px · ${m.ms.toFixed(0)} ms\nGamma ${m.gamma.toFixed(2)} · Trung vị ${p.median} × ${p.median} · Gaussian ${p.gaussian} × ${p.gaussian}\nPhân vị ${p.low}%–${p.high}% · Ngưỡng ${m.threshold}`;
 if(out.pupil)summary+=`\nTâm ứng viên trên ảnh gốc: (${(out.pupil.cx*source.source_width/out.w).toFixed(0)}, ${(out.pupil.cy*source.source_height/out.h).toFixed(0)}) px`;else summary+='\nChưa tìm được vùng đồng tử phù hợp.';document.getElementById('metrics').textContent=summary;
}
render=()=>{storedRender();if(!imageTuning)return;if(imageResult?.key===imageKey())paintTunedImage();else queueImageProcessing()};
function saveImageStage(){const a=document.createElement('a');a.href=document.getElementById('view').src;a.download=`${data[idx].metrics.file.replace(/\.[^.]+$/,'')}-${stage}.${imageTuning?'png':'jpg'}`;a.click()}
syncImageControls();
