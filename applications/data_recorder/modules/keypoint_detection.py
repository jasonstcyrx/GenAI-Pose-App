# modules/keypoint_detection.py

import torch
import numpy as np
from transformers import AutoImageProcessor, SuperPointForKeypointDetection
from PIL import Image


def detect_keypoints_superpoint(image, processor, model, device):
    """
    Runs SuperPoint keypoint detection on 'image' and returns the detected keypoints.

    Parameters:
        image (np.ndarray): The image frame in BGR format.
        processor: Pretrained SuperPoint processor.
        model: Pretrained SuperPoint model.
        device: Torch device.

    Returns:
        np.ndarray: An array of detected keypoints with shape (N, 2), where N is the number of keypoints.
    """
    try:
        # Convert BGR image to RGB and then to PIL format
        pil_image = Image.fromarray(image[:, :, ::-1])

        # Preprocess the image
        inputs = processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # Run the model inference
        with torch.no_grad():
            outputs = model(**inputs)

        # Extract keypoints from the outputs
        if hasattr(outputs, 'keypoints') and outputs.keypoints is not None:
            keypoints = outputs.keypoints[0].cpu().numpy()  # Shape: (N, 2)
        else:
            keypoints = np.array([])  # No keypoints detected

        return keypoints
    except Exception as e:
        print(f"Keypoint detection error: {e}")
        return np.array([])  # Return empty array on failure