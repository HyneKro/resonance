package music.resonance.mobile;

import org.json.*;
import java.util.regex.*;

/** Pure release policy, independent of Android networking or UI. */
final class AppRelease {
    static final String PAGE="https://github.com/HyneKro/resonance/releases";
    static final String API="https://api.github.com/repos/HyneKro/resonance/releases";
    private static final Pattern VERSION=Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(preview)(?:\\.(\\d+))?)?$");
    static int[] version(String value){Matcher m=VERSION.matcher(value);if(!m.matches())return null;try{return new int[]{Integer.parseInt(m.group(1)),Integer.parseInt(m.group(2)),Integer.parseInt(m.group(3)),m.group(4)==null?1:0,m.group(5)==null?0:Integer.parseInt(m.group(5))};}catch(NumberFormatException e){return null;}}
    static int compare(String a,String b){int[] x=version(a),y=version(b);if(x==null||y==null)throw new IllegalArgumentException("Unsupported release version");for(int i=0;i<x.length;i++)if(x[i]!=y[i])return Integer.compare(x[i],y[i]);return 0;}
    static JSONObject select(JSONArray releases,String current){JSONObject best=null;for(int i=0;i<releases.length();i++){
        JSONObject r=releases.optJSONObject(i);if(r==null||r.optBoolean("draft"))continue;String tag=r.optString("tag_name");if(!tag.startsWith("android-v"))continue;String v=tag.substring(9);if(version(v)==null||compare(v,current)<=0)continue;
        String name="Resonance-Android-"+v+".apk";JSONArray assets=r.optJSONArray("assets");if(assets==null)continue;JSONObject asset=null;int matches=0;for(int j=0;j<assets.length();j++){JSONObject a=assets.optJSONObject(j);if(a!=null&&name.equals(a.optString("name"))){asset=a;matches++;}}
        if(matches!=1)continue;long bytes=asset.optLong("size");String hash=asset.optString("digest"),url=asset.optString("browser_download_url");
        if(!"uploaded".equals(asset.optString("state"))||bytes<=0||bytes>512_000_000||!hash.matches("sha256:[a-f0-9]{64}")||!url.equals(PAGE+"/download/"+tag+"/"+name))continue;
        if(best==null||compare(v,best.optString("version"))>0)best=Json.object("version",v,"tag",tag,"name",name,"bytes",bytes,"sha256",hash.substring(7),"url",url,"notes",r.optString("body").substring(0,Math.min(12000,r.optString("body").length())),"page",PAGE+"/tag/"+tag);
    }return best;}
    static JSONObject restore(JSONObject r,String current){if(r==null)return null;return select(new JSONArray().put(Json.object("tag_name",r.optString("tag"),"body",r.optString("notes"),"assets",new JSONArray().put(Json.object("name",r.optString("name"),"size",r.optLong("bytes"),"digest","sha256:"+r.optString("sha256"),"browser_download_url",r.optString("url"),"state","uploaded")))),current);}
}
