# modules/emotion_detection.py

from deepface import DeepFace


def detect_emotions_deepface(image):
    """
    Runs DeepFace emotion detection on 'image' and returns a list of detected emotions with bounding boxes.
    """
    try:
        analysis = DeepFace.analyze(image, actions=['emotion'], enforce_detection=False)
        emotions = []
        if isinstance(analysis, list):
            for face in analysis:
                emotions.append({
                    "dominant_emotion": face["dominant_emotion"],
                    "emotions": face["emotion"],
                    "region": face["region"]
                })
        else:
            emotions.append({
                "dominant_emotion": analysis["dominant_emotion"],
                "emotions": analysis["emotion"],
                "region": analysis["region"]
            })
        return emotions
    except Exception as e:
        print(f"Emotion detection error: {e}")
        return []