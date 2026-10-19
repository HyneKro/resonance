// Old installations used one status for all fields. New edits lock only the
// fields the listener actually chose, including deliberately empty values.
export function metadataLocked(track,field){
 return !!track.metadataLocks?.[field] || field==='genre'&&!!track.genreLocked ||
  !track.metadataLocks&&['manual','confirmed'].includes(track.metadataStatus);
}
export function inheritedLocks(track){
 return track.metadataLocks?{...track.metadataLocks}:Object.fromEntries(
  ['title','artist','album','genre','date'].filter(k=>metadataLocked(track,k)).map(k=>[k,true]));
}
