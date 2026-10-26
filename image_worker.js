// Classical image processing in a worker: sliders never block the interface.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function histogram(a){const bins=new Uint32Array(256);for(const v of a)bins[v]++;return bins}
function percentile(a,p){const bins=histogram(a),target=Math.max(1,a.length*p/100);let sum=0;for(let i=0;i<256;i++){sum+=bins[i];if(sum>=target)return i}return 255}
function medianFilter(a,w,h,k){if(k===1)return a.slice();const out=new Uint8Array(a.length),r=k>>1,box=new Uint8Array(k*k);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let n=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)box[n++]=a[clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1)];box.sort();out[y*w+x]=box[box.length>>1]}return out}
function gaussianFilter(a,w,h,k){if(k===1)return a.slice();const r=k>>1,sigma=.3*((k-1)*.5-1)+.8,weights=[];let sum=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));weights.push(v);sum+=v}for(let i=0;i<k;i++)weights[i]/=sum;const temp=new Float32Array(a.length),out=new Uint8Array(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let dx=-r;dx<=r;dx++)v+=a[y*w+clamp(x+dx,0,w-1)]*weights[dx+r];temp[y*w+x]=v}for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let dy=-r;dy<=r;dy++)v+=temp[clamp(y+dy,0,h-1)*w+x]*weights[dy+r];out[y*w+x]=Math.round(v)}return out}
function morph(a,w,h,k,dilate){if(k===1)return a.slice();const r=k>>1,offsets=[];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)offsets.push([x,y]);const out=new Uint8Array(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=dilate?0:255;for(const [dx,dy]of offsets){const s=a[clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1)];v=dilate?Math.max(v,s):Math.min(v,s)}out[y*w+x]=v}return out}
function otsuThreshold(a){const b=histogram(a),n=a.length;let sum=0;for(let i=0;i<256;i++)sum+=b[i]*i;let c=0,s=0,best=-1,t=0;for(let i=0;i<256;i++){c+=b[i];s+=i*b[i];if(!c)continue;if(c===n)break;const d=s/c-(sum-s)/(n-c),score=c*(n-c)*d*d;if(score>best){best=score;t=i}}return t}
function candidate(a,w,h){return ellipsePupilComponents(a,w,h)}
self.onmessage=({data})=>{try{
const started=performance.now(),{pixels,w,h,p}=data,n=w*h,channels=[new Uint8Array(n),new Uint8Array(n),new Uint8Array(n)],inputGray=new Uint8Array(n);
for(let i=0;i<n;i++){for(let c=0;c<3;c++)channels[c][i]=pixels[i*4+c];inputGray[i]=Math.round(.299*channels[0][i]+.587*channels[1][i]+.114*channels[2][i])}
const mid=percentile(inputGray,50),gamma=p.autoGamma?(mid>=90&&mid<=170?1:clamp(Math.log(130/255)/Math.log(clamp(mid,1,254)/255),.4,1.4)):p.gamma,lut=new Uint8Array(256);for(let i=0;i<256;i++)lut[i]=Math.round(255*(i/255)**gamma);
const balanced=new Uint8ClampedArray(n*4);for(let i=0;i<n;i++){for(let c=0;c<3;c++){channels[c][i]=lut[channels[c][i]];balanced[i*4+c]=channels[c][i]}balanced[i*4+3]=255}
const filtered=channels.map(a=>medianFilter(a,w,h,p.median)),denoised=new Uint8ClampedArray(n*4),afterGray=new Uint8Array(n);
for(let i=0;i<n;i++){for(let c=0;c<3;c++)denoised[i*4+c]=filtered[c][i];denoised[i*4+3]=255;afterGray[i]=Math.round(.299*filtered[0][i]+.587*filtered[1][i]+.114*filtered[2][i])}
const x0=Math.floor(.18*w),y0=Math.floor(.20*h),rw=Math.floor(.87*w)-x0,rh=Math.floor(.85*h)-y0,gray=new Uint8Array(rw*rh),red=new Uint8Array(rw*rh),gate=new Uint8Array(rw*rh);let gateCount=0;
for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const i=y*rw+x,j=(y+y0)*w+x+x0;gray[i]=afterGray[j];red[i]=filtered[0][j];gate[i]=!p.colorGate||(filtered[0][j]-filtered[2][j]<=p.colorLimit&&gray[i]<200)?255:0;if(gate[i])gateCount++}
const smooth=gaussianFilter(p.channel==='red'?red:gray,rw,rh,p.gaussian),lo=percentile(smooth,p.low),hi=percentile(smooth,p.high),enhanced=new Uint8Array(smooth.length);
for(let i=0;i<smooth.length;i++)enhanced[i]=hi>lo?clamp(Math.round((smooth[i]-lo)*255/(hi-lo)),0,255):smooth[i];
// Estimate Otsu on color-eligible pixels, avoiding bright sclera dominating it.
const eligible=p.colorGate?enhanced.filter((_,i)=>gate[i]):enhanced;
const threshold=p.autoThreshold?otsuThreshold(eligible.length?eligible:enhanced):p.threshold,binary=new Uint8Array(enhanced.length);
for(let i=0;i<binary.length;i++)binary[i]=enhanced[i]<=threshold&&gate[i]?255:0;
let clean=binary.slice();for(let i=0;i<p.close;i++)clean=morph(clean,rw,rh,p.morph,true);for(let i=0;i<p.close;i++)clean=morph(clean,rw,rh,p.morph,false);for(let i=0;i<p.open;i++)clean=morph(clean,rw,rh,p.morph,false);for(let i=0;i<p.open;i++)clean=morph(clean,rw,rh,p.morph,true);
const pupil=candidate(clean,rw,rh);if(pupil){pupil.cx+=x0;pupil.cy+=y0}
self.postMessage({w,h,roi:{x:x0,y:y0,w:rw,h:rh},balanced,denoised,gray,red,enhanced,binary,clean,histBefore:histogram(inputGray),histAfter:histogram(afterGray),pupil,metrics:{gamma,threshold,median:mid,low:lo,high:hi,ms:performance.now()-started,gatePercent:gateCount/gate.length*100}});
}catch(e){self.postMessage({error:e.message})}};
