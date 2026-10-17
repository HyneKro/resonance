import path from 'node:path';
export const normalize = s => String(s || '').normalize('NFKC').toLowerCase().replace(/\[[\w-]{11}\]$/u, '').replace(/[^\p{L}\p{N}]/gu, '');
export const searchArtist=s=>[...new Map(String(s||'').replace(/\s+-\s+Topic$/i,'').split(/,\s*/).map(x=>[normalize(x),x.trim()])).values()].filter(Boolean).join(', ');
export function searchTitle(s,artist=''){
 let title=String(s||'').normalize('NFKC').replace(/\s*[\[(](?:(?:4k|hd)\s+)?(?:official(?:\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music video|lyrics?(?: video)?|audio|visuali[sz]er|monstercat release)[\])]/gi,'').replace(/\s+official (?:music video|lyric video|audio|visuali[sz]er)$/i,'').replace(/\s*\[[\w-]{11}\]$/,'').trim();
 const parts=title.split(/\s+[-–—]\s+/);if(parts.length>1&&normalize(parts[0])===normalize(searchArtist(artist)))title=parts.slice(1).join(' - ');
 return title;
}
export function inferName(file) {
  let name = path.basename(file, path.extname(file)).normalize('NFKC').replace(/\s*\[[\w-]{11}\]$/, '');
  const rawTitle = name;
  const genre = name.match(/^\[([^\]]+)\]/)?.[1] || '';
  name = name.replace(/^\[[^\]]+\]\s*-?\s*/, '').replace(/\s*[\[(](?:official[^\])]*|music video|lyric[^\])]*|audio|visuali[sz]er|monstercat release)[\])]/gi, '').trim();
  const parts = name.split(/\s+[-–—]\s+/);
  return { rawTitle, title: parts.length > 1 ? parts.slice(1).join(' - ') : name, artist: parts.length > 1 ? parts[0] : '', genre: /^(ambient|chillout|chilltrap|chiptune|dnb|drum & bass|dubstep|electronic|house|trap|lofi|rock)$/i.test(genre) ? genre : '' };
}
export function matchScore(track, candidate) {
  const clean = (s,artist) => normalize(searchTitle(s,artist).replace(/\s*\((?:feat\.|ft\.).*?\)/gi,''));
  const a = clean(track.title,track.artist), b = clean(candidate.title,candidate.artist);
  const artist = normalize(searchArtist(track.artist)), other = normalize(searchArtist(candidate.artist));
  const titleScore = a === b ? 1 : (a.length > 5 && (a.includes(b) || b.includes(a))) ? .72 : 0;
  const artistScore = artist && (other === artist || other.startsWith(artist)) ? 1 : 0;
  const durationScore = candidate.duration && track.duration ? Math.abs(candidate.duration - track.duration) <= 4 ? 1 : 0 : 0;
  const versions = s => [...String(s).toLowerCase().matchAll(/\b(remix|live|cover|acoustic|instrumental|nightcore|slowed|sped|remaster)\b/g)].map(x=>x[1]).sort().join(',');
  if (versions(track.rawTitle || track.title) !== versions(candidate.title)) return Math.min(.6, titleScore*.5+artistScore*.3+durationScore*.2);
  return titleScore*.5 + artistScore*.3 + durationScore*.2;
}
export function classifyEntry(entry, tracks, archived = new Set()) {
  if (archived.has(entry.id)) return {status:'existing', reason:'Download archive'};
  const idMatch = tracks.find(t=>t.available && (t.youtubeId===entry.id || t.path.includes(`[${entry.id}]`)));
  if(idMatch) return {status:'existing', trackId:idMatch.id, reason:'YouTube ID'};
  const n=normalize(entry.title);
  const exact=tracks.filter(t=>t.available && normalize(t.rawTitle)===n && (n.length>=3 || t.rawTitle.normalize('NFKC').toLowerCase()===String(entry.title).normalize('NFKC').toLowerCase()));
  if(exact.length===1 && (!entry.duration || !exact[0].duration || Math.abs(entry.duration-exact[0].duration)<8)) return {status:'existing',trackId:exact[0].id,reason:'Exact filename'};
  const similar=tracks.filter(t=>t.available && n.length>=8 && (normalize(t.rawTitle).includes(n) || n.includes(normalize(t.rawTitle))) && normalize(t.rawTitle).length>=8);
  if(exact.length || similar.length) return {status:'review',reason:'Possible existing file',trackId:(exact[0]||similar[0]).id};
  if(!entry.title || /^(\[?deleted video\]?|\[?private video\]?)$/i.test(entry.title)) return {status:'unavailable',reason:'Unavailable on YouTube'};
  return {status:'new',reason:'Not in local library'};
}
