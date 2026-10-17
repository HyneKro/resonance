// Eight frames per move, like a traditional desktop dance sheet. Each atlas
// uses the same illustrated character, including the interaction poses.
export const SONA_SHEETS=Object.freeze([{src:'/sona-motions.webp',columns:8,rows:13}]);
export const SONA_SOURCE_NAMES=Object.freeze(['head-bob','two-step','soft-bounce','shoulder-groove','hand-wave','side-sway','cheer','twirl','sleep','clicked','pickup-held','drop','idle']);
export const SONA_CLIPS=Object.freeze({
 'head-bob':{row:0,beats:2,weights:[2,1,1,2,2,1,1,2]},'two-step':{row:1,beats:2},
 'soft-bounce':{row:2,beats:2,weights:[2,1,1,1,1,1,1,2],eyeClose:[4]},'shoulder-groove':{row:3,beats:2},
 'hand-wave':{row:4,beats:4,weights:[1,1,2,1,1,1,2,1]},'side-sway':{row:5,beats:4},
 'cheer':{row:6,beats:2},'twirl':{row:7,beats:2},
 sleep:{row:8},clicked:{row:9},pickup:{row:10},held:{row:10},drop:{row:11},idle:{row:12},
});

// Locate the weight-bearing feet, not the bounding-box center (which swings
// with raised hands). Register once per pose so painted cells cannot jitter
// vertically or drift sideways merely because their transparent margins differ.
export function spriteFootAnchor(pixels,width,height){
 let bottom=-1;
 for(let y=height-1;y>=0;y--){let count=0;for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>160)count++;
  if(count>=Math.max(2,width*.012)){bottom=y;break;}
 }
 if(bottom<0)return {x:width/2,y:height*.9};
 let sum=0,weight=0;
 for(let y=Math.max(0,bottom-Math.ceil(height*.075));y<=bottom;y++)for(let x=0;x<width;x++){
  const a=pixels[(y*width+x)*4+3];if(a>160){sum+=(x+.5)*a;weight+=a;}
 }
 return {x:weight?sum/weight:width/2,y:bottom+1};
}
