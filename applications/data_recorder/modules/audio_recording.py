# modules/audio_recording.py

import threading
import pyaudio
import wave


class AudioRecorderThread(threading.Thread):
    """
    A background thread that records audio from the system's microphone
    and saves it as a WAV file once stopped.
    """
    def __init__(self, output_path="audio.wav"):
        super().__init__(daemon=True)
        self.output_path = output_path
        self.stop_flag = False

        # Audio parameters
        self.chunk = 2048  # Increased buffer size from 1024 to 2048
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 44100

        self.frames = []
        self.audio = pyaudio.PyAudio()
        self.stream = None

    def run(self):
        self.stream = self.audio.open(
            format=self.format,
            channels=self.channels,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk
        )

        while not self.stop_flag:
            try:
                data = self.stream.read(self.chunk, exception_on_overflow=False)
                self.frames.append(data)
            except Exception as e:
                print(f"Audio recording error: {e}")

    def stop(self):
        self.stop_flag = True
        if self.stream is not None:
            self.stream.stop_stream()
            self.stream.close()
        self.audio.terminate()

        wf = wave.open(self.output_path, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(self.audio.get_sample_size(self.format))
        wf.setframerate(self.rate)
        wf.writeframes(b''.join(self.frames))
        wf.close()