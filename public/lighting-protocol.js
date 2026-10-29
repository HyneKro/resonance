// Realtime LAN channel: BB, 16-bit payload length, opcode, payload, XOR.
// Host interpolation avoids the firmware gradient wrapping treble back to bass.
export function realtimePacket(op,payload){
 const bytes=new Uint8Array(payload.length+5);bytes.set([0xbb,payload.length>>8,payload.length&255,op]);bytes.set(payload,4);
 for(let i=0;i<bytes.length-1;i++)bytes[bytes.length-1]^=bytes[i];return bytes;
}
export const realtimeMode=on=>realtimePacket(0xb1,[on?1:0]);
export function realtimePixels(pixels){
 if(!Array.isArray(pixels)||pixels.length<1||pixels.length>255||!pixels.every(rgb=>Array.isArray(rgb)&&rgb.length===3&&rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255)))throw Error('Invalid light pixels.');
 return realtimePacket(0xb0,[0,pixels.length,...pixels.flat()]);
}
