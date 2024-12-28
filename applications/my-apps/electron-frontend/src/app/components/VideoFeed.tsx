// src/app/components/VideoFeed.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ReactMediaRecorder, ReactMediaRecorderHookProps, useReactMediaRecorder } from 'react-media-recorder';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { SelectChangeEvent } from '@mui/material';

import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { ipcRenderer } from 'electron';





/**
 * VideoPreview Component
 * Displays the live video stream.
 */

type VideoPreviewProps = {
  stream: MediaStream | null;
  height?: number;
  width?: number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
};


interface Connection {
  startIndex: number;
  endIndex: number;
}

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Define connections based on MediaPipe's hand model
  const connections: Connection[] = [
    // Example connections for the thumb
    { startIndex: 0, endIndex: 1 },
    { startIndex: 1, endIndex: 2 },
    { startIndex: 2, endIndex: 3 },
    { startIndex: 3, endIndex: 4 },
    // Repeat for other fingers...
    // Index finger
    { startIndex: 0, endIndex: 5 },
    { startIndex: 5, endIndex: 6 },
    { startIndex: 6, endIndex: 7 },
    { startIndex: 7, endIndex: 8 },
    // Middle finger
    { startIndex: 0, endIndex: 9 },
    { startIndex: 9, endIndex: 10 },
    { startIndex: 10, endIndex: 11 },
    { startIndex: 11, endIndex: 12 },
    // Ring finger
    { startIndex: 0, endIndex: 13 },
    { startIndex: 13, endIndex: 14 },
    { startIndex: 14, endIndex: 15 },
    { startIndex: 15, endIndex: 16 },
    // Pinky finger
    { startIndex: 0, endIndex: 17 },
    { startIndex: 17, endIndex: 18 },
    { startIndex: 18, endIndex: 19 },
    { startIndex: 19, endIndex: 20 },
  ];

  const drawResults = (results: HandLandmarkerResult) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Draw hand landmarks
    results.landmarks.forEach((handLandmarks) => {
      // Draw connections
      connections.forEach((conn) => {
        const start = handLandmarks[conn.startIndex];
        const end = handLandmarks[conn.endIndex];
        if (start && end) {
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw landmarks
      handLandmarks.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'blue';
        ctx.fill();
      });
    });
  };

  const detectHands = async (vision: any, video: HTMLVideoElement) => {
    const handLandmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "assets/models/hand_landmarker.task"
        },
        numHands: 2,
        runningMode: "VIDEO"
      });

    handLandmarkerRef.current = handLandmarker;

    setInterval(() => {
      // get image from video feed and pass it to handLandmarker
      const image = videoRef.current
      if (image) {
        const timestep = new Date().getTime();
        const handLandmarkerResult = handLandmarker.detectForVideo(image, timestep);
        // send the handLandmarkerResult to the main process
        (window as any).electron.handleHandDataKeypoints(handLandmarkerResult, timestep)
        drawResults(handLandmarkerResult);
      }
    }, 30);
  }

  const initHands = async () => {

    const vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const video = videoRef.current

    if (video)
      detectHands(vision, video)
  }

  // add the handlandmarker
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      initHands()
    }
  }, [stream]);


  // console.log((window as any).electron.handleHandDataKeypoints)

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <video ref={videoRef} width={"100%"} autoPlay />
      <canvas id="output" width="640" height="480" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 8,
        pointerEvents: 'none', // Ensures the canvas doesn't block video interactions
      }} ref={canvasRef}></canvas>
    </div>
  )
};

type VideoFeedProps = {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
};

/**
 * VideoFeed Component
 * Handles camera access, recording, and playback.
 */
