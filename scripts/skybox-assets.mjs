import fs from 'node:fs/promises';
import path from 'node:path';

// The owner's licensed, optimized renders stay outside source control. Only an
// incorporated rendition is included in the finished application.
export async function embedSkybox(root, destination, platform='desktop') {
  const source=path.join(root,'.private','skybox',`${platform}.webp`);
  let bytes;
  try { bytes=await fs.readFile(source); }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  const output=path.join(destination,'constellation-sky-texture.js');
  if(!bytes){await fs.copyFile(path.join(root,'public','constellation-sky-texture.js'),output);return false;}
  if(bytes.length>4_000_000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Expected an optimized WebP sky panorama under 4 MB.');
  await fs.writeFile(output,`// Space Skybox Collection 4 by Makemake. Licensed for use within Resonance only.\nexport const skyTexture = ${JSON.stringify('data:image/webp;base64,'+bytes.toString('base64'))};\n`);
  return true;
}
