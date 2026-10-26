const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('C:/Users/poppy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('output/demo.html')).href);
 const ready=()=>page.waitForFunction(()=>imageResult&&imageResult.key===imageKey(),{},{timeout:60000});
 await page.selectOption('#imgWidth','320');await ready();
 await page.locator('#imgAutoThreshold').uncheck();await page.locator('#imgThreshold').fill('20');await ready();
 const low=await page.evaluate(()=>imageResult.out.binary.reduce((s,v)=>s+(v>0),0));
 await page.locator('#imgThreshold').fill('100');await ready();
 const high=await page.evaluate(()=>imageResult.out.binary.reduce((s,v)=>s+(v>0),0));
 if(high<=low)throw Error('Threshold did not affect mask');
 await page.locator('#imgAutoGamma').uncheck();await page.locator('#imgGamma').fill('0.5');await ready();
 const bright=await page.evaluate(()=>imageResult.stages.balanced);
 await page.locator('#imgGamma').fill('2');await ready();
 if(bright===await page.evaluate(()=>imageResult.stages.balanced))throw Error('Gamma did not affect image');
 await page.selectOption('#condition','noise');await ready();
 for(const [id,values,stage] of [['imgMedian',['1','5'],'denoised'],['imgGaussian',['1','7'],'enhanced'],['imgChannel',['gray','red'],'enhanced'],['imgMorph',['1','7'],'clean']]){
  await page.selectOption('#'+id,values[0]);await ready();const a=await page.evaluate(s=>imageResult.stages[s],stage);
  await page.selectOption('#'+id,values[1]);await ready();const b=await page.evaluate(s=>imageResult.stages[s],stage);
  if(a===b&&id!=='imgMorph')throw Error(id+' did not affect output');
 }
 await page.locator('#imgLow').fill('10');await ready();
 await page.locator('#imgHigh').fill('90');await ready();
 await page.locator('#imgColorGate').uncheck();await ready();await page.locator('#imgColorGate').check();await ready();
 await page.locator('#imgColorLimit').fill('15');await ready();
 await page.locator('#imgClose').fill('0');await ready();await page.locator('#imgOpen').fill('0');await ready();
 await page.selectOption('#files','4');await ready();
 await page.selectOption('#condition','original');await ready();
 for(const s of ['original','balanced','denoised','histogram','gray','red','enhanced','binary','clean','result']){
  await page.locator(`[data-stage="${s}"]`).click();await page.locator('#view').evaluate(i=>i.decode());
  const dims=await page.locator('#view').evaluate(i=>[i.naturalWidth,i.naturalHeight]);if(dims[0]!==320||dims[1]!==180)throw Error('Mismatched image coordinates');
 }
 await page.locator('#imgLow').fill('40');await page.waitForFunction(()=>document.getElementById('imageParamStatus').textContent.includes('Kiểm tra'));
 await page.getByRole('button',{name:'Khôi phục bản mặc định'}).click();
 if(await page.evaluate(()=>imageTuning))throw Error('Reset failed');
 await page.locator('[data-stage="binary"]').click();await page.locator('#view').evaluate(i=>i.decode());
 const dims=await page.locator('#view').evaluate(i=>[i.naturalWidth,i.naturalHeight]);if(dims[0]!==1024||dims[1]!==576)throw Error('Static ROI is not aligned');
 await page.screenshot({path:'output/image_controls_preview.png',fullPage:true});
 await page.locator('#videoTab').click();await page.waitForFunction(()=>processedFrames>1);
 await page.selectOption('#cameraProfile','glasses');await page.waitForFunction(()=>!document.getElementById('glassesSettings').hidden&&processedFrames>3);
 await page.evaluate(()=>{
  const w=320,h=240,gray=new Uint8Array(w*h).fill(180),roi={x:32,y:24,right:288,bottom:216};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(((x-160)/20)**2+((y-120)/15)**2<=1)gray[y*w+x]=20;
  const result=detectGlassesPupil(gray,w,h,roi);if(!result.pupil||Math.abs(result.pupil.cx-160)>2||Math.abs(result.pupil.cy-120)>2)throw Error('Near-eye pupil localization failed');
  const blank=detectGlassesPupil(new Uint8Array(w*h).fill(180),w,h,roi);if(blank.pupil)throw Error('Uniform frame returned a pupil');
  const samples=gazeTargets.map(target=>({target,eye:[.3+target[0]*.2,.3+target[1]*.2]})),model=fitGazeAffine(samples),point=mapGaze(model,[.4,.4]);
  if(Math.abs(point[0]-.5)>1e-6||Math.abs(point[1]-.5)>1e-6)throw Error('Affine calibration failed');
  let rejected=false;try{fitGazeAffine(gazeTargets.map(target=>({target,eye:[.4,.4]})))}catch{rejected=true}if(!rejected)throw Error('Degenerate calibration accepted');
 });
 await page.locator('#gazeMappingOptional').evaluate(el=>el.open=true);
 await page.getByRole('button',{name:'Hiệu chuẩn tự động 12 điểm',exact:true}).click();
 await page.waitForFunction(()=>gazeFullscreenOpen);
 const fullscreenBounds=await page.locator('#gazeStage').boundingBox();
 const viewport=await page.evaluate(()=>[innerWidth,innerHeight]);
 if(fullscreenBounds.x!==0||fullscreenBounds.y!==0||Math.abs(fullscreenBounds.width-viewport[0])>1||Math.abs(fullscreenBounds.height-viewport[1])>1)throw Error('Calibration did not fill screen');
 await page.evaluate(()=>{
  if(gazeTargets.length!==12||new Set(gazeTargets.map(p=>p[0])).size!==4||new Set(gazeTargets.map(p=>p[1])).size!==3)throw Error('Expected 4 by 3 calibration matrix');
  let now=gazeTargetSince;
  updateGazeObservation({cx:128,cy:96},320,240,now+500);
  if(gazeBuffer.length||gazeSamples.length)throw Error('Captured before settling');
  now+=gazeTiming.settleMs;
  for(let j=0;j<6;j++)updateGazeObservation({cx:128,cy:96},320,240,now+j*100);
  updateGazeObservation(null,320,240,now+600);
  if(gazeBuffer.length||gazeSamples.length)throw Error('Lost pupil did not reset capture window');
  for(let j=0;j<20;j++)updateGazeObservation({cx:(j%2?.35:.45)*320,cy:96},320,240,now+700+j*100);
  if(gazeSamples.length)throw Error('Moving pupil accepted as stable');
  // One start action; all twelve targets record, confirm and advance automatically.
  for(let i=0;i<12;i++){
   const target=gazeTargets[i],eye=[.3+target[0]*.2,.3+target[1]*.2];
   const start=Math.max(now+3000,gazeTargetSince+gazeTiming.settleMs);
   for(let j=0;j<16&&gazePhase!=='confirming';j++)updateGazeObservation({cx:(eye[0]+Math.sin(j)*.0005)*320,cy:eye[1]*240},320,240,start+j*100);
   now=start+1500;
   if(gazeSamples.length!==i+1)throw Error('Automatic point '+i+' not recorded');
   if(gazePhase!=='confirming'||gazePointProgress!==1)throw Error('Point completion animation missing');
   updateGazeObservation({cx:eye[0]*320,cy:eye[1]*240},320,240,gazePointCompletedAt+gazeTiming.confirmMs+1);
  }
  if(!gazeModel||gazePhase!=='done'||gazeTarget!==-1)throw Error('Automatic twelve-point calibration failed');
  if(document.getElementById('gazeProgress').value!==12)throw Error('Progress did not reach twelve');
  updateGazeObservation(null,320,240);if(gazeSmooth!==null)throw Error('Lost tracking did not hide cursor');
 });
 await page.locator('#exitGazeFullscreen').click();await page.waitForFunction(()=>!gazeFullscreenOpen&&!document.fullscreenElement);
 await page.selectOption('#cameraRotation','180');if(await page.evaluate(()=>gazeModel!==null))throw Error('Geometry change did not invalidate calibration');
 await page.evaluate(()=>{beginGazeCalibration();if(gazeTarget!==0)throw Error('Automatic capture did not start');stopGazeCalibration();if(gazeTarget!==-1||gazeCollecting||gazeModel)throw Error('Stop did not cancel automatic capture')});
 await page.screenshot({path:'output/glasses_preview.png',fullPage:true});
 await page.locator('#imageTab').click();if(await page.evaluate(()=>cameraStream!==null))throw Error('Camera did not stop');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: image controls; near-eye pupil; fullscreen 4x3 matrix; automatic 12-point capture; completion animation; motion/loss rejection; stop and geometry reset.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
