package music.resonance.mobile;

import org.json.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

/** Local LAN protocol only. No cloud credentials, power commands or segment guesses. */
final class GoveeLights {
    private final Map<String,JSONObject> devices=new LinkedHashMap<>(),last=new HashMap<>();
    private final Consumer<JSONObject> save;
    private JSONObject options;
    private volatile MulticastSocket socket;
    private volatile boolean enabled,scanning;
    private volatile String error="";
    private long tickAt=-1000,statusAt,latestAt;
    private final ScheduledExecutorService clock=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"Govee timeout");t.setDaemon(true);return t;});
    GoveeLights(Supplier<JSONObject> load,Consumer<JSONObject> save){this.save=save;options=options(load.get());clock.scheduleWithFixedDelay(()->{synchronized(this){if(enabled&&System.currentTimeMillis()-latestAt>2500){stop();error="Lighting sync stopped because the app stopped sending music. Start sync to reconnect.";}}},1,1,TimeUnit.SECONDS);}
    static boolean privateIP(String ip){if(ip==null||!ip.matches("(?:\\d{1,3}\\.){3}\\d{1,3}"))return false;for(String part:ip.split("\\."))if(Integer.parseInt(part)>255)return false;return ip.matches("(?:10\\.|192\\.168\\.|172\\.(?:1[6-9]|2\\d|3[01])\\.).*");}
    static double bound(double n,double fallback,double min,double max){return Math.max(min,Math.min(max,Double.isFinite(n)?n:fallback));}
    static JSONObject options(JSONObject p){if(p==null)p=new JSONObject();JSONArray ds=new JSONArray(),input=p.optJSONArray("devices");if(input!=null)for(int i=0;i<Math.min(32,input.length());i++){JSONObject d=input.optJSONObject(i);if(d==null||!d.optString("id").matches("(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}"))continue;String role=d.optString("role");ds.put(Json.object("id",d.optString("id"),"selected",d.optBoolean("selected"),"role",Set.of("mix","bass","mids","highs").contains(role)?role:"mix","color",Math.round(bound(d.optDouble("color"),0,0,5))));}return Json.object("brightness",bound(p.optDouble("brightness"),.65,.05,1),"response",bound(p.optDouble("response"),.7,0,1.5),"idle",bound(p.optDouble("idle"),.18,0,1),"devices",ds);}
    synchronized JSONObject snapshot(){JSONArray ds=new JSONArray();for(JSONObject d:devices.values()){JSONObject copy=Json.parse(d.toString());Json.put(copy,"online",System.currentTimeMillis()-d.optLong("seen")<20000);ds.put(copy);}return Json.object("enabled",enabled,"error",error,"scanning",scanning,"options",Json.parse(options.toString()),"devices",ds);}
    synchronized void open()throws Exception {
        if(socket!=null&&!socket.isClosed())return;
        MulticastSocket s=new MulticastSocket(null);s.setReuseAddress(false);
        try{s.bind(new InetSocketAddress(4002));s.setSoTimeout(1000);s.setTimeToLive(1);}catch(Exception e){s.close();error="Govee port 4002 is unavailable. Close another LAN lighting controller and retry.";throw new java.io.IOException(error,e);}
        socket=s;error="";Thread listener=new Thread(()->{byte[] buffer=new byte[4096];while(socket==s&&!s.isClosed()){try{DatagramPacket packet=new DatagramPacket(buffer,buffer.length);s.receive(packet);receive(Arrays.copyOf(packet.getData(),packet.getLength()),packet.getAddress().getHostAddress());}catch(SocketTimeoutException ignored){}catch(Exception e){if(socket==s){error="Govee LAN connection failed.";enabled=false;socket=null;s.close();}}}},"Govee LAN");listener.setDaemon(true);listener.start();
    }
    synchronized void receive(byte[] bytes,String ip){if(!privateIP(ip)||bytes.length>4096)return;JSONObject m=Json.parse(new String(bytes,StandardCharsets.UTF_8)).optJSONObject("msg");if(m==null)return;JSONObject d=m.optJSONObject("data");if(d==null)return;
        if(m.optString("cmd").equals("scan")&&d.optString("device").matches("(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}")&&d.optString("sku").matches("H[A-Z0-9]{4}")){
            String id=d.optString("device");if(!devices.containsKey(id)&&devices.size()>=32)return;JSONObject device=devices.getOrDefault(id,new JSONObject());String name=d.optString("deviceName",d.optString("sku"));Json.put(device,"id",id);Json.put(device,"ip",ip);Json.put(device,"model",d.optString("sku"));Json.put(device,"name",name.substring(0,Math.min(64,name.length())));Json.put(device,"seen",System.currentTimeMillis());devices.put(id,device);send(ip,"devStatus",new JSONObject());
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
    synchronized JSONObject configure(JSONObject data)throws Exception {
        JSONObject next=options(data.optJSONObject("options")==null?options:data.optJSONObject("options"));JSONArray ds=next.optJSONArray("devices");
        if(data.optBoolean("enabled")){boolean selected=false;for(int i=0;i<ds.length();i++){JSONObject d=ds.optJSONObject(i);selected|=d.optBoolean("selected")&&devices.containsKey(d.optString("id"));}if(!selected)throw new java.io.IOException("Select at least one discovered light.");open();error="";}
        options=next;save.accept(next);if(data.has("enabled")){enabled=data.optBoolean("enabled");last.clear();tickAt=-1000;latestAt=System.currentTimeMillis();if(enabled)for(int i=0;i<ds.length();i++){JSONObject d=devices.get(ds.optJSONObject(i).optString("id"));if(d!=null&&ds.optJSONObject(i).optBoolean("selected")){d.remove("on");send(d.optString("ip"),"devStatus",new JSONObject());}}}return snapshot();
    }
    synchronized JSONObject frame(JSONArray frames)throws Exception {
        if(!enabled)return Json.object("ok",true,"enabled",false);long now=System.currentTimeMillis();latestAt=now;if(now-tickAt<120)return Json.object("ok",true,"enabled",true);tickAt=now;
        if(frames==null||frames.length()>32)throw new java.io.IOException("Invalid lighting frame.");Set<String> selected=new HashSet<>();JSONArray ds=options.optJSONArray("devices");for(int i=0;i<ds.length();i++)if(ds.optJSONObject(i).optBoolean("selected"))selected.add(ds.optJSONObject(i).optString("id"));
        if(now-statusAt>5000){for(String id:selected){JSONObject d=devices.get(id);if(d!=null)send(d.optString("ip"),"devStatus",new JSONObject());}statusAt=now;}
        for(int i=0;i<frames.length();i++){JSONObject f=frames.optJSONObject(i);if(f==null)continue;String id=f.optString("id");JSONObject d=devices.get(id);if(d==null||!selected.contains(id)||!d.optBoolean("on")||now-d.optLong("seen")>=20000)continue;JSONObject rgb=f.optJSONObject("color");int brightness=f.optInt("brightness",-1);if(rgb==null||brightness<1||brightness>100)throw new java.io.IOException("Invalid light color or brightness.");brightness=Math.min(brightness,(int)Math.round(options.optDouble("brightness")*100));for(String k:List.of("r","g","b")){double n=rgb.optDouble(k);if(!Double.isFinite(n)||n!=Math.rint(n)||n<0||n>255)throw new java.io.IOException("Invalid light color.");}
            JSONObject old=last.get(id);boolean refresh=old==null||now-old.optLong("at")>2500,changed=refresh;for(String k:List.of("r","g","b"))if(!refresh&&Math.abs(rgb.optInt(k)-old.optJSONObject("color").optInt(k))>=2)changed=true;
            if(changed)send(d.optString("ip"),"colorwc",Json.object("color",rgb,"colorTemInKelvin",0));if(refresh||brightness!=old.optInt("brightness"))send(d.optString("ip"),"brightness",Json.object("value",brightness));
            last.put(id,Json.object("color",changed?rgb:old.optJSONObject("color"),"brightness",brightness,"at",refresh?now:old.optLong("at")));
        }return Json.object("ok",true,"enabled",true);
    }
    synchronized JSONObject stop(){enabled=false;last.clear();MulticastSocket s=socket;socket=null;if(s!=null)s.close();return snapshot();}
    synchronized void close(){stop();MulticastSocket s=socket;socket=null;if(s!=null)s.close();clock.shutdownNow();}
    Object handle(JSONObject data)throws Exception {switch(data.optString("action")){case "status":return snapshot();case "scan":return scan();case "configure":return configure(data);case "frame":return frame(data.optJSONArray("frames"));case "stop":return stop();default:throw new java.io.IOException("Unknown lighting action.");}}
}
