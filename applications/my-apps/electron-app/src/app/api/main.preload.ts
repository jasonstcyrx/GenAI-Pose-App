import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

interface ElectronBluetoothDevice {
  // Define the properties of ElectronBluetoothDevice here
  id: string;
  name: string;
  connected: boolean;
}

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  cancelBluetoothRequest: () => ipcRenderer.send('cancel-bluetooth-request'),
  bluetoothPairingRequest: (callback) => ipcRenderer.on('bluetooth-pairing-request', () => callback()),
  bluetoothPairingResponse: (response) => ipcRenderer.send('bluetooth-pairing-response', response),
  handleBluetoothDevices: (callback: (evt: IpcRendererEvent, value: ElectronBluetoothDevice[]) => void) => {
    // Fire the callback when we receive something on the "xyz" channel
    console.log('Requesting devices from main process');
    // Get all bluetooth devices
    

    
    ipcRenderer.send('handle-bluetooth-devices', 'Requesting devices from main process');
  },
  startScan: () => ipcRenderer.invoke('start-bluetooth-scan'),
  // Hand Keypoint Data from @mediapipe/hands
  handleHandDataKeypoints: (values, timestep) => ipcRenderer.invoke('handle-hand-data-keypoints', values, timestep),
  // Recordings
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  writeToRecording: (timestep, leftHandData, rightHandData) => ipcRenderer.invoke('write-to-recording', {
    timestep,
    leftHandData,
    rightHandData,
  }),
});