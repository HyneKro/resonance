package music.resonance.mobile;

import java.util.Arrays;
import org.json.JSONArray;

/** Reusable Hann-window FFT plan. Owned by the synchronized analysis worker. */
final class SpectrumTransform {
    private final int n;
    private final int[] reversed;
    private final double[] window,cos,sin,re,im;
    SpectrumTransform(int size){
        if(size<2||Integer.bitCount(size)!=1)throw new IllegalArgumentException("FFT size must be a power of two");
        n=size;reversed=new int[n];window=new double[n];cos=new double[n/2];sin=new double[n/2];re=new double[n];im=new double[n];
        int shift=32-Integer.numberOfTrailingZeros(n);
        for(int i=0;i<n;i++){reversed[i]=Integer.reverse(i)>>>shift;window[i]=.5-.5*Math.cos(2*Math.PI*i/(n-1));}
        for(int i=0;i<n/2;i++){cos[i]=Math.cos(-2*Math.PI*i/n);sin[i]=Math.sin(-2*Math.PI*i/n);}
    }
    JSONArray measure(float[] samples){
        if(samples.length<n)throw new IllegalArgumentException("Not enough samples");
        Arrays.fill(im,0);
        for(int i=0;i<n;i++)re[reversed[i]]=samples[samples.length-n+i]*window[i];
        for(int size=2;size<=n;size<<=1){int stride=n/size;for(int start=0;start<n;start+=size)for(int k=0;k<size/2;k++){
            double co=cos[k*stride],si=sin[k*stride];int p=start+k,q=p+size/2;
            double tr=co*re[q]-si*im[q],ti=co*im[q]+si*re[q];re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;
        }}
        JSONArray result=new JSONArray();for(int i=0;i<n/2;i++){double power=Math.hypot(re[i],im[i])*4/n;result.put((int)Math.round(Math.max(-100,Math.min(0,20*Math.log10(Math.max(1e-7,power))))));}return result;
    }
}
