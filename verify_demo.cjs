const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('C:/Users/poppy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.resolve('output/demo.html')).href);
 await page.locator('#view').evaluate(img=>img.decode());
 for(let i=0;i<8;i++){
  await page.selectOption('#files',String(i));
  for(const c of ['original','bright','dark','noise']){
   await page.selectOption('#condition',c);
   for(const s of ['original','balanced','denoised','histogram','gray','red','enhanced','binary','clean','result']){
    await page.locator(`[data-stage="${s}"]`).click();
    await page.locator('#view').evaluate(img=>img.decode());
   }
  }
 }
 await page.selectOption('#files','0');await page.selectOption('#condition','dark');
 await page.locator('[data-stage="balanced"]').click();
 await page.screenshot({path:'output/demo_preview.png',fullPage:true});
 await page.selectOption('#noiseKind','1');
 await page.locator('#noiseImage').evaluate(img=>img.decode());
 await page.locator('#play').click();await page.waitForTimeout(1900);await page.locator('#play').click();
 await page.locator('#videoTab').click();
 await page.waitForFunction(()=>processedFrames>=2);
 for(const s of ['input','gamma','gray','median','gaussian','contrast','binary','morphology','histogram','result']){
  await page.locator(`[data-live-stage="${s}"]`).click();
  const previous=await page.evaluate(()=>processedFrames);
  await page.waitForFunction(n=>processedFrames>n,previous);
 }
 await page.evaluate(()=>{
  const w=320,h=180,mask=new Uint8Array(w*h);
  if(findLivePupil(mask,w,h).pupil)throw Error('Blank mask must not have a pupil');
  mask.fill(255);if(findLivePupil(mask,w,h).pupil)throw Error('Full mask must not have a pupil');
  mask.fill(0);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(((x-160)/17)**2+((y-95)/13)**2<=1)mask[y*w+x]=255;
  const p=findLivePupil(mask,w,h).pupil;if(!p||Math.abs(p.cx-160)>1||Math.abs(p.cy-95)>1)throw Error('Synthetic pupil center incorrect');
 });
 await page.locator('#autoGamma').uncheck();await page.locator('#liveGamma').fill('0.7');
 await page.locator('#autoThreshold').uncheck();await page.locator('#liveThreshold').fill('70');
 await page.waitForFunction(()=>document.getElementById('liveMetrics').textContent.includes('Gamma 0.70'));
 const downloadPromise=page.waitForEvent('download');await page.locator('#saveFrame').click();await downloadPromise;
 await page.screenshot({path:'output/video_preview.png',fullPage:true});
 await page.evaluate(()=>window.testTrack=cameraStream.getTracks()[0]);
 await page.locator('#imageTab').click();
 if(await page.evaluate(()=>window.testTrack.readyState)!=='ended')throw Error('Camera track did not stop');
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError')}});
 await page.locator('#videoTab').click();
 await page.waitForFunction(()=>document.getElementById('cameraStatus').textContent.includes('chưa được cho phép'));
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('missing','NotFoundError')}});
 await page.locator('#startCamera').click();
 await page.waitForFunction(()=>document.getElementById('cameraStatus').textContent.includes('Không tìm thấy'));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: 320 image stages; 10 live stages using fake webcam; pupil synthetic center and blank rejection; manual controls; PNG download; camera cleanup; permission errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
