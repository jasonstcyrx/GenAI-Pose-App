# modules/speech_recognition.py

import speech_recognition as sr
from PyQt5.QtCore import pyqtSignal, QObject


class SpeechToTextWorker(QObject):
    finished = pyqtSignal()
    error = pyqtSignal(str)
    result = pyqtSignal(str)

    def __init__(self, duration=None):
        super().__init__()
        self.duration = duration  # Optional: limit listening duration

    def run(self):
        recognizer = sr.Recognizer()
        microphone = sr.Microphone()

        try:
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source)
                print("Listening...")
                audio = recognizer.listen(source, phrase_time_limit=self.duration)
            print("Recognizing...")
            text = recognizer.recognize_google(audio)  # type: ignore
            self.result.emit(text)
        except sr.RequestError:
            # API was unreachable or unresponsive
            self.error.emit("API unavailable")
        except sr.UnknownValueError:
            # Speech was unintelligible
            self.error.emit("Unable to recognize speech")
        except Exception as e:
            self.error.emit(str(e))
        finally:
            self.finished.emit()