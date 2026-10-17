import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkKey,artworkURL,installArtworkRecovery} from '../android/web/mobile-artwork.js';
import {ArtworkPalette} from '../public/artwork-palette.js';
test('mobile requests recovery even when an initial cover download left no artwork field',()=>{
 assert.equal(artworkKey({id:'0123456789abcdef01234567'}),'0123456789abcdef01234567.jpg');
 assert.equal(artworkKey({id:'invalid'}),'');assert.equal(artworkKey({artwork:'saved.jpg'}),'saved.jpg');
 assert.equal(artworkURL('saved.jpg',3),'/artwork/saved.jpg?v=3');
});
test('cover recovery retries failed images and removes the fallback after successful loading',()=>{
 const listeners={},fallback={remove(){this.removed=true;},setAttribute(){}};let attached=false,notifications=0;
 const image={tagName:'IMG',classList:{contains:v=>v==='cover'},dataset:{},src:'https://appassets.androidplatform.net/artwork/saved.jpg',parentElement:{querySelector:()=>attached?fallback:null,append:()=>attached=true}};
 const root={addEventListener:(key,fn)=>listeners[key]=fn,createElement:()=>fallback,querySelectorAll:()=>image.dataset.coverFailed?[image]:[]};
 const refresh=installArtworkRecovery({root,onRecovered:()=>notifications++});listeners.error({target:image});assert.equal(image.hidden,true);assert.ok(attached);
 refresh(1);assert.ok(image.src.includes('?v='));assert.equal(notifications,1);refresh(1);assert.equal(notifications,1);
 listeners.load({target:image});assert.equal(image.hidden,false);assert.equal(image.dataset.coverFailed,undefined);assert.ok(fallback.removed);
});
test('palette can retry a previously missing cover without changing songs',async()=>{
 let decodes=0;const palette=new ArtworkPalette({read:async()=>null,write:async()=>{},onChange:()=>{},decode:async()=>{decodes++;throw Error('missing');}});
 await palette.select('cover.jpg');await palette.select('cover.jpg');assert.equal(decodes,1);await palette.retry();assert.equal(decodes,2);
});
