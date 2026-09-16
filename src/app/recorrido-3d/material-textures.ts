import type * as Three from 'three';
// Deterministic, seamless material maps generated locally: no panoramic photos or CDN.
export function materialTexture(T:typeof Three,kind:'wood'|'plaster'|'tile'|'gravel'|'grass'|'fabric'|'metal',color:string){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
 if(!c)return null;c.fillStyle=color;c.fillRect(0,0,512,512);
 let seed=731;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<18000;i++){const x=random()*512,y=random()*512;c.fillStyle=random()>.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.07)';c.fillRect(x,y,1+random()*3,1+random()*3)}
 if(kind==='wood')for(let i=0;i<600;i++){const y=random()*512;c.strokeStyle=i%2?'rgba(65,37,17,.14)':'rgba(241,216,163,.22)';c.lineWidth=.4+random()*1.4;c.beginPath();for(let x=0;x<=512;x+=8){const yy=y+Math.sin(x/512*Math.PI*2+i)*2;c.lineTo(x,yy)}c.stroke()}
 if(kind==='tile'){c.strokeStyle='#a99e8e';c.lineWidth=2;c.strokeRect(0,0,512,512);for(let i=0;i<35;i++){c.strokeStyle='rgba(135,126,110,.07)';c.beginPath();c.moveTo(0,random()*512);c.bezierCurveTo(150,random()*512,300,random()*512,512,random()*512);c.stroke()}}
 if(kind==='gravel')for(let i=0;i<1300;i++){const x=random()*512,y=random()*512,r=2+random()*7;c.fillStyle=['#a6a39a','#cecabd','#8b8c88','#b9b5aa'][i%4];c.beginPath();c.ellipse(x,y,r,r*.65,random()*Math.PI,0,Math.PI*2);c.fill();c.strokeStyle='#62676066';c.lineWidth=.7;c.stroke()}
 if(kind==='grass')for(let i=0;i<9000;i++){const x=random()*512,y=random()*512;c.strokeStyle=['#6f8056','#8b9c68','#526b48'][i%3];c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*4-2,y-3-random()*6);c.stroke()}
 if(kind==='fabric')for(let i=0;i<512;i+=3){c.strokeStyle='rgba(255,255,255,.12)';c.beginPath();c.moveTo(0,i);c.lineTo(512,i);c.moveTo(i,0);c.lineTo(i,512);c.stroke()}
 if(kind==='metal')for(let x=0;x<512;x+=64){c.fillStyle='#ffffff14';c.fillRect(x,0,3,512);c.fillStyle='#00000033';c.fillRect(x+3,0,2,512)}
 const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 return {map,bump};
}
