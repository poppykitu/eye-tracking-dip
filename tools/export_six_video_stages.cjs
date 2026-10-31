const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('../tests/browser/playwright.cjs');
const root=path.resolve(__dirname,'..');
const source='C:/Users/poppy/AppData/Local/Temp/codex-clipboard-7be43986-74f7-4c4e-9066-f2cab28d3ae3.png';
const out=path.join(root,'output/sau_giai_doan_video');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(path.join(root,'output/demo.html')).href);
  const result=await page.evaluate(async data=>{
   const im=new Image();im.src=data;await im.decode();
   const scale=Math.min(320/im.width,Math.sqrt(76800/(im.width*im.height)));
   const w=Math.round(im.width*scale),h=Math.round(im.height*scale);
   const input=document.createElement('canvas');input.width=w;input.height=h;
   const ctx=input.getContext('2d');ctx.drawImage(im,0,0,w,h);
   const rgba=ctx.getImageData(0,0,w,h).data;
   const settings=readVideoSettings(w,h);
   Object.assign(settings,{glasses:true,autoGamma:true,red:false,tone:true,black:0,white:135,toneGamma:1.7,autoThreshold:true});
   // The supplied eye is already upright. Preserve its orientation.
   const stages=[['gamma','01_Gamma'],['median','02_Median'],['gaussian','03_Gaussian'],['contrast','04_Contrast'],['binary','05_Thresholding'],['morphology','06_Morphological']];
   const exports=[],montage=document.createElement('canvas');
   montage.width=3*(w+32);montage.height=2*(h+64);
   const m=montage.getContext('2d');m.fillStyle='#f4f6f8';m.fillRect(0,0,montage.width,montage.height);
   let metadata;
   for(let n=0;n<stages.length;n++){
    const [stage,name]=stages[n],r=computeVideoFrame(new Uint8ClampedArray(rgba),w,h,{...settings,stage});
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').putImageData(new ImageData(r.pixels,w,h),0,0);
    exports.push({name,data:c.toDataURL('image/png')});
    const x=(n%3)*(w+32)+16,y=Math.floor(n/3)*(h+64)+42;
    m.drawImage(c,x,y);m.fillStyle='#174f70';m.font='bold 18px Arial';m.fillText(name.replace('_','  '),x,y-14);
    metadata={gamma:r.gamma,threshold:r.threshold,pupilFound:!!r.detection?.pupil};
   }
   return {exports,preview:montage.toDataURL(),metadata:{...metadata,width:w,height:h,sourceWidth:im.width,sourceHeight:im.height,settings}};
  },'data:image/png;base64,'+fs.readFileSync(source).toString('base64'));
  for(const item of result.exports)fs.writeFileSync(path.join(out,item.name+'.png'),Buffer.from(item.data.split(',')[1],'base64'));
  fs.writeFileSync(path.join(root,'output/sau_giai_doan_video_preview.png'),Buffer.from(result.preview.split(',')[1],'base64'));
  fs.writeFileSync(path.join(out,'thong_so.json'),JSON.stringify(result.metadata,null,2));
  fs.writeFileSync(path.join(out,'README.md'),'# Sáu giai đoạn xử lý video\n\nCác ảnh được tính tuần tự từ cùng ảnh mắt đầu vào bằng chính computeVideoFrame trong demo. Không xoay/lật thêm.\n\n1. Gamma: tự động; đầu ra màu.\n2. Median: sau gamma, chuyển xám, lọc trung vị 3×3.\n3. Gaussian: sau trung vị, lọc Gaussian 3×3.\n4. Contrast: cấu hình kính, phân vị 98%, đen 0, trắng 135, gamma đường cong 1,7.\n5. Thresholding: ngưỡng tự động trong ROI, vùng tối thành trắng.\n6. Morphological: đầu ra hình thái học của demo; cấu hình kính có thể giữ ứng viên trước hình thái học.\n\nThông số cụ thể xem thong_so.json. Các mặt nạ giữ cả vùng tối phụ; đây chưa phải mặt nạ chỉ chứa đồng tử.\n');
  console.log(JSON.stringify(result.metadata));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
