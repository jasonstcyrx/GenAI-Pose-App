import { useMemo, useState } from 'react';
import { Typography, Stack, TextField } from '@mui/material';
import VideoFeed from '../components/VideoFeed';
import useCollectMotionData from '../hooks/useCollectMotionData';
import ThreeJSPlayground from '../components/ThreeJS';
import BluetoothConnector from '../components/BluetoothConnector';

const RecorderPage = () => {

    const [ms, setMs] = useState<number>(500);

    const {
        // motionData,
        startRecording,
        stopRecording,
    } = useCollectMotionData({ interval_ms: ms });

    return (
        <Stack direction="column" spacing={2} flexGrow={1}>
            <Stack direction="row" spacing={2} flexGrow={1}>
                <Stack spacing={2} flexGrow={1}>
                    <VideoFeed onStartRecording={startRecording} onStopRecording={stopRecording} />
                    <Stack direction="row" spacing={2} flexGrow={1}>
                        <Stack spacing={2} flexGrow={1}>


                            <TextField
                                label="Instructions"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={4}
                            />

                            <TextField
                                label="Intent"
                                variant="outlined"
                                fullWidth
                            />


                            <TextField
                                label="Recording Status"
                                variant="outlined"
                                fullWidth
                            // value={isRecording ? 'Recording' : 'Idle'}
                            />

                            <TextField
                                label="Data Points"
                                variant="outlined"
                                fullWidth
                                multiline
                                minRows={4}
                            // value={JSON.stringify(motionData, null, 2)}
                            />


                        </Stack>
                    </Stack>
                </Stack>
                <Stack spacing={2} flexGrow={1}>
                    {/* Three.js Model Placeholder */}
                    {/* <ThreeJSPlayground /> */}
                    <BluetoothConnector />
                </Stack>



            </Stack>

        </Stack>
    );
}

export default RecorderPage;