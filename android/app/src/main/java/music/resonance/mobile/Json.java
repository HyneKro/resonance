package music.resonance.mobile;
import org.json.*;
public final class Json {
    private Json(){}
    public static JSONObject object(Object... values){JSONObject o=new JSONObject();try{for(int i=0;i<values.length;i+=2)o.put((String)values[i],values[i+1]==null?JSONObject.NULL:values[i+1]);}catch(JSONException e){throw new IllegalArgumentException(e);}return o;}
    public static JSONObject parse(String text){try{return new JSONObject(text);}catch(Exception e){return new JSONObject();}}
    public static JSONObject put(JSONObject o,String k,Object v){try{o.put(k,v==null?JSONObject.NULL:v);return o;}catch(JSONException e){throw new IllegalArgumentException(e);}}
    public static String error(Throwable e){while(e.getCause()!=null)e=e.getCause();return e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();}
}
