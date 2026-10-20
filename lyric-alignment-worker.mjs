import {parentPort,workerData} from 'node:worker_threads';
import {alignLyrics} from './lyric-alignment.mjs';
try{parentPort.postMessage({value:alignLyrics(workerData.record,workerData.result,workerData.duration)});}catch(e){parentPort.postMessage({error:e.message});}
