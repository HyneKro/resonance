// The guest art supplies the same eight pose slots as Sona. A loop has two
// restrained excursions, with one neutral passage between them. Do not run
// longer forward/reverse chains at a different cadence for each character.
const rock=(a,b)=>[0,a[0],a[1]??a[0],a[0],0,b[0],b[1]??b[0],b[0]];
// Keep the waving arm raised throughout the loop. The old neutral frame and
// third drawing could switch hands or blink, producing a visible pop.
const wave=(a,b)=>[a,a,b,b,a,a,b,b];
const cheer=(low,high,smile)=>[0,low,high,high,smile,high,low,0];
const defaults={
 'head-bob':rock([1,2],[6,8]),
 'two-step':rock([1,2],[8,9]),
 'soft-bounce':rock([1,2],[6,7]),
 'shoulder-groove':rock([9,1],[7,2]),
 'hand-wave':wave(1,2),
 'side-sway':rock([1,3],[2,6]),
 cheer:cheer(1,2,5),
 // Front separates the two quarter-turns; the sheets do not contain a
 // coherent full back-facing turn. Never jump directly between side views.
 twirl:rock([1],[2,3]),
};
// Each entry was checked against its own sheet: the same cell number is not
// necessarily the same action in another character's drawings.
export const GUEST_CHOREOGRAPHY=Object.freeze({
 miku:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,6)},
 kirby:{'two-step':rock([1],[8]),'side-sway':rock([1,2,3],[7,8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 frieren:{'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(8,2,5)},
 '2b':{'head-bob':rock([1,2],[6,7]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 'neco-arc':{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 creeper:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[8,9]),'hand-wave':rock([1,2],[7,8]),cheer:cheer(1,2,6)},
 jinx:{'two-step':rock([1,2],[6,7]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 vi:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(2,4),cheer:cheer(1,2,5)},
 jayce:{'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 heimerdinger:{'head-bob':rock([1,2],[6,8]),'two-step':rock([1,2],[8,9]),'hand-wave':wave(8,2),cheer:cheer(1,2,4)},
 ekko:{'head-bob':rock([1,1],[8,8]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,3),cheer:cheer(2,3,5)},
 goku:{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(2,3,5)},
 chopper:{'head-bob':rock([1,2],[6,7,8]),'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 gojo:{'head-bob':rock([1,2],[5,6]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,3)},
 rem:{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(2,3,5)},
 'sailor-moon':{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[7,8]),'hand-wave':wave(1,2),cheer:cheer(1,2,6)},
 totoro:{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 saitama:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 asuka:{'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,6)},
 guts:{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(2,3),cheer:cheer(1,2,3)},
 sasuke:{'head-bob':rock([1,2],[6,7]),'two-step':rock([1,2],[8,9]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(2,3),cheer:cheer(1,2,6)},
 naruto:{'head-bob':rock([1,2],[9,10]),'two-step':rock([1,2],[9,10]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(2,6),cheer:cheer(1,2,4)},
 luffy:{'two-step':rock([1,2],[8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 'astro-boy':{'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,4)},
 megumin:{'head-bob':rock([1,2],[9,10]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 'zero-two':{'head-bob':rock([1,2],[5,6,7]),'two-step':rock([1,2],[7,8]),'soft-bounce':rock([1,2,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,3)},
 fern:{'head-bob':rock([1,2],[5,6]),'two-step':rock([1,3],[8,9]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 aang:{'head-bob':rock([1,2],[7,8]),'two-step':rock([1,3],[6,7]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
 'sung-jin-woo':{'head-bob':rock([1,2],[8,9]),'two-step':rock([1,2],[9,10]),'hand-wave':wave(1,2),cheer:cheer(1,2,5)},
});
export function guestFrames(id,name){return GUEST_CHOREOGRAPHY[id]?.[name]||defaults[name];}

// These two Sona loops had isolated downwards head snaps. Return through the
// stable approach drawings; leave her other approved dances unchanged.
export const SONA_REVIEWED_FRAMES=Object.freeze({
 'shoulder-groove':[0,1,0,4,5,4],
 'side-sway':[0,1,0,4,5,6,5,4],
});

// Map Sona's eight interaction poses onto the existing guest artwork. Hold a
// drawing when no honest in-between exists; do not alternate unrelated poses.
export const GUEST_INTERACTION_CELLS=Object.freeze({
 sleep:[101,101,102,102,102,102,101,101],
 clicked:[104,105,106,106,105,105,104,104],
 pickup:[108,109,110,110,110,110,110,110],
 drop:[110,116,117,118,118,117,119,96],
 idle:[96,96,97,98,98,99,96,96],
});
