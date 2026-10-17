package music.resonance.mobile;

import org.json.*;
import java.util.*;

/** Compact local map data. Mirrors constellation-model.js; never decodes audio on the UI thread. */
public final class ConstellationData {
    private ConstellationData() {}
    private static double clamp(double n,double lo,double hi){return Double.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo;}
    public static JSONObject summarize(JSONObject profile){
        JSONArray timeline=profile.optJSONArray("timeline");if(timeline==null)return null;
        List<double[]> rows=new ArrayList<>();
        for(int i=0;i<timeline.length();i++){
            JSONArray row=timeline.optJSONArray(i);if(row==null||row.length()<5)continue;boolean valid=true;
            for(int j=0;j<5;j++)if(!Double.isFinite(row.optDouble(j,Double.NaN)))valid=false;
            if(valid&&row.optDouble(1)>-60)rows.add(new double[]{clamp(row.optDouble(2),0,1),clamp(row.optDouble(3),0,1),clamp(row.optDouble(4),0,1)});
        }
        if(rows.isEmpty())return null;double e=0,t=0,a=0,variance=0,opening=0,closing=0;int count=rows.size(),edge=Math.max(1,(int)Math.ceil(count*.1));
        for(double[] r:rows){e+=r[0]/count;t+=r[1]/count;a+=r[2]/count;}
        for(int i=0;i<count;i++){double value=rows.get(i)[0];variance+=(value-e)*(value-e)/count;if(i<edge)opening+=value/edge;if(i>=count-edge)closing+=value/edge;}
        return Json.object("v",new JSONArray(List.of(e,t,a,clamp(Math.sqrt(variance)*3,0,1))),"opening",opening,"closing",closing,"savedAt",profile.optLong("savedAt"));
    }
    public static Set<String> available(JSONArray tracks){Set<String> ids=new HashSet<>();for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t!=null&&t.optBoolean("available",true))ids.add(t.optString("id"));}return ids;}
    public static Set<String> known(JSONArray tracks){Set<String> ids=new HashSet<>();for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t!=null)ids.add(t.optString("id"));}return ids;}
    public static JSONObject clean(JSONObject value,Set<String> known){
        JSONObject positions=new JSONObject(),space=new JSONObject(),colors=new JSONObject();JSONArray places=new JSONArray();
        JSONObject spatial=value.optJSONObject("space");if(spatial!=null)for(Iterator<String> it=spatial.keys();it.hasNext()&&space.length()<20000;){String id=it.next();JSONArray p=spatial.optJSONArray(id);if(!known.contains(id)||p==null||p.length()!=3)continue;boolean valid=true;for(int j=0;j<3;j++)if(!(p.opt(j) instanceof Number)||!Double.isFinite(p.optDouble(j))||Math.abs(p.optDouble(j))>=10000)valid=false;if(valid)Json.put(space,id,p);}
        JSONObject input=value.optJSONObject("positions");if(input!=null)for(Iterator<String> it=input.keys();it.hasNext()&&positions.length()<20000;){String id=it.next();JSONArray p=input.optJSONArray(id);if(known.contains(id)&&p!=null&&p.length()==2&&Double.isFinite(p.optDouble(0))&&Double.isFinite(p.optDouble(1))&&Math.abs(p.optDouble(0))<10000&&Math.abs(p.optDouble(1))<10000)Json.put(positions,id,p);}
        input=value.optJSONObject("colors");if(input!=null)for(Iterator<String> it=input.keys();it.hasNext()&&colors.length()<20000;){String id=it.next(),c=input.optString(id);if(known.contains(id)&&c.matches("#[0-9a-fA-F]{6}"))Json.put(colors,id,c);}
        JSONArray entries=value.optJSONArray("places");if(entries!=null)for(int i=0;i<Math.min(24,entries.length());i++){JSONObject p=entries.optJSONObject(i);if(p==null||!known.contains(p.optString("id"))||!(p.opt("name") instanceof String))continue;String name=p.optString("name");places.put(Json.object("id",p.optString("id"),"name",name.substring(0,Math.min(60,name.length())),"zoom",clamp(p.optDouble("zoom"),1,8)));}
        return Json.object("version",2,"spaceVersion",value.optInt("spaceVersion")==3?3:0,"positions",positions,"space",space,"colors",colors,"places",places,"seed",clamp(value.optDouble("seed"),0,1e9));
    }
    public static JSONArray queueIds(JSONArray ids,Set<String> known){JSONArray out=new JSONArray();Set<String> seen=new HashSet<>();if(ids!=null)for(int i=0;i<ids.length()&&out.length()<200;i++){String id=ids.optString(i);if(known.contains(id)&&seen.add(id))out.put(id);}return out;}
    /** Tail to insert without replacing the currently playing media item or seeking it. */
    public static JSONArray tail(JSONArray ids,String current,String mode){JSONArray out=new JSONArray();for(int i=0;i<ids.length();i++)if(!(mode.equals("after")&&i==0&&ids.optString(i).equals(current)))out.put(ids.optString(i));return out;}
}
