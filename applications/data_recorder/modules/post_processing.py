# modules/post_processing.py

import os
import json
import cv2
import threading
from PyQt5.QtCore import QObject, pyqtSignal
from modules.depth_estimation import get_depth_map
from modules.detection import detect_objects_with_huggingface
from modules.emotion_detection import detect_emotions_deepface


class PostProcessingThread(QObject, threading.Thread):
    finished = pyqtSignal()

    def __init__(self, session_dir, video_path, timestamps):
        super().__init__()
        self.session_dir = session_dir
        self.video_path = video_path
        self.timestamps = timestamps

    def run(self):
        cap = cv2.VideoCapture(self.video_path)
        frame_rate = int(cap.get(cv2.CAP_PROP_FPS))

        processed_data = []
        for timestamp in self.timestamps:
            frame_number = int((timestamp / 1000) * frame_rate)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if not ret:
                continue

            # Process frame
            depth_map = get_depth_map(frame)
            detections = detect_objects_with_huggingface(frame)
            emotions = detect_emotions_deepface(frame)

            processed_data.append({
                "timestamp": timestamp,
                "depth_map": depth_map,
                "detections": detections,
                "emotions": emotions
            })

        cap.release()

        # Save processed data
        output_file = os.path.join(self.session_dir, "processed_data.json")
        with open(output_file, "w") as f:
            json.dump(processed_data, f, indent=4)

        self.finished.emit()