# main.py

import shutil
import sys
import json
import threading
import cv2
import numpy as np
import time
import os
import torch
import wave
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QLabel, QLineEdit, QPushButton,
    QVBoxLayout, QWidget, QFileDialog, QComboBox, QSlider
)
from PyQt5.QtGui import QImage, QPixmap
from PyQt5.QtCore import QTimer, Qt, QThread
from modules.speech_recognition import SpeechToTextWorker
from modules.sort_tracker import Sort
from modules.depth_estimation import initialize_depth_pipeline
from modules.image_captioning import SFImageCaptioningThread
from modules.audio_recording import AudioRecorderThread
from modules.detection import LiveDetectionThread, detect_objects_with_huggingface
from modules.emotion_detection import detect_emotions_deepface
from modules.keypoint_detection import detect_keypoints_superpoint
from modules.utils import simulate_joint_outputs
from transformers import (
    VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer,
    BlipProcessor, BlipForConditionalGeneration, ViltProcessor,
    ViltForQuestionAnswering
)
from PIL import Image


# CONSTANTS AND GLOBALS
FRAME_RATE = 20
FEED_RESOLUTION = (1280, 720)

class DataRecorderApp(QMainWindow):
    """
    A PyQt5 application that:
      - Displays a live camera feed at FEED_RESOLUTION
      - Uses a background detection thread to overlay bounding boxes without heavy lag
      - Lets you record annotated snapshots at intervals (saved at 224x224)
      - Generates a depth map for each snapshot
      - Saves snapshot images, depth maps, JSON metadata, and audio (WAV) for training
      - Adds a confidence threshold slider for adjusting detection
      - Performs Facial Expression Recognition and Emotion Analysis in Post-Processing
    """
    def __init__(self):
        super().__init__()
        # Set up
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.device = device
        self.start_time = None
        self.num_snapshots = 0

        # Initialize Depth Estimation Pipeline
        self.depth_pipe = initialize_depth_pipeline()

        # Initialize Captioning Models
        self.caption_model = VisionEncoderDecoderModel.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        self.feature_extractor = ViTImageProcessor.from_pretrained("nlpconnect/vit-gpt2-image-captioning")
        self.caption_tokenizer = AutoTokenizer.from_pretrained("nlpconnect/vit-gpt2-image-captioning")

        # Initialize Blip Processor and Model
        self.sf_captioning_thread = None  # To be initialized when recording starts
        self.blip_processor = BlipProcessor.from_pretrained("salesforce/blip-image-captioning-base")
        self.blip_model = BlipForConditionalGeneration.from_pretrained("salesforce/blip-image-captioning-base")

        # Initialize VILT Processor and Model

        self.vilt_processor = ViltProcessor.from_pretrained("dandelin/vilt-b32-finetuned-vqa")
        self.vilt_model = ViltForQuestionAnswering.from_pretrained("dandelin/vilt-b32-finetuned-vqa")
        self.vilt_model
        self.vilt_model.eval()


        # Set up the main window
        self.setWindowTitle("Data Recorder")
        self.base_save_dir = "recordings"
        os.makedirs(self.base_save_dir, exist_ok=True)


        # Initialize recording state
        self.recording = False
        self.session_dir = None
        self.timer = QTimer(self)
        self.running = False
        self.frame = None
        self.lock = threading.Lock()

        # Live detection data
        self.live_detected_objects = []
        self.live_joint_outputs = []

        # Confidence threshold for detection
        self.confidence_threshold = 0.5

        # Set up the main layout
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)

        # Camera selector
        self.camera_label = QLabel("Select Camera:")
        self.main_layout.addWidget(self.camera_label)
        self.camera_selector = QComboBox()
        self.camera_selector.addItems(["0", "1", "2"])
        self.main_layout.addWidget(self.camera_selector)

        # Camera feed display
        self.feed_label = QLabel("Camera Feed")
        
        self.feed_label.setFixedSize(FEED_RESOLUTION[0], FEED_RESOLUTION[1])
        self.main_layout.addWidget(self.feed_label)

        # Instruction and Intent fields
        self.instruction_label = QLabel("Instruction:")
        self.main_layout.addWidget(self.instruction_label)
        self.instruction_input = QLineEdit()
        self.main_layout.addWidget(self.instruction_input)

        self.intent_label = QLabel("Intent:")
        self.main_layout.addWidget(self.intent_label)
        self.intent_input = QLineEdit()
        self.main_layout.addWidget(self.intent_input)

        # Slider for detection confidence threshold
        self.threshold_label = QLabel("Confidence: 0.50")
        self.main_layout.addWidget(self.threshold_label)

        self.threshold_slider = QSlider(Qt.Orientation.Horizontal)
        self.threshold_slider.setMinimum(0)
        self.threshold_slider.setMaximum(100)
        self.threshold_slider.setValue(50)
        self.threshold_slider.setTickPosition(QSlider.TicksBelow)
        self.threshold_slider.setTickInterval(10)
        self.threshold_slider.valueChanged.connect(self.on_threshold_changed)
        self.main_layout.addWidget(self.threshold_slider)

        # Snapshot interval
        self.interval_label = QLabel("Snapshot Interval (ms):")
        self.main_layout.addWidget(self.interval_label)
        self.interval_input = QLineEdit("1000")  # Changed default to 1000ms for better performance
        self.main_layout.addWidget(self.interval_input)

        # Set Save Directory
        self.save_dir_button = QPushButton("Set Save Directory")
        self.save_dir_button.clicked.connect(self.set_save_directory)
        self.main_layout.addWidget(self.save_dir_button)

        # Record / Stop
        self.record_button = QPushButton("Record")
        self.record_button.clicked.connect(self.start_recording)
        self.main_layout.addWidget(self.record_button)

        self.stop_button = QPushButton("Stop")
        self.stop_button.clicked.connect(self.stop_recording)
        self.main_layout.addWidget(self.stop_button)

        # Purge Recordings Folder
        self.purge_button = QPushButton("Purge Recordings Folder")
        self.purge_button.clicked.connect(self.purge_recordings)
        self.main_layout.addWidget(self.purge_button)

        # Post-Processing Button
        self.post_process_button = QPushButton("Post-Process Snapshots")
        self.post_process_button.clicked.connect(self.post_process_snapshots)
        self.main_layout.addWidget(self.post_process_button)

        # Record Instruction and Intent Buttons
        self.record_instruction_button = QPushButton("Record Instruction")
        self.record_instruction_button.clicked.connect(self.record_instruction)
        self.main_layout.addWidget(self.record_instruction_button)

        self.record_intent_button = QPushButton("Record Intent")
        self.record_intent_button.clicked.connect(self.record_intent)
        self.main_layout.addWidget(self.record_intent_button)

        # Feedback label
        self.feedback_label = QLabel("")
        self.main_layout.addWidget(self.feedback_label)

        self.cap = None
        self.audio_thread = None  # Thread for audio recording

        # Initialize SORT tracker
        self.tracker = Sort(max_age=5, min_hits=2, iou_threshold=0.3)

        # Start camera
        self.start_camera()

        # Start the background detection thread
        self.detection_thread = LiveDetectionThread(self, interval=0.1)
        self.detection_thread.start()
    def purge_recordings(self):
        """
        Deletes all files and subdirectories in the recordings folder.
        """
        try:
            if os.path.exists(self.base_save_dir):
                for item in os.listdir(self.base_save_dir):
                    item_path = os.path.join(self.base_save_dir, item)
                    if os.path.isfile(item_path) or os.path.islink(item_path):
                        os.unlink(item_path)  # Remove file or symlink
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)  # Remove directory
                self.feedback_label.setText("Recordings folder purged successfully.")
            else:
                self.feedback_label.setText("Recordings folder does not exist.")
        except Exception as e:
            self.feedback_label.setText(f"Error purging recordings folder: {e}")

    def post_process_snapshots(self):
        """
        Processes all `clean_image.jpg` files in snapshot folders and updates the associated JSON files.
        """
        try:
            if not os.path.exists(self.base_save_dir):
                self.feedback_label.setText("Recordings folder does not exist.")
                return

            # Iterate over each session folder
            for session_folder in os.listdir(self.base_save_dir):
                session_path = os.path.join(self.base_save_dir, session_folder)
                if not os.path.isdir(session_path):
                    continue  # Skip if it's not a directory

                for snapshot_folder in os.listdir(session_path):
                    snapshot_path = os.path.join(session_path, snapshot_folder)
                    if not os.path.isdir(snapshot_path):
                        continue  # Skip if it's not a directory

                    # Locate clean_image.jpg
                    clean_image_path = os.path.join(snapshot_path, "clean_image.jpg")
                    json_path = os.path.join(snapshot_path, f"data_{snapshot_folder.split('_')[-1]}.json")

                    if not os.path.exists(clean_image_path) or not os.path.exists(json_path):
                        print(f"Skipping incomplete snapshot folder: {snapshot_path}")
                        continue

                    # Load the clean image
                    image = cv2.imread(clean_image_path)
                    if image is None:
                        print(f"Error reading image: {clean_image_path}")
                        continue

                    # Perform Post-Processing
                    detected_objects = detect_objects_with_huggingface(image)
                    emotions = detect_emotions_deepface(image)
                    keypoints = detect_keypoints_superpoint(
                        image,
                        processor=self.detection_thread.processor,
                        model=self.detection_thread.model,
                        device=self.device
                    )

                    # Convert keypoints to Python-native types
                    keypoints = keypoints.astype(float).tolist()

                    # Convert detected objects' data to native types
                    detected_objects = [
                        {k: float(v) if isinstance(v, (np.integer, np.floating)) else v for k, v in obj.items()}
                        for obj in detected_objects
                    ]

                    # Convert emotions data to native types
                    emotions = [
                        {
                            "dominant_emotion": emo["dominant_emotion"],
                            "emotions": {k: float(v) for k, v in emo["emotions"].items()},
                            "region": {k: int(v) if isinstance(v, (np.integer)) else v for k, v in emo["region"].items()}
                        }
                        for emo in emotions
                    ]

                    print(f"Post-Processing Snapshot: {snapshot_path}")
                    print(f"Detected Objects: {detected_objects}")
                    print(f"Emotions: {emotions}")
                    print(f"Keypoints: {keypoints}")

                    if not os.path.exists(snapshot_path):
                        print(f"Error: Snapshot path does not exist: {snapshot_path}")
                    else:
                        print(f"Processing Snapshot: {snapshot_path}")

                    # Ensure JSON file exists

                    if not os.path.exists(json_path):
                        print(f"Error: JSON file does not exist: {json_path}")
                        continue
                    
                    # Update JSON with new data
                    with open(json_path, "r") as f:
                        data = json.load(f)

                    print(f"Original JSON Data: {data}")

                    # Add post-processed data
                    data["post_processing"] = {
                        "detected_objects": detected_objects,
                        "emotions": emotions,
                        "keypoints": keypoints,
                    }

                    print(f"Updated JSON Data: {data}")

                    # Save updated JSON
                    with open(json_path, "w") as f:
                        json.dump(data, f, indent=4)

            self.feedback_label.setText("Post-processing completed successfully.")
        except Exception as e:
            self.feedback_label.setText(f"Error during post-processing: {e}")

    def record_instruction(self):
        """
        Starts the speech-to-text process for the Instruction field.
        """
        self.record_instruction_button.setEnabled(False)
        self.speech_thread_instruction = QThread()
        self.speech_worker_instruction = SpeechToTextWorker()
        self.speech_worker_instruction.moveToThread(self.speech_thread_instruction)
        self.speech_thread_instruction.started.connect(self.speech_worker_instruction.run)
        self.speech_worker_instruction.finished.connect(self.speech_thread_instruction.quit)
        self.speech_worker_instruction.finished.connect(self.speech_worker_instruction.deleteLater)
        self.speech_thread_instruction.finished.connect(self.speech_thread_instruction.deleteLater)
        self.speech_worker_instruction.result.connect(self.update_instruction)
        self.speech_worker_instruction.error.connect(self.handle_speech_error)
        self.speech_thread_instruction.start()

    def record_intent(self):
        """
        Starts the speech-to-text process for the Intent field.
        """
        self.record_intent_button.setEnabled(False)
        self.speech_thread_intent = QThread()
        self.speech_worker_intent = SpeechToTextWorker()
        self.speech_worker_intent.moveToThread(self.speech_thread_intent)
        self.speech_thread_intent.started.connect(self.speech_worker_intent.run)
        self.speech_worker_intent.finished.connect(self.speech_thread_intent.quit)
        self.speech_worker_intent.finished.connect(self.speech_worker_intent.deleteLater)
        self.speech_thread_intent.finished.connect(self.speech_thread_intent.deleteLater)
        self.speech_worker_intent.result.connect(self.update_intent)
        self.speech_worker_intent.error.connect(self.handle_speech_error)
        self.speech_thread_intent.start()

    def update_instruction(self, text):
        """
        Updates the Instruction QLineEdit with the transcribed text.
        """
        self.instruction_input.setText(text)
        self.record_instruction_button.setEnabled(True)

    def update_intent(self, text):
        """
        Updates the Intent QLineEdit with the transcribed text.
        """
        self.intent_input.setText(text)
        self.record_intent_button.setEnabled(True)

    def handle_speech_error(self, error):
        """
        Handles errors from the speech-to-text process.
        """
        self.feedback_label.setText(f"Speech Recognition Error: {error}")
        self.record_instruction_button.setEnabled(True)
        self.record_intent_button.setEnabled(True)

    def on_threshold_changed(self):
        new_val = self.threshold_slider.value() / 100.0
        self.confidence_threshold = new_val
        self.threshold_label.setText(f"Confidence: {new_val:.2f}")

    def start_camera(self):
        if self.cap and self.cap.isOpened():
            self.feedback_label.setText("Camera already running.")
            return

        camera_index = int(self.camera_selector.currentText())
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            self.feedback_label.setText("Error: Could not open selected webcam.")
            return

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FEED_RESOLUTION[0])
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FEED_RESOLUTION[1])

        self.running = True
        self.camera_thread = threading.Thread(target=self.camera_loop, daemon=True)
        self.camera_thread.start()

        self.camera_timer = QTimer(self)
        self.camera_timer.timeout.connect(self.update_camera_feed)
        self.camera_timer.start(30)

    def camera_loop(self):
        while self.running:
            if self.cap:
                ret, frame = self.cap.read()
                if ret:
                    with self.lock:
                        self.frame = frame.copy()
                time.sleep(0.01)

    def update_camera_feed(self):
        if self.frame is not None:
            with self.lock:
                display_frame = self.frame.copy()
                detected_objects = self.live_detected_objects
                joint_outputs = self.live_joint_outputs

            # Prepare detections for SORT
            detections = []
            labeled_detected_objects = []
            for obj in detected_objects:
                x1, y1, x2, y2 = obj["box"]
                score = obj["score"]
                label = obj["label"]
                detections.append([x1, y1, x2, y2, score])
                labeled_detected_objects.append([x1, y1, x2, y2, score, label])
            dets = np.array(detections)

            # Update tracker
            tracked_objects = self.tracker.update(dets)

            # Draw tracked bounding boxes with IDs
            for (x1, y1, x2, y2, score, label) in labeled_detected_objects:
                cv2.rectangle(display_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(display_frame, f"{label} ({score:.2f})", (int(x1), int(y1) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            # Handle video recording
            if self.recording and hasattr(self, 'video_writer') and self.video_writer is not None:
                self.video_writer.write(display_frame)

            display_frame = cv2.resize(display_frame, FEED_RESOLUTION)

            # Flip the frame horizontally
            cv2.flip(display_frame, 1, display_frame)
            rgb_frame = cv2.cvtColor(display_frame, cv2.COLOR_BGR2RGB)

            h, w, ch = rgb_frame.shape
            bytes_per_line = ch * w
            q_image = QImage(rgb_frame.data, w, h, bytes_per_line, QImage.Format_RGB888)
            self.feed_label.setPixmap(QPixmap.fromImage(q_image))

    def start_recording(self):
        # We need to record the time when recording starts
        self.start_time = time.time()
        if self.recording:
            self.feedback_label.setText("Already recording.")
            return
        try:
            interval = int(self.interval_input.text())
            if interval < 100:
                self.feedback_label.setText("Interval too short. Setting to 1000 ms.")
                interval = 1000
        except ValueError:
            self.feedback_label.setText("Invalid interval value. Setting to 1000 ms.")
            interval = 1000

        timestamp = int(self.start_time * 1000)
        self.session_dir = os.path.join(self.base_save_dir, f"session_{timestamp}")
        os.makedirs(self.session_dir, exist_ok=True)

        # Start image captioning thread
        self.sf_captioning_thread = SFImageCaptioningThread(self, interval=0.5)
        self.sf_captioning_thread.start()

        # Start audio recording
        audio_filename = os.path.join(self.session_dir, "audio.wav")
        self.audio_thread = AudioRecorderThread(output_path=audio_filename)
        self.audio_thread.start()

        # Initialize video writer
        video_filename = os.path.join(self.session_dir, "video.avi")
        fourcc = cv2.VideoWriter_fourcc(*'XVID')  # type: ignore
        self.video_writer = cv2.VideoWriter(video_filename, fourcc, 20.0, FEED_RESOLUTION)
        if not self.video_writer.isOpened():
            self.feedback_label.setText("Error: Could not open video writer.")
            return

        self.recording = True
        self.feedback_label.setText(f"Recording started. Saving to {self.session_dir}.")
        self.timer.timeout.connect(self.take_snapshot)
        self.timer.start(FRAME_RATE)

    def stop_recording(self):
        if not self.recording:
            self.feedback_label.setText("Not currently recording.")
            return

        self.recording = False
        self.timer.stop()
        self.start_time = None

        # Stop image captioning thread
        if self.sf_captioning_thread and self.sf_captioning_thread.is_alive():
            self.sf_captioning_thread.stop()
            self.sf_captioning_thread.join()
            self.sf_captioning_thread = None

        # Stop audio recording
        if self.audio_thread and self.audio_thread.is_alive():
            self.audio_thread.stop()
            self.audio_thread.join()
            self.audio_thread = None

        # Release video writer
        if hasattr(self, 'video_writer') and self.video_writer is not None:
            self.video_writer.release()
            self.video_writer = None

        self.feedback_label.setText(f"Recording stopped. Session data is in {self.session_dir}.")

    def set_save_directory(self):
        directory = QFileDialog.getExistingDirectory(self, "Select Save Directory")
        if directory:
            self.base_save_dir = directory
            self.feedback_label.setText(f"Base save directory set to {self.base_save_dir}.")

    def extract_features_dinov2(self, image):
        """
        Extracts visual features from an image using DINOv2.

        Parameters:
            image (np.ndarray): The image frame in BGR format.

        Returns:
            torch.Tensor: Feature embeddings extracted by DINOv2.
        """
        try:
            # Placeholder for DINOv2 feature extraction
            # Implement as needed
            return None
        except Exception as e:
            print(f"DINOv2 feature extraction error: {e}")
            return None

    def take_snapshot(self):
        if self.frame is None:
            return

        with self.lock:
            snapshot_frame = self.frame.copy()

        snapshot_frame = cv2.resize(snapshot_frame, FEED_RESOLUTION)    
        timestamp = int(time.time() * 1000)
        if self.session_dir is None:
            self.feedback_label.setText("Error: Session directory is not set.")
            return

        snapshot_subdir = os.path.join(self.session_dir, f"snapshot_{timestamp}")
        os.makedirs(snapshot_subdir, exist_ok=True)

        # Define filenames for clean and annotated snapshots
        clean_snapshot_filename = os.path.join(snapshot_subdir, "clean_image.jpg")
        annotated_snapshot_filename = os.path.join(snapshot_subdir, "annotated_image.jpg")
        depth_map_filename = os.path.join(snapshot_subdir, "depth_map.jpg")

        # Save the clean snapshot (unannotated)
        cv2.imwrite(clean_snapshot_filename, snapshot_frame)

        # Perform Object Detection in Post-Processing
        # detected_objects = detect_objects_with_huggingface(snapshot_frame)

        # Perform Keypoint Detection in Post-Processing
        # keypoints = detect_keypoints_superpoint(
        #     snapshot_frame,
        #     processor=self.detection_thread.processor,
        #     model=self.detection_thread.model,
        #     device=self.device
        # )

        # Perform Emotion Detection in Post-Processing
        # emotions = detect_emotions_deepface(snapshot_frame)

        # Prepare detections for SORT
        # detections = []
        # for obj in detected_objects:
        #     x1, y1, x2, y2 = obj["box"]
        #     score = obj["score"]
        #     detections.append([x1, y1, x2, y2, score])
        # dets = np.array(detections)

        # Update tracker
        # tracked_objects = self.tracker.update(dets)

        # Generate Depth Map from Clean Snapshot
        pil_clean_snapshot = Image.fromarray(cv2.cvtColor(snapshot_frame, cv2.COLOR_BGR2RGB))
        # depth_result = self.depth_pipe(pil_clean_snapshot)
        # if isinstance(depth_result, dict) and "depth" in depth_result:
        #     depth_map = depth_result["depth"]
        #     depth_map.save(depth_map_filename)
        # else:
        #     print("Unexpected pipeline output:", depth_result)
        #     depth_result = depth_result['depth']  # type: ignore
        #     depth_result.save(depth_map_filename)  # type: ignore

        # # Create Annotated Snapshot
        # annotated_image = snapshot_frame.copy()
        # for obj in detected_objects:
        #     x1, y1, x2, y2 = map(int, obj["box"])
        #     label = f"{obj['label']} ({obj['score']:.2f})"
        #     cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        #     cv2.putText(annotated_image, label, (x1, y1 - 10),
        #                 cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # for trk in tracked_objects:
        #     x1, y1, x2, y2, trk_id = trk
        #     label = f"ID {int(trk_id)}"
        #     cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
        #     cv2.putText(annotated_image, label, (int(x1), int(y1) - 10),
        #                 cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        joints = simulate_joint_outputs()
        # for joint in simulate_joint_outputs():
        #     x, y, z = (joint * np.array([FEED_RESOLUTION[0], FEED_RESOLUTION[1], 1])).astype(int)
        #     cv2.circle(annotated_image, (x, y), 5, (255, 0, 0), -1)

        # for (kx, ky) in keypoints:
        #     cv2.circle(annotated_image, (int(kx), int(ky)), 3, (0, 0, 255), -1)

        # # Annotate Emotions in Snapshot
        # for emotion in emotions:
        #     region = emotion["region"]
        #     dominant_emotion = emotion["dominant_emotion"]
        #     x, y, w, h = region["x"], region["y"], region["w"], region["h"]
        #     cv2.rectangle(annotated_image, (x, y), (x + w, y + h), (0, 255, 255), 2)
        #     cv2.putText(annotated_image, dominant_emotion, (x, y - 10),
        #                 cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        # # Save the annotated snapshot
        # cv2.imwrite(annotated_snapshot_filename, annotated_image)

        # Prepare tracking data
        tracking_data = []
        # for trk in tracked_objects:
        #     x1, y1, x2, y2, trk_id = trk
        #     tracking_data.append({
        #         "id": int(trk_id),
        #         "bbox": [int(x1), int(y1), int(x2), int(y2)]
        #     })

        # Prepare emotion data
        # emotion_data_cleaned = []
        # for emotion in emotions:
        #     region = {
        #         "x": emotion["region"]["x"],
        #         "y": emotion["region"]["y"],
        #         "w": emotion["region"]["w"],
        #         "h": emotion["region"]["h"],
        #         "left_eye": emotion["region"].get("left_eye", {}),
        #         "right_eye": emotion["region"].get("right_eye", {})
        #     }
        #     cleaned_emotions = {k: float(v) for k, v in emotion["emotions"].items()}
        #     emotion_data_cleaned.append({
        #         "dominant_emotion": emotion["dominant_emotion"],
        #         "emotions": cleaned_emotions,
        #         "region": region
        #     })

        # VILT Question Answering Post-Processing
        # question = "What is going on in the image?"
        # encoding = self.vilt_processor(pil_clean_snapshot, question, return_tensors="pt") # type: ignore
        # outputs = self.vilt_model(**encoding)
        # logits = outputs.logits
        # idx = logits.argmax(-1).item()
        # answer = self.vilt_model.config.id2label[idx]

        # Prepare JSON data
        data_json = {
            "snapshot_id": self.num_snapshots,
            "recording_data": {
                "start_time": self.start_time,
            },
            "timestamp": timestamp,
            "instruction": self.instruction_input.text(),
            "intent": self.intent_input.text(),
            # "detected_objects": detected_objects,
            # "tracked_objects": tracking_data,
            # "depth_map": os.path.basename(depth_map_filename),
            # "annoted_snapshot": os.path.basename(annotated_snapshot_filename),
            "audio": os.path.basename("audio.wav"),
            "video": os.path.basename("video.avi"),
            # "emotions": emotion_data_cleaned,
            # "vilt_answer": answer,
            # "keypoints": keypoints.astype(float).tolist(),
            "joint_outputs": joints.tolist()
        }

        json_file = os.path.join(snapshot_subdir, f"data_{timestamp}.json")
        with open(json_file, "w") as f:
            json.dump(data_json, f, indent=4)

        self.feedback_label.setText(f"Snapshot + depth map saved in {snapshot_subdir}")
        self.num_snapshots += 1

    def closeEvent(self, event):
        if self.cap:
            self.cap.release()
        if self.timer:
            self.timer.stop()
        self.running = False

        if hasattr(self, 'detection_thread'):
            self.detection_thread.stop()
            self.detection_thread.join()

        if self.audio_thread and self.audio_thread.is_alive():
            self.audio_thread.stop()
            self.audio_thread.join()
            self.audio_thread = None

        event.accept()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DataRecorderApp()
    window.show()
    sys.exit(app.exec())