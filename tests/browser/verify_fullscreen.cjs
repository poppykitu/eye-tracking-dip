const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('./playwright.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('output/demo.html')).href);
 await page.locator('#videoTab').click();await page.waitForFunction(()=>processedFrames>0);
 await page.selectOption('#cameraProfile','glasses');
 await page.locator('#gazeMappingOptional').evaluate(el=>el.open=true);
 await page.getByRole('button',{name:'Hiệu chuẩn tự động 12 điểm',exact:true}).click();
 await page.waitForFunction(()=>document.fullscreenElement===document.getElementById('gazeStage'));
 await page.evaluate(()=>{
  cancelAnimationFrame(liveFrame);
  const base=gazeTargetSince+gazeTiming.settleMs;
  for(let i=0;i<=6;i++)updateGazeObservation({cx:130,cy:100},320,240,base+i*100);
 });
 await page.waitForFunction(()=>gazeRenderedProgress>.49);
 const ring=await page.evaluate(()=>{
  const c=document.getElementById('gazeCanvas'),ctx=c.getContext('2d'),p=gazeTargets[gazeTarget],x=Math.round(p[0]*c.width),y=Math.round(p[1]*c.height),radii=[];
  for(let r=18;r<=52;r++){const pixel=ctx.getImageData(x+r,y,1,1).data;if(pixel[0]>150&&pixel[1]>70&&pixel[2]<100)radii.push(r)}
  return {progress:gazePointProgress,radii,width:c.width,height:c.height};
 });
 if(Math.abs(ring.progress-.5)>1e-9||!ring.radii.some(r=>r>=29&&r<=34)||ring.radii.some(r=>r>38))throw Error('Shrinking ring is not tied to half-complete sample progress');
 await page.screenshot({path:'output/calibration_12_points_preview.png',fullPage:false});
 await page.evaluate(()=>document.exitFullscreen());
 await page.waitForFunction(()=>!gazeFullscreenOpen&&gazeTarget===-1);
 // Browser-host fallback must also cover the viewport and support Escape.
 await page.evaluate(()=>{document.getElementById('gazeStage').requestFullscreen=()=>Promise.reject(new Error('blocked by host'))});
 await page.getByRole('button',{name:'Hiệu chuẩn tự động 12 điểm',exact:true}).click();
 await page.waitForFunction(()=>gazeFullscreenOpen&&!document.fullscreenElement);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!gazeFullscreenOpen&&gazeTarget===-1);
 // Changing viewport after collecting a point invalidates old screen geometry.
 await page.getByRole('button',{name:'Hiệu chuẩn tự động 12 điểm',exact:true}).click();
 await page.evaluate(()=>{const base=gazeTargetSince+gazeTiming.settleMs;for(let i=0;i<14;i++)updateGazeObservation({cx:130,cy:100},320,240,base+i*100)});
 await page.setViewportSize({width:1200,height:800});
 await page.waitForFunction(()=>!gazeFullscreenOpen&&document.getElementById('gazeStatus').textContent.includes('Kích thước'));
 if(errors.length)throw Error(errors.join('\n'));
 await browser.close();console.log('PASS: native fullscreen; 50% ring pixel radius; fullscreen exit cancellation; viewport fallback and Escape; resize invalidation.');
})().catch(e=>{console.error(e);process.exitCode=1});
