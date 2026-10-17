import { BANDS } from './analysis.js';
export function drawClassic(canvas,rect,mode,hero,reactor){
  const w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio,1.5);if(!w||!h)return;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const d=reactor.dynamics.output,b=reactor.features.bands,t=reactor.reduced?0:d.motion;
  const hue=d.hue,energy=(b[0]+b[1])*.5,x=hero?w*.74:w*.5,y=h*.45,r=Math.min(w*(hero?.18:.25),h*.29);
  const color=(offset,alpha=.6,light=65)=>`hsla(${hue+offset},75%,${light}%,${alpha*Math.min(1.4,reactor.intensity)})`;
  const glow=c.createRadialGradient(x,y,5,x,y,r*2.6);glow.addColorStop(0,color(0,.09+energy*.1,55));glow.addColorStop(.5,color(45,.035));glow.addColorStop(1,color(90,0));c.fillStyle=glow;c.fillRect(0,0,w,h);
  if(mode==='spectrum'&&!hero){
    const bw=w*.72/8,base=h*.53;
    for(let i=0;i<8;i++){
      const height=7+b[i]*h*.27,cx=w*.14+(i+.5)*bw,width=bw*(.42+d.shape*.18);
      const gradient=c.createLinearGradient(0,base-height,0,base);gradient.addColorStop(0,color(i*10,.9,78));gradient.addColorStop(1,color(i*10+60,.25,46));
      c.fillStyle=gradient;c.beginPath();c.roundRect(cx-width/2,base-height,width,height,Math.min(width/2,7+d.flow*22));c.fill();
      c.strokeStyle=color(i*10,.65);c.lineWidth=1.5;c.beginPath();c.moveTo(cx-width/2,base-height-5);c.lineTo(cx+width/2,base-height-5);c.stroke();
      // Each frequency gets a halo with its own harmonic structure, while bars stay readable.
      for(let k=0;k<3;k++){c.beginPath();c.ellipse(cx,base-height*.6,width*(.5+k*.17),Math.max(3,height*(.2+k*.04)),Math.sin(t*.2+i)*d.shape*.18,0,Math.PI*2);c.strokeStyle=color(i*10+k*12,.05+b[i]*.05);c.stroke();}
      c.fillStyle='#d4c7df';c.font='11px Segoe UI';c.textAlign='center';c.fillText(BANDS[i].name,cx,base+27);c.fillStyle='#8c8196';c.font='9px Segoe UI';c.fillText(BANDS[i].label,cx,base+44);
    }return;
  }
  if(mode==='ribbons'&&!hero){
    const rows=reactor.quality==='eco'?24:42;
    for(let row=0;row<rows;row++){
      const layer=row/(rows-1),band=b[Math.min(7,Math.floor(layer*8))];c.beginPath();
      for(let px=0;px<=w;px+=5){const a=px/w,envelope=Math.sin(a*Math.PI),phase=a*(7+d.shape*7)+t*.48+layer*2.6;
        const wav=reactor.visualWave&&reactor.reactiveActive?reactor.visualWave[Math.floor(a*(reactor.visualWave.length-1))]:0;
        const curve=Math.sin(phase)*(25+energy*70)+Math.sin(a*17-t*.31+layer*4)*(10+d.spread*22+band*22);
        const fan=(layer-.5)*(65+d.flow*110)*Math.cos(a*3+t*.08);
        c.lineTo(px,y+envelope*(curve+wav*(25+band*45)+fan));
      }
      const gradient=c.createLinearGradient(0,0,w,0);gradient.addColorStop(0,color(layer*65,.02));gradient.addColorStop(.35,color(layer*65,.18+layer*.22));gradient.addColorStop(.7,color(70+layer*50,.25));gradient.addColorStop(1,color(120,.015));c.strokeStyle=gradient;c.lineWidth=.6+layer*.7;c.stroke();
    }return;
  }
  const rings=hero?32:reactor.quality==='eco'?32:56;
  for(let ring=0;ring<rings;ring++){
    const layer=ring/rings,rr=r*(.62+layer*.48);c.beginPath();
    for(let i=0;i<=256;i++){
      const a=i/256*Math.PI*2,bandPosition=(i/256*8)%8,idx=Math.floor(bandPosition),band=b[idx]*(1-bandPosition+idx)+b[(idx+1)%8]*(bandPosition-idx);
      const low=Math.sin(a*3+t*.31+layer*4),high=Math.cos(a*7-t*.22+layer*3);
      const morph=low*(1-d.shape)+high*d.shape,displacement=morph*(.045+d.spread*.06+energy*.04);
      const radius=rr*(1+displacement+band*.10),turn=a+t*.045;
      const perspective=1+Math.sin(a+layer*3)*d.flow*.09;
      c.lineTo(x+Math.cos(turn)*radius*(1.08+d.shape*.18)/perspective,y+Math.sin(turn)*radius*(.88-d.shape*.17)/perspective);
    }
    c.closePath();c.strokeStyle=color(layer*90,.09+layer*.26,53+layer*23);c.lineWidth=hero?.65:.75+layer*.45;c.stroke();
  }
  for(let i=0;i<(hero?32:90);i++){
    const a=i*2.399+t*(.015+(i%3)*.007),radius=r*(1.2+(i%13)*.045+Math.sin(t*.1+i)*d.spread*.05);
    c.fillStyle=color(i%80,.17+b[i%8]*.3,75);c.beginPath();c.arc(x+Math.cos(a)*radius,y+Math.sin(a)*radius*(.6+d.shape*.2),i%9===0?1.5:.65,0,Math.PI*2);c.fill();
  }
}
