package music.resonance.mobile;

/** Playback intent while a local, whole-song loudness measurement is prepared. */
public final class LoudnessGate {
    public boolean waiting;private boolean wanted,bypass;
    public void select(){waiting=false;wanted=false;bypass=false;}
    public boolean request(boolean missing){if(!missing||bypass)return false;waiting=true;wanted=true;return true;}
    public boolean bypassed(){return bypass;}
    public boolean wantsPlayback(){return waiting&&wanted;}
    public boolean ready(){boolean play=wantsPlayback();waiting=false;wanted=false;return play;}
    public boolean original(){bypass=true;return ready();}
    public void cancel(){waiting=false;wanted=false;}
}
