import test from 'node:test';
import assert from 'node:assert/strict';
import {preferencesWithDefaults,DEFAULT_PREFERENCES} from '../public/default-preferences.js';
import {VISUAL_SETTINGS,visualNumber} from '../public/visual-settings.js';
test('spectrum defaults, reset values and maximums agree',()=>{
 const p=preferencesWithDefaults();assert.equal(p.spectrumIntensity,.75);assert.equal(p.spectrumContrast,2);
 for(const k of ['spectrumIntensity','spectrumContrast'])assert.equal(VISUAL_SETTINGS[k].value,DEFAULT_PREFERENCES[k]);
 assert.equal(visualNumber('spectrumIntensity',99),12);assert.equal(visualNumber('spectrumContrast',99),16);
});
test('updating translates old custom contrast once while adopting new preset defaults',()=>{
 const p=preferencesWithDefaults({spectrumIntensity:.75,spectrumContrast:.5});assert.equal(p.spectrumContrast,2);assert.equal(p.spectrumIntensity,.75);
 assert.deepEqual(preferencesWithDefaults(p),p);
 assert.equal(preferencesWithDefaults({spectrumIntensity:1.5,spectrumContrast:2.6}).spectrumIntensity,.75);
 for(const v of [.5,1,3,8])assert.equal(preferencesWithDefaults({spectrumContrast:v}).spectrumContrast,1/v);
 assert.equal(preferencesWithDefaults({...p,spectrumContrast:16,spectrumIntensity:12}).spectrumContrast,16);
});
test('phone overrides do not mask old settings migration or alter mobile defaults',()=>{
 const defaults={...DEFAULT_PREFERENCES,quality:'eco',bloom:.18,visualSyncAuto:false};
 const p=preferencesWithDefaults({spectrumContrast:.5},defaults);
 assert.equal(p.spectrumContrast,2);assert.equal(p.quality,'eco');assert.equal(p.bloom,.18);assert.equal(p.visualSyncAuto,false);
});
