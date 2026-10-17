package music.resonance.mobile;
import org.json.*;
import java.util.*;

/** Streaming FFmpeg metadata reader; bounded to 3,600 time bins. */
public final class SongProfile {
    public static final String FILTER="ebur128=metadata=1:peak=true,aformat=channel_layouts=mono,astats=metadata=1:reset=1:measure_perchannel=RMS_level+Peak_level+Zero_crossings_rate:measure_overall=none,ametadata=mode=print:file=-";
    private final int step;private final ArrayList<double[]> bins=new ArrayList<>();private double time=-1,rms=-100,texture,crest=-100,peak=-100,duration;private Double integrated;
    public SongProfile(double duration){step=Math.max(1,(int)Math.ceil(duration/3600));}
    private static double clamp(double x,double a,double b){return Math.max(a,Math.min(b,x));}
    private static double rounded(double x){return Math.round(x*1000)/1000d;}
    public void line(String line){try{
        if(line.startsWith("frame:")){flush();int at=line.indexOf("pts_time:");time=at<0?-1:Double.parseDouble(line.substring(at+9).trim());rms=crest=-100;texture=0;return;}
        int split=line.indexOf('=');if(time<0||split<0)return;String key=line.substring(0,split);double value=Double.parseDouble(line.substring(split+1));if(!Double.isFinite(value))return;
        switch(key){case "lavfi.r128.I":if(value>-69)integrated=value;break;case "lavfi.r128.true_peak":if(value>0)peak=Math.max(peak,20*Math.log10(value));break;case "lavfi.astats.1.RMS_level":rms=value;break;case "lavfi.astats.1.Peak_level":crest=value;break;case "lavfi.astats.1.Zero_crossings_rate":texture=clamp(value*8,0,1);break;}
    }catch(NumberFormatException ignored){}}
    public double progress(double total){return total>0?Math.min(.99,duration/total):0;}
    private void flush(){if(time<0||!Double.isFinite(time))return;int index=(int)(time/step);duration=Math.max(duration,time+.1);time=-1;if(index>=3600)return;while(bins.size()<=index)bins.add(new double[4]);double[] b=bins.get(index);b[0]+=Math.pow(10,rms/10);b[1]+=texture;b[2]+=clamp((crest-rms-6)/18,0,1);b[3]++;}
    public JSONObject finish(){flush();ArrayList<double[]> raw=new ArrayList<>();ArrayList<Double> levels=new ArrayList<>();for(int i=0;i<bins.size();i++){double[] b=bins.get(i);double count=Math.max(1,b[3]),db=Math.max(-100,10*Math.log10(Math.max(1e-10,b[0]/count)));raw.add(new double[]{i*step,db,b[1]/count,b[2]/count});if(db>-60)levels.add(db);}Collections.sort(levels);double low=levels.isEmpty()?-60:levels.get((int)((levels.size()-1)*.1)),high=levels.isEmpty()?-60:levels.get((int)((levels.size()-1)*.95));JSONArray timeline=new JSONArray();int first=-1,last=-1;
        for(int i=0;i<raw.size();i++){double[] b=raw.get(i);timeline.put(new JSONArray(Arrays.asList(rounded(b[0]),rounded(b[1]),rounded(b[1]<-60?0:clamp((b[1]-low+4)/Math.max(12,high-low+4),0,1)),rounded(b[2]),rounded(b[3]))));if(b[1]>-55){if(first<0)first=i;last=i;}}
        double start=0,end=duration;if(first>=0){if(first*step>=1.5)start=Math.max(0,first*step-.3);double audibleEnd=Math.min(duration,(last+1)*step);if(raw.size()*step+.15>=duration&&duration-audibleEnd>=1.5)end=audibleEnd+.3;}
        return Json.object("version",1,"duration",rounded(duration),"step",step,"integratedLufs",integrated==null?JSONObject.NULL:rounded(integrated),"truePeakDb",rounded(peak),"timeline",timeline,"trim",Json.object("start",rounded(start),"end",rounded(end)),"method","EBU R128 / true peak · local FFmpeg analysis");
    }
    public static double gain(JSONObject profile,boolean enabled){double lufs=profile.optDouble("integratedLufs",Double.NaN),peak=profile.optDouble("truePeakDb",Double.NaN);if(!enabled||!Double.isFinite(lufs)||!Double.isFinite(peak)||lufs<-60)return 1;return Math.pow(10,clamp(Math.min(-16-lufs,-1-peak),-24,24)/20);}
    public static final class TrackLevel {
        private boolean enabled;public double gain=1;
        public double select(JSONObject profile,boolean value){enabled=value;gain=SongProfile.gain(profile,value);return gain;}
        public double update(JSONObject profile,boolean value){if(enabled!=value)select(profile,value);return gain;}
    }
    public static JSONObject range(JSONObject edit,double duration){if(!edit.optBoolean("enabled"))return Json.object("enabled",false,"start",0,"end",duration);double start=edit.optDouble("start",Double.NaN),end=edit.optDouble("end",Double.NaN);if(!Double.isFinite(start)||!Double.isFinite(end)||start<0||end>duration+.1||end-start<1)throw new IllegalArgumentException("Keep at least one second, within the original track duration.");return Json.object("enabled",true,"start",rounded(start),"end",rounded(end));}
}
