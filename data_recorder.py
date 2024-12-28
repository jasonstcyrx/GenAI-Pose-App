import posecamera
import cv2

# Initialize HandTracker
det = posecamera.hand_tracker.HandTracker()

# Define hand keypoint labels (adjust as per the model's output format)
keypoint_labels = [
    "Wrist", "Thumb_CMC", "Thumb_MCP", "Thumb_IP", "Thumb_Tip",
    "Index_MCP", "Index_PIP", "Index_DIP", "Index_Tip",
    "Middle_MCP", "Middle_PIP", "Middle_DIP", "Middle_Tip",
    "Ring_MCP", "Ring_PIP", "Ring_DIP", "Ring_Tip",
    "Pinky_MCP", "Pinky_PIP", "Pinky_DIP", "Pinky_Tip"
]

# Open webcam stream
cap = cv2.VideoCapture(0)  # Use 0 for default camera or replace with camera index

if not cap.isOpened():
    raise RuntimeError("Could not open webcam. Please check your camera connection.")

print("Press 'q' to exit the camera stream.")

while True:
    # Capture frame-by-frame
    ret, frame = cap.read()
    if not ret or frame is None:
        print("Failed to grab frame. Skipping...")
        continue

    # Resize frame to expected dimensions
    frame = cv2.resize(frame, (640, 480))  # Resize if required

    # Perform hand detection
    try:
        keypoints, bbox = det(frame)
        if keypoints is None:
            print("No keypoints detected.")
            continue
    except Exception as e:
        print(f"Detection error: {e}")
        continue

    # Draw keypoints and labels on the frame
    for hand_keypoints in keypoints:
        if hand_keypoints is not None:  # Ensure the element is not None
            for i, keypoint in enumerate(hand_keypoints):
                # Complet Things We need to Do here Before collecting the angle data.
                # 1. Draw the keypoint on the frame
                # 2. Add label near the keypoint
                # 3. Smooth out the jumping of the keypoint
                # 3. Remove the noise from the keypoint and background

                # Draw keypoint on the frame


                
                


                # Ensure keypoint is converted to (int, int)
                x, y = map(int, keypoint)
                cv2.circle(frame, (x, y), 5, (0, 0, 255), -1)  # Draw keypoint
                # Add label near the keypoint
                label = keypoint_labels[i] if i < len(keypoint_labels) else f"Keypoint {i}"
                cv2.putText(frame, label, (x + 10, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)

    # Display the resulting frame
    cv2.imshow("PoseCamera - Hand Tracking with Labels", frame)

    # Break the loop on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the webcam and close windows
cap.release()
cv2.destroyAllWindows()