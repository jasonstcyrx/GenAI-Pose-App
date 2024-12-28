/// <reference types="web-bluetooth" />

import React, { useState, useEffect } from 'react';
import { Button, Typography, Box, Alert } from '@mui/material';
// interface Bluetooth
// extends EventTarget, BluetoothDeviceEventHandlers, CharacteristicEventHandlers, ServiceEventHandlers
// {
//     getDevices(): Promise<BluetoothDevice[]>;
//     getAvailability(): Promise<boolean>;
//     onavailabilitychanged: (this: this, ev: Event) => any;
//     readonly referringDevice?: BluetoothDevice | undefined;
//     requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
//     requestLEScan(options?: BluetoothLEScanOptions): Promise<BluetoothLEScan>;
//     addEventListener(type: "availabilitychanged", listener: (this: this, ev: Event) => any, useCapture?: boolean): void;
//     addEventListener(
//         type: "advertisementreceived",
//         listener: (this: this, ev: BluetoothAdvertisingEvent) => any,
//         useCapture?: boolean,
//     ): void;
//     addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
// }
export default function BluetoothConnector() {
    const [deviceName, setDeviceName] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleBluetoothDevices = () => {
        (window as any).electron.startScan().then((devices: any) => {
            // Use the devices array to create the popup
            console.log(devices);

        });
    }

    const bt = async () => {
        handleBluetoothDevices();
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,

            optionalServices: ['battery_service'], // Specify services if needed
        })

        console.log(device);
    }



    useEffect(() => {

    }, []);

    return (
        <Box sx={{ padding: 2 }}>
            <Typography variant="h6" gutterBottom>
                Bluetooth Device: {deviceName || 'None'}
            </Typography>

            {errorMessage && (
                <Alert severity="error" sx={{ marginBottom: 2 }}>
                    {errorMessage}
                </Alert>
            )}

            <Button
                variant="contained"
                color="primary"
                onClick={bt}
                sx={{ marginRight: 1 }}
            >
                Request Device
            </Button>
            <Button
                variant="outlined"
                color="secondary"
            // onClick={handleCancelRequest}
            >
                Cancel
            </Button>
        </Box>
    );
}