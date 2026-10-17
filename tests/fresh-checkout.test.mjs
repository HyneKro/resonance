import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Library} from '../library.mjs';

test('a source checkout without personal config starts empty and keeps saved preferences',async()=>{
 const root=await fs.mkdtemp(path.resolve('test-output/fresh-checkout-'));
 let library=new Library(root,path.join(root,'data'));
 try{assert.deepEqual(library.config.sources,[]);assert.equal(library.config.autoEnrich,false);library.config.downloadFormat='original';library.setSetting('config',library.config);}finally{library.close();}
 library=new Library(root,path.join(root,'data'));try{assert.equal(library.config.downloadFormat,'original');assert.deepEqual(library.config.sources,[]);}finally{library.close();}
});
