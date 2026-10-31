const fs=require('fs'),path=require('path'),os=require('os'),{pathToFileURL}=require('url');
let chromium;try{({chromium}=require('playwright'))}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')))}
const args={};for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||!process.argv[i+1])throw Error('Use --annotations labels.json --images image-dir --output result-dir [--method robust|direct] [--settings config.json]');args[process.argv[i].slice(2)]=process.argv[i+1]}
(async()=>{
 if(!args.annotations||!args.images||!args.output)throw Error('Missing annotations, images or output');
 const labels=JSON.parse(fs.readFileSync(args.annotations,'utf8').replace(/^\uFEFF/,'')),root=path.resolve(__dirname,'..'),imageRoot=path.resolve(args.images),out=path.resolve(args.output),method=args.method||'robust';
 if(labels.schema!=='eye-pupil-annotations-v1'||!Array.isArray(labels.images))throw Error('Invalid annotation schema');if(!['direct','robust'].includes(method))throw Error('Unknown fitting method');
 const override=args.settings?JSON.parse(fs.readFileSync(args.settings,'utf8')):{};
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:args.browser||'msedge'}),predictions=[];
 try{const page=await browser.newPage();await page.goto(pathToFileURL(path.join(root,'output/demo.html')).href);
 if(method==='direct')await page.evaluate(()=>{fitVisiblePupilBoundary=(points,area)=>{const e=fitEllipseFromBoundary(points),q=ellipseRegionQuality(points,e,area);return e&&q?{...e,...q,method:'direct-only-baseline',occluded:false,reconstructionEligible:true}:null}});
 for(let i=0;i<labels.images.length;i++){
  const label=labels.images[i],source=path.resolve(imageRoot,label.file);if(!source.startsWith(imageRoot+path.sep))throw Error('Image outside input directory');
  if(label.state==='unusable'){predictions.push({id:label.id,ellipse:null,skipped:true});continue}
  const mime=path.extname(source).toLowerCase()==='.png'?'image/png':'image/jpeg',url='data:'+mime+';base64,'+fs.readFileSync(source).toString('base64');
  const result=await page.evaluate(async({url,label,override})=>{const im=new Image();im.src=url;await im.decode();if(im.width!==label.width||im.height!==label.height)throw Error('Image size differs from annotation: '+label.id);
   const scale=Math.min(320/im.width,Math.sqrt(76800/(im.width*im.height))),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(im,0,0,w,h);
   const settings={...readVideoSettings(w,h),glasses:true,autoGamma:true,red:false,tone:true,black:0,white:135,toneGamma:1.7,autoThreshold:true,...override,stage:'selected'};
   const result=computeVideoFrame(ctx.getImageData(0,0,w,h).data,w,h,settings),mask=document.createElement('canvas');mask.width=im.width;mask.height=im.height;ctx.putImageData(new ImageData(result.pixels,w,h),0,0);const m=mask.getContext('2d');m.imageSmoothingEnabled=false;m.drawImage(c,0,0,im.width,im.height);
   return {mask:label.labelType==='ellipse'?undefined:mask.toDataURL('image/png'),ellipse:result.detection?.pupil||null,processedWidth:w,processedHeight:h,processingMs:result.processingMs,threshold:result.threshold,settings};
  },{url,label,override});
  // Canvas emits RGBA; evaluator requires opaque, equal RGB channels and strict 0/255 values.
  let maskFile;if(result.mask){maskFile=String(i).padStart(5,'0')+'_mask.png';fs.writeFileSync(path.join(out,maskFile),Buffer.from(result.mask.split(',')[1],'base64'));delete result.mask;}
  predictions.push({id:label.id,...(maskFile?{mask:maskFile}:{}),...result});
 }
 fs.writeFileSync(path.join(out,'predictions.json'),JSON.stringify({schema:'eye-pupil-predictions-v1',method,annotationSource:labels.source||'user annotations',coordinates:'Images already upright; no automatic rotation or mirroring; selected connected-component mask, not filled ellipse',images:predictions},null,2));
 console.log('Predicted '+predictions.length+' frames ('+method+'). Run evaluate_pupil.py for scores.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
