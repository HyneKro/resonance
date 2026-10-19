package music.resonance.mobile;

import java.util.Random;
import org.json.JSONArray;
import org.junit.Test;
import static org.junit.Assert.*;

public class SpectrumTransformTest {
    // Independent pre-optimisation transform, retained as a numerical reference.
    static JSONArray reference(float[] samples,int n){
        double[] re=new double[n],im=new double[n];for(int i=0;i<n;i++)re[i]=samples[samples.length-n+i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
        for(int i=1,j=0;i<n;i++){int bit=n>>1;for(;(j&bit)!=0;bit>>=1)j^=bit;j^=bit;if(i<j){double tmp=re[i];re[i]=re[j];re[j]=tmp;}}
        for(int size=2;size<=n;size<<=1){double a=-2*Math.PI/size;for(int start=0;start<n;start+=size)for(int k=0;k<size/2;k++){double co=Math.cos(a*k),si=Math.sin(a*k);int p=start+k,q=p+size/2;double tr=co*re[q]-si*im[q],ti=co*im[q]+si*re[q];re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;}}
        JSONArray result=new JSONArray();for(int i=0;i<n/2;i++){double power=Math.hypot(re[i],im[i])*4/n;result.put((int)Math.round(Math.max(-100,Math.min(0,20*Math.log10(Math.max(1e-7,power))))));}return result;
    }
    @Test public void reusedPlansPreserveEveryBinAndDoNotLeakThePreviousSignal() throws Exception {
        Random random=new Random(619);float[] samples=new float[8192];
        for(int n:new int[]{1024,2048,8192}){
            SpectrumTransform plan=new SpectrumTransform(n);
            for(int fixture=0;fixture<12;fixture++){
                for(int i=0;i<samples.length;i++)samples[i]=switch(fixture%4){
                    case 0 -> (float)(.3*Math.sin(i*.011)+.16*Math.cos(i*.32));
                    case 1 -> (random.nextFloat()-.5f)*.4f;
                    case 2 -> 0f;
                    default -> i==samples.length-41?.8f:0f;
                };
                JSONArray expected=reference(samples,n),actual=plan.measure(samples);
                assertEquals(expected.length(),actual.length());
                for(int bin=0;bin<actual.length();bin++)assertEquals("Window "+n+", signal "+fixture+", bin "+bin,expected.getInt(bin),actual.getInt(bin));
            }
        }
    }
    @Test public void rejectsIncompleteFrames(){
        assertThrows(IllegalArgumentException.class,()->new SpectrumTransform(1000));
        assertThrows(IllegalArgumentException.class,()->new SpectrumTransform(2048).measure(new float[1024]));
    }
}
