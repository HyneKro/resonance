// Reviewed source-pose order, not generated in-between anatomy. Each excursion
// returns along its approach before the opposite side starts. This prevents the
// original sheets' neutral resets, hand swaps and stray blinks becoming twitches.
const rock=(a,b)=>[0,...a,...a.slice(0,-1).reverse(),0,...b,...b.slice(0,-1).reverse()];
const wave=(a,b,c)=>[0,a,b,c,b,c,b,a];
const cheer=(low,high,smile)=>[0,low,high,smile,high,low];
const defaults={
 'head-bob':rock([1,2],[6,8]),
 'two-step':rock([1,2],[8,9]),
 'soft-bounce':rock([1,2],[6,7]),
 'shoulder-groove':rock([9,1],[7,2]),
 'hand-wave':wave(1,2,3),
 'side-sway':rock([1,3],[2,6]),
 cheer:cheer(1,2,5),
 // Front separates the two quarter-turns; the sheets do not contain a
 // coherent full back-facing turn. Never jump directly between side views.
 twirl:rock([1],[2,3]),
};
// Each entry was checked against its own sheet: the same cell number is not
// necessarily the same action in another character's drawings.
export const GUEST_CHOREOGRAPHY=Object.freeze({
 miku:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,4),cheer:cheer(1,2,6)},
 kirby:{'two-step':rock([1],[8]),'side-sway':rock([1,2,3],[7,8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 frieren:{'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(8,2,5)},
 '2b':{'head-bob':rock([1,2],[6,7]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,4),cheer:cheer(1,2,5)},
 'neco-arc':{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 creeper:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[8,9]),'hand-wave':rock([1,2],[7,8]),cheer:cheer(1,2,6)},
 jinx:{'two-step':rock([1,2],[6,7]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 vi:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 jayce:{'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 heimerdinger:{'head-bob':rock([1,2],[6,8]),'two-step':rock([1,2],[8,9]),'hand-wave':wave(8,2,3),cheer:cheer(1,2,4)},
 ekko:{'head-bob':rock([1,1],[8,8]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(2,3,5)},
 goku:{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(2,3,5)},
 chopper:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 gojo:{'head-bob':rock([1,2],[5,6]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(10,2,1),cheer:cheer(1,2,3)},
 rem:{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(2,3,5)},
 'sailor-moon':{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[7,8]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,6)},
 totoro:{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 saitama:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 asuka:{'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,6)},
 guts:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(2,3,4),cheer:cheer(1,2,3)},
 sasuke:{'head-bob':rock([1,2],[6,7]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(2,3,1),cheer:cheer(1,2,6)},
 naruto:{'head-bob':rock([1,2],[9,10]),'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 luffy:{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 'astro-boy':{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,4)},
 megumin:{'head-bob':rock([1,2],[9,10]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 'zero-two':{'head-bob':rock([1,2],[5,6,7]),'two-step':rock([1,2],[7,8]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,3)},
 fern:{'head-bob':rock([1,2],[5,6]),'two-step':rock([1,3],[8,9]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 aang:{'head-bob':rock([1,2],[7,8]),'two-step':rock([1,3],[6,7]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
 'sung-jin-woo':{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2,3),cheer:cheer(1,2,5)},
});
export function guestFrames(id,name){return GUEST_CHOREOGRAPHY[id]?.[name]||defaults[name];}

// These two Sona loops had isolated downwards head snaps. Return through the
// stable approach drawings; leave her other approved dances unchanged.
export const SONA_REVIEWED_FRAMES=Object.freeze({
 'shoulder-groove':[0,1,0,4,5,4],
 'side-sway':[0,1,0,4,5,6,5,4],
});

// Guest pickup art has only three successive lift poses. Cell 111 is standing
// again, not the first held pose. Keep the suspended drawing and let the carry
// controller supply a small pendulum motion instead of cycling kicking legs.
export const GUEST_INTERACTIONS=Object.freeze({
 idle:{row:12,frames:[0,3,4,3,0],times:[4.4,1/12,1/12,1/12,.25]},
 sleep:{row:8,frames:[0,1,2,1],times:[.8,.8,.8,.8]},
 clicked:{row:9,frames:[0,1,2,1,0],times:[1/12,1/8,1/12,1/8,.25]},
 pickup:{row:10,frames:[0,1,2],times:[1/12,1/8,1/8]},
 held:{row:10,frames:[2],times:[1]},
 drop:{row:11,rows:[10,11,11,11,11],frames:[2,0,2,4,6],times:[1/12,1/12,1/12,1/8,.25]},
});
