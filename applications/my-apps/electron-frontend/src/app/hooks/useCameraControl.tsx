// hooks/useCameraControl.ts

import { useState, useEffect, useCallback } from 'react';

interface UseCameraControlProps {
    initialDeviceId?: string;
}

interface UseCameraControlReturn {
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    selectDevice: (deviceId: string) => void;
    stream: MediaStream | null;
    isLoading: boolean;
    error: string;
    startStream: () => void;
    stopStream: () => void;
}

const useCameraControl = ({ initialDeviceId = '' }: UseCameraControlProps = {}): UseCameraControlReturn => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialDeviceId);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    /**
     * Enumerates available video input devices.
     */
    const enumerateDevices = useCallback(async () => {
        try {
            const devicesList = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devicesList.filter(device => device.kind === 'videoinput');
            setDevices(videoDevices);

            // If no device is selected, select the first available
            if (!selectedDeviceId && videoDevices.length > 0) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            }

            if (videoDevices.length === 0) {
                setError('No camera devices found.');
            }
        } catch (err) {
            console.error('Error enumerating devices:', err);
            setError('Failed to access media devices.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedDeviceId]);

    /**
     * Starts the media stream based on the selected device.
     */
    const startStream = useCallback(async () => {
        if (!selectedDeviceId) {
            setError('No camera device selected.');
            return;
        }

        const constraints: MediaStreamConstraints = {
            video: { deviceId: { exact: selectedDeviceId } },
            audio: false,
        };

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setError('');
        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access the selected camera.');
            setStream(null);
        }
    }, [selectedDeviceId]);

    /**
     * Stops the current media stream.
     */
    const stopStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    /**
     * Handles device selection changes.
     * @param deviceId - The device ID to select.
     */
    const selectDevice = useCallback((deviceId: string) => {
        setSelectedDeviceId(deviceId);
    }, []);

    /**
     * Enumerates devices on mount.
     */
    useEffect(() => {
        enumerateDevices();
    }, [enumerateDevices]);

    /**
     * Starts the stream when a new device is selected.
     */
    useEffect(() => {
        // Stop any existing stream before starting a new one
        stopStream();
        if (selectedDeviceId) {
            startStream();
        }
    }, [selectedDeviceId, startStream, stopStream]);

    /**
     * Cleans up the stream when the component using the hook unmounts.
     */
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    return {
        devices,
        selectedDeviceId,
        selectDevice,
        stream,
        isLoading,
        error,
        startStream,
        stopStream,
    };
};

export default useCameraControl;