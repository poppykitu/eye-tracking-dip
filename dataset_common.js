// Offline interchange: uncompressed ZIP, strict binary PNG masks, no dependencies.
const datasetEncoder=new TextEncoder(),datasetDecoder=new TextDecoder();
function datasetCRC(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function datasetHeader(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)}}
function datasetSafeName(name){if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>p==='..'||p==='.'||!p)||name.includes(':'))throw Error('Đường dẫn ZIP không hợp lệ');return name}
async function datasetZip(files){
 const chunks=[],central=[];let offset=0,total=0;
 if(files.length>1000)throw Error('Quá nhiều tệp');
 for(const [filename,value]of files){const name=datasetEncoder.encode(datasetSafeName(filename)),bytes=value instanceof Blob?new Uint8Array(await value.arrayBuffer()):typeof value==='string'?datasetEncoder.encode(value):value,crc=datasetCRC(bytes),h=datasetHeader(30),d=h.view;
  total+=bytes.length;if(total>128*1024*1024)throw Error('Bộ dữ liệu vượt 128 MB; chia thành các phiên nhỏ.');
  d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint32(14,crc,true);d.setUint32(18,bytes.length,true);d.setUint32(22,bytes.length,true);d.setUint16(26,name.length,true);chunks.push(h.bytes,name,bytes);
  const c=datasetHeader(46),v=c.view;v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,bytes.length,true);v.setUint32(24,bytes.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);central.push(c.bytes,name);offset+=30+name.length+bytes.length;
 }
 const centralSize=central.reduce((s,b)=>s+b.length,0),end=datasetHeader(22),d=end.view;d.setUint32(0,0x06054b50,true);d.setUint16(8,files.length,true);d.setUint16(10,files.length,true);d.setUint32(12,centralSize,true);d.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end.bytes],{type:'application/zip'});
}
async function datasetUnzip(file){
 if(file.size>140*1024*1024)throw Error('ZIP quá lớn; giới hạn 140 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer),files=new Map();let at=0,total=0;
 while(at+4<=bytes.length&&v.getUint32(at,true)===0x04034b50){
  if(at+30>bytes.length)throw Error('ZIP bị cắt');
  const flags=v.getUint16(at+6,true),method=v.getUint16(at+8,true),size=v.getUint32(at+18,true),unpacked=v.getUint32(at+22,true),n=v.getUint16(at+26,true),extra=v.getUint16(at+28,true),start=at+30+n+extra,end=start+size;
  if((flags&9)||method!==0||size!==unpacked)throw Error('Hãy dùng ZIP xuất trực tiếp từ demo/tool nhãn (ZIP không nén).');
  if(end>bytes.length)throw Error('ZIP bị cắt');const name=datasetSafeName(datasetDecoder.decode(bytes.subarray(at+30,at+30+n))),data=bytes.slice(start,end);
  total+=size;if(files.has(name)||files.size>=1000||total>128*1024*1024)throw Error('ZIP trùng tên hoặc vượt giới hạn');
  if(datasetCRC(data)!==v.getUint32(at+14,true))throw Error('CRC không khớp: '+name);files.set(name,data);at=end;
 }
 if(!files.size||at+4>bytes.length||v.getUint32(at,true)!==0x02014b50)throw Error('Không phải bộ ZIP hợp lệ');return files;
}
let datasetSaveURL=null;
function datasetDownload(blob,name){
 // ZIP generation may outlive transient activation. Wait for a fresh explicit
 // click, and use the save picker rather than automatic anchor downloads.
 let dialog=document.getElementById('datasetSaveDialog');if(dialog){dialog.close();dialog.remove()}
 if(datasetSaveURL)URL.revokeObjectURL(datasetSaveURL);datasetSaveURL=URL.createObjectURL(blob);
 dialog=document.createElement('dialog');dialog.id='datasetSaveDialog';dialog.style.cssText='background:#101519;color:#d2dade;border:1px solid #567078;border-radius:12px;max-width:520px;padding:24px';
 const title=document.createElement('h2');title.textContent='Tệp đã sẵn sàng';
 const info=document.createElement('p');info.textContent=`${name} · ${(blob.size/1048576).toFixed(2)} MB`;
 const message=document.createElement('p');message.id='datasetSaveMessage';message.setAttribute('role','status');message.textContent='Bấm Lưu tệp để chọn nơi lưu. Tệp chưa được ghi xuống máy.';
 const save=document.createElement('button');save.id='datasetSaveNative';save.textContent='Lưu tệp…';save.hidden=typeof window.showSaveFilePicker!=='function';
 const link=document.createElement('a');link.id='datasetSaveLink';link.textContent='Tải bằng trình duyệt';link.href=datasetSaveURL;link.download=name;link.style.cssText='display:inline-block;margin:12px;color:#8dd3d0';
 const close=document.createElement('button');close.id='datasetSaveClose';close.textContent='Đóng';close.onclick=()=>dialog.close();
 save.onclick=async()=>{let stream=null;save.disabled=true;try{const zip=name.toLowerCase().endsWith('.zip'),handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:zip?'ZIP dataset':'JSON labels',accept:zip?{'application/zip':['.zip']}:{'application/json':['.json']}}]});stream=await handle.createWritable();await stream.write(blob);await stream.close();stream=null;dialog.close()}catch(error){if(stream)try{await stream.abort()}catch{}message.textContent=error.name==='AbortError'?'Đã hủy chọn nơi lưu. Tệp vẫn sẵn sàng, có thể thử lại.':'Không mở/ghi được tệp: '+error.message+'. Bạn có thể dùng liên kết tải bằng trình duyệt.'}finally{save.disabled=false}};
 link.addEventListener('click',()=>dialog.close());
 if(save.hidden)message.textContent='Bấm liên kết Tải bằng trình duyệt để lưu tệp. Trang không tự tải tệp.';
 dialog.append(title,info,message,save,link,close);document.body.append(dialog);dialog.showModal();(save.hidden?link:save).focus();return dialog;
}
window.addEventListener('pagehide',()=>{if(datasetSaveURL)URL.revokeObjectURL(datasetSaveURL)});
function datasetCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function datasetPNG(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Không xuất được PNG')),'image/png'))}
async function datasetBitmap(bytes){return createImageBitmap(new Blob([bytes],{type:'image/png'}))}
function datasetMaskCanvas(mask,w,h,width=w,height=h){const c=datasetCanvas(w,h),ctx=c.getContext('2d'),image=ctx.createImageData(w,h);for(let i=0;i<mask.length;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=mask[i]?255:0;image.data[i*4+3]=255}ctx.putImageData(image,0,0);if(w===width&&h===height)return c;const full=datasetCanvas(width,height),f=full.getContext('2d');f.imageSmoothingEnabled=false;f.drawImage(c,0,0,width,height);return full}
// Transform the full ellipse conic, including anisotropic resize and pixel centers.
function datasetEllipse(e,fromW,fromH,toW,toH){if(!e)return null;const sx=toW/fromW,sy=toH/fromH,ca=Math.cos(e.angle),sa=Math.sin(e.angle),a=sx*sx*(e.rx*e.rx*ca*ca+e.ry*e.ry*sa*sa),c=sy*sy*(e.rx*e.rx*sa*sa+e.ry*e.ry*ca*ca),b=sx*sy*(e.rx*e.rx-e.ry*e.ry)*ca*sa,d=Math.hypot(a-c,2*b);return {cx:(e.cx+.5)*sx-.5,cy:(e.cy+.5)*sy-.5,rx:Math.sqrt(Math.max(0,(a+c+d)/2)),ry:Math.sqrt(Math.max(0,(a+c-d)/2)),angle:.5*Math.atan2(2*b,a-c)}}
