const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('../tests/browser/playwright.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/tim_tam_dong_tu');
const maskFile='C:/Users/poppy/AppData/Local/Temp/codex-clipboard-4d1dbaa8-5168-4b90-a25e-c8795f40ae67.png';
const eyeFile=path.join(root,'output/Sau_giai_doan_xu_ly_video/01_Gamma.png');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();await page.goto(pathToFileURL(path.join(root,'output/demo.html')).href);
  const result=await page.evaluate(async ({maskUrl,eyeUrl})=>{
   const load=async src=>{const im=new Image();im.src=src;await im.decode();return im};
   const maskImage=await load(maskUrl),eye=await load(eyeUrl),w=maskImage.width,h=maskImage.height;
   if(eye.width!==w||eye.height!==h)throw Error('Mask/eye size mismatch; alignment must be verified');
   const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(maskImage,0,0);
   const pixels=ctx.getImageData(0,0,w,h).data,mask=Uint8Array.from({length:w*h},(_,i)=>pixels[i*4]>=128?255:0);
   const roi=readVideoSettings(w,h).roi,{pupil}=findLivePupil(mask,w,h,roi);
   if(!pupil)throw Error('No accepted pupil candidate in supplied mask');
   const images=[];
   for(const [name,source] of [['01_Tam_tren_mat_na',maskImage],['02_Tam_tren_anh_mat',eye]]){
    ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0);
    ctx.lineWidth=1.5;ctx.strokeStyle='#00e253';ctx.beginPath();ctx.ellipse(pupil.cx,pupil.cy,pupil.rx,pupil.ry,pupil.angle,0,2*Math.PI);ctx.stroke();
    ctx.strokeStyle='#ff3030';ctx.beginPath();ctx.moveTo(pupil.cx-6,pupil.cy);ctx.lineTo(pupil.cx+6,pupil.cy);ctx.moveTo(pupil.cx,pupil.cy-6);ctx.lineTo(pupil.cx,pupil.cy+6);ctx.stroke();
    images.push({name,data:c.toDataURL('image/png')});
   }
   return {images,metrics:{width:w,height:h,roi,center:{x:pupil.cx,y:pupil.cy},semimajor:pupil.rx,semiminor:pupil.ry,angleDegrees:pupil.angle*180/Math.PI,fitError:pupil.fitError,area:pupil.area,method:'findLivePupil with fitEllipseFromBoundary (same video-demo functions)',inputMaskThreshold:128}};
  },{maskUrl:'data:image/png;base64,'+fs.readFileSync(maskFile).toString('base64'),eyeUrl:'data:image/png;base64,'+fs.readFileSync(eyeFile).toString('base64')});
  for(const im of result.images)fs.writeFileSync(path.join(out,im.name+'.png'),Buffer.from(im.data.split(',')[1],'base64'));
  fs.writeFileSync(path.join(out,'ket_qua.json'),JSON.stringify(result.metrics,null,2));console.log(JSON.stringify(result.metrics));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