const VideoFeed = ({ onStartRecording, onStopRecording }: VideoFeedProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  //

  /**
   * Fetches available video input devices on component mount.
   */
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devicesList) => {
        const videoDevices = devicesList.filter(
          (device) => device.kind === 'videoinput'
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        } else {
          setError('No camera devices found.');
        }
      })
      .catch((err) => {
        console.error('Error enumerating devices:', err);
        setError('Failed to access media devices.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);


  /**
   * Handles camera device selection changes.
   * @param event - The select change event.
   */
  const handleDeviceChange = (event: SelectChangeEvent<string>) => {
    setSelectedDeviceId(event.target.value);
  };

  /**
   * Memoizes media recorder options to re-initialize when `selectedDeviceId` changes.
   */
  const mediaRecorderOptions = useMemo<ReactMediaRecorderHookProps>(
    () => ({
      video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      audio: false,
      onStart: () => {
        onStartRecording && onStartRecording();
      },
      onStop: () => {
        onStopRecording && onStopRecording();
      },

    }),
    [selectedDeviceId, onStartRecording, onStopRecording]
  );

  /**
   * Destructures the necessary properties from useReactMediaRecorder.
   */
  const {
    status,
    startRecording,
    stopRecording,
    clearBlobUrl,
    mediaBlobUrl,
    previewStream,
    error: recorderError,
  } = useReactMediaRecorder(mediaRecorderOptions);





  /**
   * Conditional rendering based on loading and error states.
   */
  if (isLoading) {
    return (
      <Stack alignItems="center" mt={4}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack alignItems="center" mt={4}>
        <Alert severity="error">{error}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={4} mt={4} mb={4} alignItems="center" flexGrow={1}>
      {/* Video Feed Section */}
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          width: '100%',
          borderRadius: 2,
          backgroundColor: 'background.paper',
          position: 'relative',
        }}
      >
        <Typography variant="h5" gutterBottom>
          {
            selectedDeviceId ? `Camera ${devices.find((device) => device.deviceId === selectedDeviceId)?.label || selectedDeviceId}` : 'No Camera Selected'
          }
        </Typography>

        {/* Status Indicator */}
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
          }}
        >
          {status === 'recording' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <StopIcon sx={{ mr: 1 }} />
              <Typography variant="body1">Recording...</Typography>
            </Stack>
          )}
          {status === 'idle' && (
            <Stack direction="row" alignItems="center" color="success.main">
              <PlayArrowIcon sx={{ mr: 1 }} />
              <Typography variant="body1">Idle</Typography>
            </Stack>
          )}

          {status === 'acquiring_media' && (
            <Stack direction="row" alignItems="center" color="info.main">
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body1">Acquiring Media...</Typography>

            </Stack>
          )}

          {status === 'stopping' && (
            <Stack direction="row" alignItems="center" color="info.main">
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body1">Stopping...</Typography>
            </Stack>
          )}

          {status === 'permission_denied' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">Permission Denied</Typography>
            </Stack>
          )}

          {status === 'no_constraints' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">No Constraints</Typography>
            </Stack>
          )}

          {status === 'stopped' && (
            <Stack direction="row" alignItems="center" color="info.main">
              <Typography variant="body1">Stopped</Typography>
            </Stack>
          )}

          {status === 'media_in_use' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">Media In Use</Typography>
            </Stack>
          )}

          {status === 'recorder_error' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">Recorder Error</Typography>
            </Stack>
          )}

          {status === 'media_aborted' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">Media Aborted</Typography>
            </Stack>
          )}

          {status === 'invalid_media_constraints' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">Invalid Media Constraints</Typography>
            </Stack>
          )}

          {status === 'no_specified_media_found' && (
            <Stack direction="row" alignItems="center" color="error.main">
              <Typography variant="body1">No Specified Media Found</Typography>
            </Stack>
          )}



        </Stack>

        {/* Video Preview */}
        {
          previewStream && status == 'recording' && (
            <>
              <Typography variant="h5" gutterBottom>
                Live Video Feed
              </Typography>
              <VideoPreview stream={previewStream} />
            </>

          )
        }

        {mediaBlobUrl && (
          <>
            <Typography variant="h5" gutterBottom>
              Recorded Video
            </Typography>
            {
              mediaBlobUrl && (
                <video
                  controls
                  autoPlay
                  src={mediaBlobUrl}
                  style={{ width: '100%', borderRadius: 8 }}
                />
              )
            }
          </>

        )}

        {/* Camera Selection */}
        <Stack mt={2}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="camera-select-label">Select Camera</InputLabel>
            <Select
              labelId="camera-select-label"
              id="camera-select"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              label="Select Camera"
            >
              {devices.map((device) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Recording Controls */}
        {/* status */}
        {/* media_aborted
permission_denied
no_specified_media_found
media_in_use
invalid_media_constraints
no_constraints
recorder_error
idle
acquiring_media
recording
stopping
stopped */}
        <Stack direction="row" justifyContent="center" spacing={2} mt={3}>

          {status === 'idle' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CameraAltIcon />}
              onClick={startRecording}
            >
              Start Recording
            </Button>
          )}

          {status === 'recording' && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<StopIcon />}
              onClick={stopRecording}
            >
              Stop Recording
            </Button>
          )}

          {status === 'stopped' &&
            <Button
              variant="contained"
              color="primary"
              startIcon={<CameraAltIcon />}
              onClick={clearBlobUrl}
            >
              Clear Recording
            </Button>
          }

          {/* Recorder Error Alert */}
          {recorderError && (
            <Alert severity="error">{recorderError}</Alert>
          )}
        </Stack>

        {/* Recorder Error Alert */}

      </Paper>
    </Stack>
  );
};

export default VideoFeed;