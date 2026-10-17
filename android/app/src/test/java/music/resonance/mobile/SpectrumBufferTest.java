package music.resonance.mobile;

import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.AudioProcessingPipeline;
import androidx.media3.common.C;
import com.google.common.collect.ImmutableList;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import org.junit.Test;
import static org.junit.Assert.*;

/** Exercises the real Media3 buffer lifecycle, not just the FFT math. */
public class SpectrumBufferTest {
    @Test public void frameworkEmptyBufferIsSafeBeforeFirstAudio() {
        for (boolean analysis : new boolean[]{false, true}) {
            SpectrumProcessor processor = new SpectrumProcessor();
            processor.enabled = analysis;
            processor.queueInput(AudioProcessor.EMPTY_BUFFER);
            assertFalse(processor.getOutput().hasRemaining());
        }
    }

    @Test public void emptyInputDoesNotErasePendingAudio() {
        for (boolean analysis : new boolean[]{false, true}) {
            SpectrumProcessor processor = new SpectrumProcessor();
            processor.enabled = analysis;
            byte[] expected = samples(64);
            processor.queueInput(buffer(expected));
            processor.queueInput(AudioProcessor.EMPTY_BUFFER);
            // A fully consumed, nonzero-capacity input is empty too.
            ByteBuffer consumed = buffer(expected);
            consumed.position(consumed.limit());
            processor.queueInput(consumed);
            assertArrayEquals(expected, bytes(processor.getOutput()));
        }
    }

    @Test public void samplesPassThroughUnchangedAcrossBufferSizesAndModes() {
        SpectrumProcessor processor = new SpectrumProcessor();
        for (boolean analysis : new boolean[]{false, true, false}) {
            processor.enabled = analysis;
            for (int size : new int[]{4, 4096, 12, 32768, 128}) {
                byte[] expected = samples(size);
                ByteBuffer input = ByteBuffer.allocateDirect(size + 12).order(ByteOrder.nativeOrder());
                input.position(8);
                input.put(expected);
                input.flip();
                input.position(8);
                processor.queueInput(input);
                assertEquals(input.limit(), input.position());
                assertArrayEquals(expected, bytes(processor.getOutput()));
                processor.queueInput(AudioProcessor.EMPTY_BUFFER);
                assertFalse(processor.getOutput().hasRemaining());
            }
        }
    }

    @Test public void endOfStreamFlushAndResetRemainSafe() {
        SpectrumProcessor processor = new SpectrumProcessor();
        for (int stream = 0; stream < 3; stream++) {
            processor.queueInput(AudioProcessor.EMPTY_BUFFER);
            byte[] expected = samples(256);
            processor.queueInput(buffer(expected));
            processor.queueEndOfStream();
            assertFalse(processor.isEnded());
            assertArrayEquals(expected, bytes(processor.getOutput()));
            assertTrue(processor.isEnded());
            processor.flush();
            assertFalse(processor.isEnded());
            processor.queueInput(AudioProcessor.EMPTY_BUFFER);
            assertFalse(processor.getOutput().hasRemaining());
            processor.reset();
        }
    }

    @Test public void realMedia3PipelineCanPollBeforeAudioAndDrainAfterward() throws Exception {
        SpectrumProcessor processor = new SpectrumProcessor();
        AudioProcessingPipeline pipeline = new AudioProcessingPipeline(ImmutableList.of(processor));
        for (boolean analysis : new boolean[]{false, true}) {
            processor.enabled = analysis;
            pipeline.configure(new AudioProcessor.AudioFormat(48000, 2, C.ENCODING_PCM_16BIT));
            pipeline.flush();
            assertTrue(pipeline.isOperational());
            // This polling path is what sends the shared empty buffer on startup.
            assertFalse(pipeline.getOutput().hasRemaining());
            for (int size : new int[]{64, 4096, 128}) {
                byte[] expected = samples(size);
                pipeline.queueInput(buffer(expected));
                ByteBuffer output = pipeline.getOutput();
                // Simulate the audio sink only accepting part of this buffer.
                byte[] actual = new byte[size];
                output.get(actual, 0, 4);
                assertSame(output, pipeline.getOutput());
                pipeline.getOutput().get(actual, 4, size - 4);
                assertArrayEquals(expected, actual);
                assertFalse(pipeline.getOutput().hasRemaining());
            }
            pipeline.queueEndOfStream();
            assertFalse(pipeline.getOutput().hasRemaining());
            assertTrue(pipeline.isEnded());
            pipeline.reset();
        }
    }

    private static byte[] samples(int size) {
        byte[] data = new byte[size];
        for (int i = 0; i < size; i++) data[i] = (byte)(i * 73 + 19);
        return data;
    }
    private static ByteBuffer buffer(byte[] data) {
        ByteBuffer result = ByteBuffer.allocateDirect(data.length).order(ByteOrder.nativeOrder());
        result.put(data).flip();
        return result;
    }
    private static byte[] bytes(ByteBuffer buffer) {
        byte[] result = new byte[buffer.remaining()];
        buffer.get(result);
        return result;
    }
}
