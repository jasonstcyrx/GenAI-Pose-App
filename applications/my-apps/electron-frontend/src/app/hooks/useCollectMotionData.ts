import { useState, useEffect, useCallback, useMemo } from 'react';
import useCollectJoints from './useCollectJoints';

interface DetectedObject {
    label: string;
    score: number;
    box: [number, number, number, number];
}

interface EmotionScores {
    angry: number;
    disgust: number;
    fear: number;
    happy: number;
    sad: number;
    surprise: number;
    neutral: number;
}

interface Emotion {
    dominant_emotion: string;
    emotions: EmotionScores;
    region: {
        x: number;
        y: number;
        w: number;
        h: number;
        left_eye: object | null;
        right_eye: object | null;
    };
}

interface PostProcessing {
    detected_objects: DetectedObject[];
    emotions: Emotion[];
    keypoints: object[];
}

interface HumanMotion {
    snapshot_id: number;
    recording_data: {
        start_time: number;
    };
    timestamp: number;
    elapsed_time: number;
    instruction: string;
    intent: string;
    audio: string;
    video: string;
    joint_outputs: number[][];
    post_processing: PostProcessing;
}

const useCollectMotionData = ({ interval_ms = 500 }: { interval_ms?: number } = {}) => {
    const [motionData, setMotionData] = useState<HumanMotion[]>([]);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const { jointPositions, fetchNextJointPositions } = useCollectJoints(isRecording);
    const [startTime, setStartTime] = useState<number | null>(null);

    const startRecording = useCallback(() => {
        setIsRecording(true);
        const currentTime = Date.now();
        setStartTime(currentTime);

        (window as any).electron.startRecording();

    }, []);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        setStartTime(null);

        (window as any).electron.stopRecording();
    }, []);

    // const memoizedMotionData = useMemo(() => motionData, [motionData]);

    useEffect(() => {
        if (isRecording && startTime !== null) {
            const interval = setInterval(() => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;

                const newMotionData: HumanMotion = {
                    snapshot_id: currentTime,
                    recording_data: {
                        start_time: startTime,
                    },
                    timestamp: currentTime,
                    elapsed_time: elapsedTime,
                    instruction: 'Sample instruction',
                    intent: 'Sample intent',
                    audio: 'path/to/audio',
                    video: 'path/to/video',
                    joint_outputs: jointPositions,
                    post_processing: {
                        detected_objects: [],
                        emotions: [],
                        keypoints: [],
                    },
                };

                // setMotionData(prev => [...prev, newMotionData]);
            }, interval_ms);

            return () => clearInterval(interval);
        }
    }, [isRecording, jointPositions, startTime, interval_ms]);

    return { motionData, startRecording, stopRecording, fetchNextJointPositions };
};

export default useCollectMotionData;
