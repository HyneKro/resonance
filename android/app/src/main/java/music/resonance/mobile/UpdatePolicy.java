package music.resonance.mobile;

import java.util.Set;
import org.json.JSONObject;

/** Recovery policy shared by scheduled checks and install-time checks. */
final class UpdatePolicy {
    static boolean canCheck(String phase,boolean automatic,boolean enabled,long checkedAt,long now,boolean pending,boolean failed) {
        if(Set.of("downloading","verifying","installing").contains(phase))return false;
        long interval=failed||phase.equals("error")?5*60000L:pending?30*60000L:6*3600000L;
        return !automatic||(enabled&&now-checkedAt>=interval);
    }
    static JSONObject newest(JSONObject known,JSONObject found) {
        return known!=null&&(found==null||AppRelease.compare(found.optString("version"),known.optString("version"))<0)?known:found;
    }
    static boolean rejected(JSONObject release,String failedVersion) {
        return release!=null&&release.optString("version").equals(failedVersion);
    }
}
