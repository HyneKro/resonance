package music.resonance.mobile;

import org.json.JSONArray;
import org.junit.Test;
import static org.junit.Assert.*;

public class SpectrumTest {
    @Test public void silenceIsFiniteAndQuiet() throws Exception {
        JSONArray bins=SpectrumProcessor.fft(new float[8192],8192);
        assertEquals(4096,bins.length());
        for(int i=0;i<bins.length();i++)assertEquals(-100,bins.getInt(i));
    }
    @Test public void allAnalysisWindowsResolveTheirFrequencyBand() throws Exception {
        for(int n:new int[]{8192,2048,1024}){
            float[] pcm=new float[8192];double frequency=48000d*20/n;
            for(int i=0;i<pcm.length;i++)pcm[i]=(float)(.5*Math.sin(2*Math.PI*frequency*i/48000));
            JSONArray bins=SpectrumProcessor.fft(pcm,n);int peak=0;
            for(int i=1;i<bins.length();i++)if(bins.getInt(i)>bins.getInt(peak))peak=i;
            assertEquals("Peak frequency for window "+n,20,peak);
            assertEquals("A half-scale sine is -6 dB",-6,bins.getInt(peak),1);
        }
    }
    @Test public void catalogueNormalizationKeepsNonLatinTitlesDistinct(){
        assertEquals("beyoncehalo",Research.normalize("Beyoncé — Halo!"));
        assertNotEquals(Research.normalize("夜に駆ける"),Research.normalize("群青"));
    }
}
