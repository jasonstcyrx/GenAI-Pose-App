/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend for bluetooth
 */

import { app, ipcMain, ipcRenderer } from 'electron';
import { environment } from '../../environments/environment';
import App from '../app';
import * as noble from '@abandonware/noble';

let selectBluetoothCallback;
let bluetoothPinCallback;

export default class BluetoothEvents {
    static bootstrapElectronEvents(): Electron.IpcMain {
        return ipcMain;
    }

    static bootstrapAppEvents(app: App) {
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
        App.mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
            event.preventDefault()

            // Send the devices to the renderer
            App.mainWindow.webContents.send('handle-bluetooth-devices', deviceList);
        
            if (deviceList && deviceList.length > 0) {
                callback(deviceList[0].deviceId)
            } 
        })


    }

    
}

ipcMain.on('handle-bluetooth-devices', (event, devices) => {
    console.log('Handling bluetooth devices...', devices);

    (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['battery_service'] }] })
        .then(device => { /* … */ })
        .catch(error => { console.error(error); });

    // Send the devices to the renderer
    App.mainWindow.webContents.send('handle-bluetooth-devices', devices);
})

ipcMain.handle('start-bluetooth-scan', async () => {
    return new Promise((resolve, reject) => {
      let devices = [];
  
      noble.on('stateChange', state => {
        if (state === 'poweredOn') {
          noble.startScanning([], false); // [] = all services, true = allow duplicates
        } else {
          noble.stopScanning();
          reject('Bluetooth not powered on');
        }
      });
  
      noble.on('discover', peripheral => {
        
        const device = {
            id: peripheral.id,
            address: peripheral.address,
            name: peripheral.advertisement.localName || 'Unknown',
            rssi: peripheral.rssi,
            services: peripheral.advertisement.serviceUuids || [],
            

            // Add any other properties you need
            
        };

        devices.push(device);
        // Optionally, send each device as it's discovered
        // win.webContents.send('device-discovered', device);
      });
  
      // Stop scanning after a certain period
      setTimeout(() => {
        noble.stopScanning();

        // we still have dupes for whatever reason so manually dedupe
        devices = devices.filter((device, index, self) =>
          index === self.findIndex((t) => (
            t.id === device.id
          ))
        );

        resolve(devices);
      }, 3000); // 10 seconds
    });
  });

// Handle App termination
ipcMain.on('quit', (event, code) => {
    app.exit(code);
});

