import { ipcMain } from "electron";
const fs = require('fs');
const path = require('path');
const os = require('os');
// When we start recording we want to create a temp csv file to store the data

export default class RecordingEvents {
    public static tempFolder = path.join(os.homedir(), '.chaitemp');
    public static downloadsFolder = path.join(os.homedir(), 'Downloads');

    static bootstrapRecordingEvents(): Electron.IpcMain {

        // When we start recording we want to create a temp csv file to store the data
        ipcMain.handle('start-recording', async (event, args) => {
            console.log('Recording started');
            
            try {
                // Ensure the temp folder exists; create it if it doesn't
                if (!fs.existsSync(RecordingEvents.tempFolder)) {
                    fs.mkdirSync(RecordingEvents.tempFolder, { recursive: true });
                    console.log(`Created directory: ${RecordingEvents.tempFolder}`);
                }

                const tempFilePath = path.join(RecordingEvents.tempFolder, 'temp.csv');

                // Initialize the CSV file with headers
                fs.writeFileSync(tempFilePath, 'timestep|leftHandData|rightHandData\n');
                console.log(`Created temp file: ${tempFilePath}`);

                return { success: true, message: 'Recording started' };
            } catch (error) {
                console.error('Error starting recording:', error);
                return { success: false, message: 'Failed to start recording', error: error.message };
            }
        });

        // When we stop recording we want to close the file
        ipcMain.handle('stop-recording', async (event, args) => {
            console.log('Recording stopped');
            try {
                const tempFilePath = path.join(RecordingEvents.tempFolder, 'temp.csv');
                const downloadFilePath = path.join(RecordingEvents.downloadsFolder, `recording-${Date.now()}.csv`);

                // Move the temp file; to the downloads folder
                fs.renameSync(tempFilePath, downloadFilePath);
                console.log(`Moved temp file to: ${downloadFilePath}`);

                return { success: true, message: 'Recording stopped' };
            } catch (error) {
                console.error('Error stopping recording:', error);
                return { success: false, message: 'Failed to stop recording', error: error.message };
            }
        });

        ipcMain.handle('write-to-recording', async (event, args: {
            timestep: number,
            leftHandData: string,
            rightHandData: string
        }) => {
            
            console.log('Writing to recording', args)
            // Append the data to the file
            fs.appendFileSync(`${RecordingEvents.tempFolder}/temp.csv`, `${args.timestep},${args.leftHandData},${args.rightHandData}\n`);
            return 'Writing to recording';
        });
        

        return ipcMain;
    }
}

