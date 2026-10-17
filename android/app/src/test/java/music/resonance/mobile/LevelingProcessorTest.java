package music.resonance.mobile;
import androidx.media3.common.C;
import androidx.media3.common.audio.*;
import com.google.common.collect.ImmutableList;
import java.nio.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class LevelingProcessorTest {
    @Test public void quietMasterBoostIsNotCappedAtSixDecibels()throws Exception{LevelingProcessor p=new LevelingProcessor();p.configure(new AudioProcessor.AudioFormat(48000,2,C.ENCODING_PCM_16BIT));p.selectTrack(8);p.flush();ByteBuffer input=ByteBuffer.allocateDirect(8).order(ByteOrder.LITTLE_ENDIAN);input.putShort((short)1000).putShort((short)-1000).putShort((short)2000).putShort((short)-2000).flip();p.queueInput(input);ByteBuffer output=p.getOutput().order(ByteOrder.LITTLE_ENDIAN);assertEquals(8000,output.getShort());assertEquals(-8000,output.getShort());assertEquals(16000,output.getShort());assertEquals(-16000,output.getShort());}
    @Test public void nativePipelinePollsEmptyBuffersAndPassesUnityExactly()throws Exception{
        LevelingProcessor gain=new LevelingProcessor();SpectrumProcessor spectrum=new SpectrumProcessor();
        AudioProcessingPipeline pipeline=new AudioProcessingPipeline(ImmutableList.of(spectrum,gain));pipeline.configure(new AudioProcessor.AudioFormat(48000,2,C.ENCODING_PCM_16BIT));pipeline.flush();assertFalse(pipeline.getOutput().hasRemaining());
        byte[] expected=new byte[4096];for(int i=0;i<expected.length;i++)expected[i]=(byte)(i*73+19);ByteBuffer input=ByteBuffer.allocateDirect(expected.length).order(ByteOrder.nativeOrder());input.put(expected).flip();pipeline.queueInput(input);byte[] actual=new byte[expected.length];pipeline.getOutput().get(actual);assertArrayEquals(expected,actual);assertFalse(pipeline.getOutput().hasRemaining());pipeline.queueEndOfStream();assertFalse(pipeline.getOutput().hasRemaining());assertTrue(pipeline.isEnded());
    }
    @Test public void gainIsFixedAndSampleRampsNeverJump()throws Exception{LevelingProcessor p=new LevelingProcessor();p.configure(new AudioProcessor.AudioFormat(48000,2,C.ENCODING_PCM_16BIT));p.flush();p.setGain(.5);ByteBuffer input=ByteBuffer.allocateDirect(48000*4).order(ByteOrder.nativeOrder());while(input.hasRemaining())input.putShort((short)10000);input.flip();p.queueInput(input);ByteBuffer output=p.getOutput().order(ByteOrder.LITTLE_ENDIAN);int previous=10000;while(output.hasRemaining()){int v=output.getShort();assertTrue(v<=previous&&v>=5000);assertTrue(previous-v<=1);previous=v;}assertTrue(previous<5300);p.queueInput(AudioProcessor.EMPTY_BUFFER);assertFalse(p.getOutput().hasRemaining());}
    @Test public void aNewTrackDoesNotInheritThePreviousSongsBoost()throws Exception{LevelingProcessor p=new LevelingProcessor();p.configure(new AudioProcessor.AudioFormat(48000,2,C.ENCODING_PCM_16BIT));p.selectTrack(2);p.flush();p.selectTrack(.25);ByteBuffer input=ByteBuffer.allocateDirect(400).order(ByteOrder.nativeOrder());while(input.hasRemaining())input.putShort((short)30000);input.flip();p.queueInput(input);ByteBuffer output=p.getOutput().order(ByteOrder.LITTLE_ENDIAN);while(output.hasRemaining())assertEquals(7500,output.getShort());}
}
