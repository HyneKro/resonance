package music.resonance.mobile;

import java.util.Locale;

final class DownloadMessages {
    static String explain(String raw){
        String lower=raw.toLowerCase(Locale.ROOT);
        if(lower.startsWith("spotify ")||lower.startsWith("deezer "))return raw.length()>600?raw.substring(0,600)+"…":raw;
        if(lower.contains("http error 429")||lower.contains("too many requests")||lower.contains("rate limit")||lower.contains("rate-limit")||lower.contains("try again later")||lower.contains("temporarily unavailable"))return "YouTube is temporarily limiting downloads or unavailable. Wait a while, then resume your remaining songs.";
        if(lower.contains("http error 403"))return "YouTube refused this audio download. Update the downloader and retry. Your finished songs and remaining selection are kept.";
        if(lower.contains("sign in")||lower.contains("confirm you’re not a bot")||lower.contains("confirm you're not a bot"))return "YouTube requires sign-in or verification for this recording. Try another recording or try again later.";
        if(lower.contains("private video")||lower.contains("video unavailable")||lower.contains("members-only"))return "This recording is unavailable, private or restricted.";
        if(lower.contains("requested format is not available"))return "YouTube did not provide a working audio format. Update the downloader, then retry.";
        for(String line:raw.split("\\R"))if(line.startsWith("ERROR:"))return line.substring(6).trim();
        return raw.length()>600?raw.substring(0,600)+"…":raw;
    }
}
