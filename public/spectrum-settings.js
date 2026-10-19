export const SPECTRUM_SETTINGS=Object.freeze({
 spectrumIntensity:{label:'Spectrum intensity',min:0,max:12,value:.75},
 spectrumContrast:{label:'Spectrum contrast',min:.125,max:16,step:.025,value:2}
});
export function spectrumNumber(key,value){const s=SPECTRUM_SETTINGS[key];return Number.isFinite(value)?Math.max(s.min,Math.min(s.max,value)):s.value;}
export function spectrumPreferences(saved){
 let intensity=saved.spectrumIntensity,contrast=saved.spectrumContrast;
 if(saved.spectrumDesignVersion!==2){
  // Adopt the new defaults for the old preset; retain deliberate adjustments.
  if(intensity===1.5)intensity=undefined;
  contrast=Number.isFinite(contrast)&&contrast!==2.6?1/Math.max(.5,Math.min(8,contrast)):undefined;
 }
 return {spectrumIntensity:spectrumNumber('spectrumIntensity',intensity),spectrumContrast:spectrumNumber('spectrumContrast',contrast),spectrumDesignVersion:2};
}
