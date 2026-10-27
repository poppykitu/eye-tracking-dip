const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('C:/Users/poppy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('output/demo.html')).href);
 const maskURL='data:image/png;base64,'+fs.readFileSync('tests/fixtures/thin_pupil_mask.png').toString('base64');
 await page.evaluate(async url=>{
  const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,c.width,c.height).data,mask=new Uint8Array(c.width*c.height);for(let i=0;i<mask.length;i++)mask[i]=rgba[i*4]>127?255:0;
  const p=findLivePupil(mask,c.width,c.height,{x:0,y:0,right:c.width,bottom:c.height}).pupil;
  if(!p||Math.hypot(p.cx-262.55,p.cy-144.46)>3||p.area<1800||p.ratio>=.4)throw Error('Real thin-pupil mask was missed or confused with speckle');
  for(const ratio of [.15,.2,.3])for(const degrees of [0,30,60,90,120]){
   const w=320,h=240,mask=new Uint8Array(w*h),a=degrees*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=x-160,dy=y-120,u=ca*dx+sa*dy,v=-sa*dx+ca*dy;if((u/30)**2+(v/(30*ratio))**2<=1)mask[y*w+x]=255}
   const pupil=findLivePupil(mask,w,h,{x:32,y:24,right:288,bottom:216}).pupil;
   if(!pupil||Math.hypot(pupil.cx-160,pupil.cy-120)>2)throw Error('Slim ellipse failed at ratio '+ratio+', angle '+degrees);
   if(ratio===.3){for(let y=118;y<=122;y++)for(let x=158;x<=162;x++)mask[y*w+x]=0;const withGlint=findLivePupil(mask,w,h,{x:32,y:24,right:288,bottom:216}).pupil;if(!withGlint||Math.hypot(withGlint.cx-160,withGlint.cy-120)>2)throw Error('Internal highlight corrupted outer ellipse fit')}
  }
  const src=document.createElement('canvas');src.width=4;src.height=2;const s=src.getContext('2d');s.fillStyle='red';s.fillRect(0,0,2,2);s.fillStyle='blue';s.fillRect(2,0,2,2);const dst=document.createElement('canvas');dst.width=2;dst.height=4;const d=dst.getContext('2d');drawOrientedCamera(src,d,2,4,90,false);if(d.getImageData(0,0,1,1).data[0]<200||d.getImageData(0,3,1,1).data[2]<200)throw Error('90-degree clockwise rotation incorrect');
 },maskURL);
 await page.locator('#videoTab').click();await page.waitForFunction(()=>processedFrames>0);await page.selectOption('#cameraProfile','glasses');
 await page.evaluate(()=>{cancelAnimationFrame(liveFrame);window.testSamples=[];for(const yaw of [-45,-30,-15,0,15,30,45])for(const pitch of [-30,-20,-10,0,10,20,30]){const a=yaw*Math.PI/180,b=pitch*Math.PI/180,n=[Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)];testSamples.push({x:.5+.22*n[0],y:.4-.22*n[1],a:.045,b:.045*n[2],angle:Math.atan2(n[0],n[1]),fitError:.01})}
  const exact=fitEyeSphere(testSamples);if(Math.hypot(exact.center[0]-.5,exact.center[1]-.4)>1e-5||Math.abs(exact.rotationRadius-.22)>1e-5)throw Error('Exact geometric reconstruction failed');
  const noisy=testSamples.map((s,i)=>({...s,x:s.x+.001*Math.sin(i*5),y:s.y+.001*Math.cos(i*7),b:s.b*(1+.004*Math.sin(i*3))}));for(let i=0;i<8;i++)noisy.push({x:.2+i*.07,y:.2+i*.03,a:.045,b:.027,angle:i*.36,fitError:.02});const fit=fitEyeSphere(noisy);if(Math.hypot(fit.center[0]-.5,fit.center[1]-.4)>.015||Math.abs(fit.rotationRadius-.22)>.025)throw Error('Noise/outlier reconstruction failed');
  let rejected=false;try{fitEyeSphere(testSamples.map(s=>({...s,angle:0})))}catch{rejected=true}if(!rejected)throw Error('Parallel ellipse axes accepted');
  if(getEye3DTarget().source!=='unfitted')throw Error('A default sphere was supplied before fitting');
  // Exercise the actual segmentation and boundary fit, not just perfect ellipse inputs.
  window.detectedSamples=[];
  for(const s of testSamples){const w=320,h=240,gray=new Uint8Array(w*h).fill(150),ca=Math.cos(s.angle),sa=Math.sin(s.angle);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=x-s.x*w,dy=y-s.y*w,u=ca*dx+sa*dy,v=-sa*dx+ca*dy;if((u/(s.a*w))**2+(v/(s.b*w))**2<=1)gray[y*w+x]=25}
   const p=detectGlassesPupil(gaussian3(median3(gray,w,h),w,h),w,h,{x:16,y:12,right:304,bottom:228}).pupil;
   if(p)detectedSamples.push({x:p.cx/w,y:p.cy/w,a:p.rx/w,b:p.ry/w,angle:p.angle,fitError:p.fitError});
  }
  const detectedFit=fitEyeSphere(detectedSamples);if(Math.hypot(detectedFit.center[0]-.5,detectedFit.center[1]-.4)>.02||Math.abs(detectedFit.rotationRadius-.22)>.04)throw Error('Image segmentation to sphere integration failed');
 });
 await page.locator('#startEye3D').click();
 await page.waitForFunction(()=>eyeReconstruction.fixationActive&&gazeFullscreenOpen);
 await page.evaluate(()=>{if(gazeTarget!==-1)throw Error('Single fixation incorrectly started 12-point calibration');let now=performance.now()+200;
  observeEyeReconstruction(null,320,240,now);if(!eyeReconstruction.message.includes('Mất dấu'))throw Error('Missing pupil has no actionable status');
  const s=testSamples[0],p={cx:s.x*320,cy:s.y*320,rx:s.a*320,ry:s.b*320,angle:s.angle,fitError:s.fitError};observeEyeReconstruction(p,320,240,now+=200);observeEyeReconstruction(p,320,240,now+=200);if(!eyeReconstruction.message.includes('Góc này đã có'))throw Error('Duplicate sample silently stalled');
  for(const s of testSamples){observeEyeReconstruction({cx:s.x*320,cy:s.y*320,rx:s.a*320,ry:s.b*320,angle:s.angle,fitError:s.fitError},320,240,now);now+=200}if(!eyeReconstruction.model||eyeReconstruction.samples.length<24)throw Error('Single-fixation data was not fitted');if(Math.abs(eyeReconstruction.model.rotationRadius-.22)>.003)throw Error('Session fitted radius wrong')});
 await page.waitForFunction(()=>!eyeReconstruction.fixationActive&&!gazeFullscreenOpen&&!document.fullscreenElement);
 await page.evaluate(()=>{const target=getEye3DTarget();eye3DState.yaw=target.yaw;eye3DState.pitch=target.pitch;document.getElementById('eye3dOrbit').value='15';renderEye3D(performance.now(),true);document.getElementById('eye3dStatus').textContent+=' · Ảnh kiểm thử bằng dữ liệu hình học tổng hợp.'});
 await page.locator('#eye3dPanel').screenshot({path:'output/reconstruction_synthetic_preview.png'});
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportEyeReconstruction').click();const download=await downloadPromise,payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));if(payload.schema!=='eye-sphere-weak-perspective-v1'||payload.ellipses.length<24)throw Error('Model export incomplete');
 await page.selectOption('#cameraRotation','180');if(await page.evaluate(()=>eyeReconstruction.model!==null||eyeReconstruction.samples.length>0))throw Error('Camera rotation did not invalidate reconstruction');
 await page.getByRole('button',{name:'Tái dựng nhãn cầu · 1 điểm',exact:true}).click();await page.waitForFunction(()=>eyeReconstruction.fixationActive);await page.locator('#exitGazeFullscreen').click();if(await page.evaluate(()=>eyeReconstruction.collecting||eyeReconstruction.fixationActive))throw Error('Stopping fixation did not stop collection');
 if(errors.length)throw Error(errors.join('\n'));
 await browser.close();console.log('PASS: real user thin mask; 15 slim ellipses; clockwise rotation; robust data-driven sphere fit; degenerate rejection; one fixation; export; geometry reset and stop.');
})().catch(e=>{console.error(e);process.exitCode=1});
