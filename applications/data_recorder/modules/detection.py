# modules/detection.py

import threading
import time
import cv2
import numpy as np
import torch
from transformers import DetrImageProcessor, DetrForObjectDetection
from PIL import Image




def simulate_joint_outputs():
    """
    Creates random 360x3 joint data (e.g., 360 joints in 3D) for demonstration.
    """
    return np.random.rand(360, 3)

def detect_objects_with_huggingface(image, confidence_threshold=0.5):
    """
    Runs DETR object detection on 'image' and filters results below self.confidence_threshold.
    """
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
    inputs = processor(images=pil_image, return_tensors="pt")
    model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
    outputs = model(**inputs)

    target_sizes = [pil_image.size[::-1]]
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=0.0)[0]

    detected_objects = []
    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        if score.item() >= confidence_threshold:
            label_name = model.config.id2label[label.item()]
            box = [round(i, 2) for i in box.tolist()]
            detected_objects.append({
                "label": label_name,
                "score": round(score.item(), 2),
                "box": box
            })
    return detected_objects

class LiveDetectionThread(threading.Thread):
    """
    A background thread that periodically runs detection on the latest frame
    to update bounding boxes for the live feed without blocking the GUI.
    """
    def __init__(self, app, interval=0.5):
        super().__init__(daemon=True)
        self.app = app
        self.interval = interval
        self.stop_flag = False

        # Initialize object detection model
        self.processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
        self.model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
        self.model.to(self.app.device)
        self.model.eval()

    def run(self, disable=True):
        while not self.stop_flag:
            frame_copy = None
            with self.app.lock:
                if self.app.frame is not None:
                    frame_copy = self.app.frame.copy()

            if frame_copy is not None and not disable:
                pil_image = Image.fromarray(frame_copy[:, :, ::-1])  # Convert BGR to RGB
                inputs = self.processor(images=pil_image, return_tensors="pt").to(self.app.device)
                with torch.no_grad():
                    outputs = self.model(**inputs)

                target_sizes = [pil_image.size[::-1]]
                results = self.processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=0.0)[0]

                detected_objects = []
                for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
                    if score.item() >= self.app.confidence_threshold:
                        label_name = self.model.config.id2label[label.item()]
                        box = [round(i, 2) for i in box.tolist()]
                        detected_objects.append({
                            "label": label_name,
                            "score": round(score.item(), 2),
                            "box": box
                        })

                joints = simulate_joint_outputs()

                with self.app.lock:
                    self.app.live_detected_objects = detected_objects
                    self.app.live_joint_outputs = joints

            time.sleep(self.interval)

    def stop(self):
        self.stop_flag = True