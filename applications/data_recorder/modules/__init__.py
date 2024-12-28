# modules/__init__.py

from .speech_recognition import SpeechToTextWorker
from .sort_tracker import Sort, associate_detections_to_trackers
from .depth_estimation import initialize_depth_pipeline
from .image_captioning import SFImageCaptioningThread
from .audio_recording import AudioRecorderThread
from .detection import LiveDetectionThread, detect_objects_with_huggingface
from .emotion_detection import detect_emotions_deepface
from .keypoint_detection import detect_keypoints_superpoint
from .utils import simulate_joint_outputs