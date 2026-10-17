package music.resonance.mobile;

import java.io.*;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.function.BooleanSupplier;

final class FileCopies {
    static String name(String title,String video,String extension){
        if(!video.matches("[A-Za-z0-9_-]{11}")||!extension.matches("[a-zA-Z0-9]{2,5}"))throw new IllegalArgumentException("Invalid audio filename");
        String clean=title.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]"," ").replaceAll("\\s+"," ").trim();
        if(clean.length()>100)clean=clean.substring(0,100);if(clean.isEmpty())clean="Track";
        return clean+" ["+video+"]."+extension.toLowerCase(Locale.ROOT);
    }
    static String transfer(InputStream in,OutputStream out,BooleanSupplier cancelled) throws Exception {
        MessageDigest hash=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];int n;
        while((n=in.read(buffer))!=-1){if(cancelled.getAsBoolean())throw new InterruptedIOException("Download cancelled while saving the file");hash.update(buffer,0,n);out.write(buffer,0,n);}out.flush();return hex(hash.digest());
    }
    static String digest(InputStream in,BooleanSupplier cancelled) throws Exception{return transfer(in,new OutputStream(){public void write(int b){}public void write(byte[] b,int off,int len){}},cancelled);}
    private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));return s.toString();}
}
