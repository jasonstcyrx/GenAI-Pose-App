# modules/image_captioning.py

import threading
import time
import numpy as np
from PyQt5.QtCore import QThread, pyqtSignal, QObject
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image


class SFImageCaptioningThread(threading.Thread):
    """
    A background thread that periodically runs image captioning on the latest frame
    to generate image descriptions without blocking the GUI.
    """
    def __init__(self, app, interval=0.5):
        super().__init__(daemon=True)
        self.app = app
        self.interval = interval
        self.stop_flag = False

        # Initialize the captioning model
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
        self.model.to(self.app.device)

    def run(self):
        while not self.stop_flag:
            frame_copy = None
            with self.app.lock:
                if self.app.frame is not None:
                    frame_copy = self.app.frame.copy()

            if frame_copy is not None:
                pil_image = Image.fromarray(frame_copy[:, :, ::-1])  # Convert BGR to RGB
                inputs = self.processor(images=pil_image, return_tensors="pt")  # type: ignore
                out = self.model.generate(**inputs, max_length=16, num_beams=4) # type: ignore
                caption = self.processor.decode(out[0], skip_special_tokens=True) # type: ignore
                with self.app.lock:
                    self.app.live_image_caption = caption

            time.sleep(self.interval)

    def stop(self):
        self.stop_flag = True