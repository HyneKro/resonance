import test from 'node:test';
import assert from 'node:assert/strict';
import {editionStyle,editionMetadata} from '../public/music-edition.js';
import fs from 'node:fs/promises';
test('Music only composition and style are identical on both platforms',async()=>{
 for(const name of ['music-edition.js','music-edition.css'])assert.deepEqual(await fs.readFile('public/'+name),await fs.readFile('android/shared/'+name));
});
test('listening editions reflect known genres without inventing missing music details',()=>{
 assert.equal(editionStyle('Jazz, Soul'),'editorial');
 assert.equal(editionStyle('Alternative Rock'),'poster');
 assert.equal(editionStyle('Cinematic Ambient'),'nocturne');
 assert.equal(editionStyle('Electronic'),'prism');
 assert.deepEqual(editionMetadata(),{style:'prism',artist:'Your collection',album:'',year:'',genre:'',format:''});
 assert.equal(editionMetadata({date:'2024-10-12',codec:'flac',sampleRate:96000,bits:24}).format,'FLAC / 96 kHz / 24 bit');
 assert.equal(editionMetadata({date:'unknown'}).year,'');
 assert.equal(editionMetadata({artist:'A & B',album:'<script>',date:'2022'}).album,'<script>','text is retained for textContent, never HTML');
});
