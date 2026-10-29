package music.resonance.mobile;

import org.json.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

/** Local LAN protocol only. No cloud credentials or power commands. Realtime zone counts are user-calibrated. */
final class GoveeLights {
    private final Map<String,JSONObject> devices=new LinkedHashMap<>(),last=new HashMap<>();
    private final Consumer<JSONObject> save;
    private JSONObject options;
    private final Set<String> unmapped=new HashSet<>();
    private volatile MulticastSocket socket;
    private volatile boolean enabled,scanning;
    private volatile String error="";
    private long tickAt=-1000,latestAt;
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"Govee timeout");t.setDaemon(true);return t;});
    GoveeLights(Supplier<JSONObject> load,Consumer<JSONObject> save){this.save=save;JSONObject initial=load.get();options=options(initial);JSONArray previous=initial==null?null:initial.optJSONArray("devices");if(previous!=null)for(int i=0;i<previous.length();i++){JSONObject d=previous.optJSONObject(i);if(d!=null&&!d.has("segments"))unmapped.add(d.optString("id"));}clock.scheduleWithFixedDelay(()->{synchronized(this){if(enabled&&System.currentTimeMillis()-latestAt>2500){stop();error="Lighting sync stopped because the app stopped sending music. Start sync to reconnect.";}}},1,1,TimeUnit.SECONDS);}
    static boolean privateIP(String ip){if(ip==null||!ip.matches("(?:\\d{1,3}\\.){3}\\d{1,3}"))return false;for(String part:ip.split("\\."))if(Integer.parseInt(part)>255)return false;return ip.matches("(?:10\\.|192\\.168\\.|172\\.(?:1[6-9]|2\\d|3[01])\\.).*");}
    static double bound(double n,double fallback,double min,double max){return Math.max(min,Math.min(max,Double.isFinite(n)?n:fallback));}
    static int estimatedSegments(String model){switch(model){case "H61D3":return 42;case "H61D5":return 70;case "H61D6":return 140;default:return 10;}}
    static JSONObject options(JSONObject p){
        if(p==null)p=new JSONObject();JSONArray ds=new JSONArray(),input=p.optJSONArray("devices");
        if(input!=null)for(int i=0;i<Math.min(32,input.length());i++){JSONObject d=input.optJSONObject(i);if(d==null||!d.optString("id").matches("(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}"))continue;ds.put(Json.object("id",d.optString("id"),"selected",d.optBoolean("selected"),"segments",Math.round(bound(d.optDouble("segments"),10,1,255)),"reverse",d.optBoolean("reverse")));}
        return Json.object("brightness",bound(p.optDouble("brightness"),.65,.05,1),"response",bound(p.optDouble("response"),1,0,1.5),"idle",bound(p.optDouble("idle"),.12,0,1),"devices",ds);
    }
    static byte[] realtimePacket(int op,byte[] payload){byte[] bytes=new byte[payload.length+5];bytes[0]=(byte)0xbb;bytes[1]=(byte)(payload.length>>8);bytes[2]=(byte)payload.length;bytes[3]=(byte)op;System.arraycopy(payload,0,bytes,4,payload.length);for(int i=0;i<bytes.length-1;i++)bytes[bytes.length-1]^=bytes[i];return bytes;}
    static byte[] realtimeMode(boolean on){return realtimePacket(0xb1,new byte[]{(byte)(on?1:0)});}
    static byte[] realtimePixels(JSONArray pixels)throws java.io.IOException {
        if(pixels==null||pixels.length()<1||pixels.length()>255)throw new java.io.IOException("Invalid light pixels.");
        byte[] payload=new byte[2+pixels.length()*3];payload[1]=(byte)pixels.length();
        for(int i=0;i<pixels.length();i++){JSONArray rgb=pixels.optJSONArray(i);if(rgb==null||rgb.length()!=3)throw new java.io.IOException("Invalid light pixels.");for(int c=0;c<3;c++){Object raw=rgb.opt(c);double n=raw instanceof Number?((Number)raw).doubleValue():Double.NaN;if(!Double.isFinite(n)||n!=Math.rint(n)||n<0||n>255)throw new java.io.IOException("Invalid light pixels.");payload[2+i*3+c]=(byte)n;}}
        return realtimePacket(0xb0,payload);
    }
    synchronized JSONObject snapshot(){JSONArray ds=new JSONArray();for(JSONObject d:devices.values()){JSONObject copy=Json.parse(d.toString());Json.put(copy,"online",System.currentTimeMillis()-d.optLong("seen")<20000);Json.put(copy,"streaming",last.containsKey(d.optString("id"))&&last.get(d.optString("id")).optBoolean("armed"));ds.put(copy);}return Json.object("enabled",enabled,"error",error,"scanning",scanning,"options",Json.parse(options.toString()),"devices",ds);}
    synchronized void open()throws Exception {
        if(socket!=null&&!socket.isClosed())return;
        MulticastSocket s=new MulticastSocket(null);s.setReuseAddress(false);
        try{s.bind(new InetSocketAddress(4002));s.setSoTimeout(1000);s.setTimeToLive(1);}catch(Exception e){s.close();error="Govee port 4002 is unavailable. Close another LAN lighting controller and retry.";throw new java.io.IOException(error,e);}
        socket=s;error="";Thread listener=new Thread(()->{byte[] buffer=new byte[4096];while(socket==s&&!s.isClosed()){try{DatagramPacket packet=new DatagramPacket(buffer,buffer.length);s.receive(packet);receive(Arrays.copyOf(packet.getData(),packet.getLength()),packet.getAddress().getHostAddress());}catch(SocketTimeoutException ignored){}catch(Exception e){if(socket==s){error="Govee LAN connection failed.";enabled=false;socket=null;s.close();}}}},"Govee LAN");listener.setDaemon(true);listener.start();
    }
    synchronized void receive(byte[] bytes,String ip){if(!privateIP(ip)||bytes.length>4096)return;JSONObject m=Json.parse(new String(bytes,StandardCharsets.UTF_8)).optJSONObject("msg");if(m==null)return;JSONObject d=m.optJSONObject("data");if(d==null)return;
        if(m.optString("cmd").equals("scan")&&d.optString("device").matches("(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}")&&d.optString("sku").matches("H[A-Z0-9]{4}")){
            String id=d.optString("device");if(!devices.containsKey(id)&&devices.size()>=32)return;JSONObject device=devices.getOrDefault(id,new JSONObject());if(device.has("ip")&&!device.optString("ip").equals(ip)){release(id);device.remove("on");}String name=d.optString("deviceName",d.optString("sku"));Json.put(device,"id",id);Json.put(device,"ip",ip);Json.put(device,"model",d.optString("sku"));Json.put(device,"name",name.substring(0,Math.min(64,name.length())));Json.put(device,"seen",System.currentTimeMillis());devices.put(id,device);if(unmapped.remove(id)){JSONArray prefs=options.optJSONArray("devices");for(int i=0;i<prefs.length();i++){JSONObject pref=prefs.optJSONObject(i);if(pref.optString("id").equals(id))Json.put(pref,"segments",estimatedSegments(d.optString("sku")));}save.accept(options);}send(ip,"devStatus",new JSONObject());
        }else if(m.optString("cmd").equals("devStatus")){for(JSONObject device:devices.values())if(device.optString("ip").equals(ip)){Json.put(device,"seen",System.currentTimeMillis());Json.put(device,"on",d.optInt("onOff",-1)==1);Json.put(device,"brightness",d.optInt("brightness"));}}
    }
    private void sendPacket(InetAddress address,int port,String cmd,JSONObject data)throws Exception {byte[] bytes=Json.object("msg",Json.object("cmd",cmd,"data",data)).toString().getBytes(StandardCharsets.UTF_8);MulticastSocket s=socket;if(s!=null)s.send(new DatagramPacket(bytes,bytes.length,address,port));}
    private void send(String ip,String cmd,JSONObject data){if(!privateIP(ip))return;try{sendPacket(InetAddress.getByName(ip),4003,cmd,data);}catch(Exception e){error="Govee send failed.";}}
    JSONObject scan()throws Exception {
        synchronized(this){if(scanning)return snapshot();scanning=true;}
        try{open();for(int attempt=0;attempt<2;attempt++){
            for(NetworkInterface nic:Collections.list(NetworkInterface.getNetworkInterfaces())){if(!nic.isUp()||nic.isLoopback()||!nic.supportsMulticast())continue;for(InetAddress ip:Collections.list(nic.getInetAddresses()))if(privateIP(ip.getHostAddress()))try{socket.setNetworkInterface(nic);try{socket.joinGroup(new InetSocketAddress("239.255.255.250",4001),nic);}catch(Exception ignored){}sendPacket(InetAddress.getByName("239.255.255.250"),4001,"scan",Json.object("account_topic","reserve"));}catch(Exception ignored){}}
            synchronized(this){for(JSONObject d:devices.values())try{sendPacket(InetAddress.getByName(d.optString("ip")),4001,"scan",Json.object("account_topic","reserve"));}catch(Exception ignored){}}
            Thread.sleep(attempt==0?1400:1800);
        }}finally{scanning=false;}return snapshot();
    }
    private void stream(String ip,byte[] bytes){send(ip,"razer",Json.object("pt",Base64.getEncoder().encodeToString(bytes)));}
    private JSONObject release(String id){JSONObject old=last.remove(id);if(old!=null&&old.optBoolean("armed"))stream(old.optString("ip"),realtimeMode(false));return old;}
    private void restore(List<JSONObject> streams){if(streams.isEmpty())return;try{Thread.sleep(110);}catch(InterruptedException e){Thread.currentThread().interrupt();}for(JSONObject old:streams)if(old!=null){int value=old.optInt("original");for(JSONObject d:devices.values())if(d.optString("ip").equals(old.optString("ip"))&&d.optBoolean("on")&&value>=1&&value<=100)send(old.optString("ip"),"brightness",Json.object("value",value));}}
    synchronized JSONObject configure(JSONObject data)throws Exception {
        JSONObject next=options(data.optJSONObject("options")==null?options:data.optJSONObject("options"));JSONArray ds=next.optJSONArray("devices");
        if(data.has("enabled")&&!data.optBoolean("enabled")){stop();options=next;save.accept(next);return snapshot();}
        if(data.optBoolean("enabled")){boolean selected=false;for(int i=0;i<ds.length();i++){JSONObject d=ds.optJSONObject(i);selected|=d.optBoolean("selected")&&devices.containsKey(d.optString("id"));}if(!selected)throw new java.io.IOException("Select at least one discovered light.");open();error="";}
        List<JSONObject> released=new ArrayList<>();for(String id:new HashSet<>(last.keySet())){boolean keep=false;for(int i=0;i<ds.length();i++)keep|=ds.optJSONObject(i).optString("id").equals(id)&&ds.optJSONObject(i).optBoolean("selected");if(!keep)released.add(release(id));}restore(released);
        options=next;save.accept(next);
        if(data.optBoolean("enabled")&&!enabled){enabled=true;tickAt=-1000;latestAt=System.currentTimeMillis();for(int i=0;i<ds.length();i++){JSONObject d=devices.get(ds.optJSONObject(i).optString("id"));if(d!=null&&ds.optJSONObject(i).optBoolean("selected")){d.remove("on");send(d.optString("ip"),"devStatus",new JSONObject());}}}return snapshot();
    }
    synchronized JSONObject frame(JSONArray frames)throws Exception {
        if(!enabled)return Json.object("ok",true,"enabled",false);
        if(frames==null||frames.length()>32)throw new java.io.IOException("Invalid lighting frame.");
        Map<String,JSONObject> selected=new HashMap<>();JSONArray ds=options.optJSONArray("devices");for(int i=0;i<ds.length();i++)if(ds.optJSONObject(i).optBoolean("selected"))selected.put(ds.optJSONObject(i).optString("id"),ds.optJSONObject(i));
        Map<String,byte[]> packets=new HashMap<>();
        // Validate all selected frames before sending any datagram.
        for(int i=0;i<frames.length();i++){JSONObject f=frames.optJSONObject(i);if(f==null||!selected.containsKey(f.optString("id")))continue;JSONArray pixels=f.optJSONArray("pixels");Object raw=f.opt("brightness");double value=raw instanceof Number?((Number)raw).doubleValue():Double.NaN;if(!Double.isFinite(value)||value!=Math.rint(value)||value<1||value>100||pixels==null||pixels.length()!=selected.get(f.optString("id")).optInt("segments"))throw new java.io.IOException("Invalid light pixels or brightness.");packets.put(f.optString("id"),realtimePixels(pixels));}
        long now=System.currentTimeMillis();latestAt=now;if(now-tickAt<12)return Json.object("ok",true,"enabled",true);tickAt=now;
        for(int i=0;i<frames.length();i++){
            JSONObject f=frames.optJSONObject(i);if(f==null||!packets.containsKey(f.optString("id")))continue;String id=f.optString("id");JSONObject d=devices.get(id),old=last.get(id);
            if(d==null||!d.optBoolean("on")){if(old!=null)release(id);continue;}if(old==null&&now-d.optLong("seen")>=20000)continue;
            int brightness=Math.min(f.optInt("brightness"),(int)Math.round(options.optDouble("brightness")*100));String ip=d.optString("ip");
            if(old==null){old=Json.object("ip",ip,"at",now,"global",brightness,"original",d.optInt("brightness"),"phase","arm","armed",false,"readyAt",now+100,"statusAt",now);last.put(id,old);send(ip,"brightness",Json.object("value",brightness));continue;}
            if(now<old.optLong("readyAt")||now-old.optLong("at")<15)continue;Json.put(old,"at",now);
            if(old.optString("phase").equals("arm")){stream(ip,realtimeMode(true));Json.put(old,"armed",true);Json.put(old,"phase","pixels");Json.put(old,"readyAt",now+100);continue;}
            if(brightness!=old.optInt("global")){send(ip,"brightness",Json.object("value",brightness));Json.put(old,"global",brightness);Json.put(old,"readyAt",now+100);continue;}
            if(now-old.optLong("statusAt")>5000){send(ip,"devStatus",new JSONObject());Json.put(old,"statusAt",now);Json.put(old,"readyAt",now+100);continue;}
            String key=Base64.getEncoder().encodeToString(packets.get(id));if(!key.equals(old.optString("key"))||now-old.optLong("paintAt")>1000){send(ip,"razer",Json.object("pt",key));Json.put(old,"key",key);Json.put(old,"paintAt",now);}
        }return Json.object("ok",true,"enabled",true);
    }
    synchronized JSONObject stop(){enabled=false;List<JSONObject> streams=new ArrayList<>();for(String id:new HashSet<>(last.keySet()))streams.add(release(id));restore(streams);MulticastSocket s=socket;socket=null;if(s!=null)s.close();return snapshot();}
    synchronized void close(){stop();clock.shutdownNow();}
    Object handle(JSONObject data)throws Exception {switch(data.optString("action")){case "status":return snapshot();case "scan":return scan();case "configure":return configure(data);case "frame":return frame(data.optJSONArray("frames"));case "stop":return stop();default:throw new java.io.IOException("Unknown lighting action.");}}
}
