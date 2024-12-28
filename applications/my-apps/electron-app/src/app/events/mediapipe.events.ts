import { ipcMain, ipcRenderer } from "electron";
import App from '../app';
import { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Connection, connections } from '../types/Connection';
import { Joint, Fingers, JointType, JointMap, angleAtPointB } from "../types/Joint";
import RecordingEvents from "./recording.events";
const fs = require('fs');

type Hand = {
    palm?: Joint,
    wrist?: Joint,
    fingers?: Fingers
}

export default class MediaPipeEvents {
    static bootstrapMediaPipeEvents(): Electron.IpcMain {
        // interface Bluetooth
        ipcMain.handle('handle-hand-data-keypoints', (event, data: HandLandmarkerResult, timestep) => {
            
            if(!data.landmarks) {
                return [];
            }

            // we need to convert the data to the format that we want. 
            // Then we want to calculate the various angles between the joints of the hand.
            // We can then send this data to the renderer process.

            // Refer to the Connection array above to understand the connections between the joints.

            // Create a new object to store the hand data


            // Get the landmarks
            const leftHand = data.landmarks[0];
            const rightHand = data.landmarks[1];
            const leftHandJoint: Hand = MediaPipeEvents.formatHandData(leftHand);
            const rightHandJoint: Hand = MediaPipeEvents.formatHandData(rightHand);

            // Get the connections
            const handConnections: Connection[] = connections;


            // we are going to get a timestep value from the renderer process and we need to store it in a csv as a row with the hand data.
            // columns: timestamp, left hand data, right hand data

            // then we will save it to a csv file.

            // console.log('Left Hand:', leftHandJoint);
            // console.log('Right Hand:', rightHandJoint);
           
            try { 
                const commaEscapedLeftForCSV = JSON.stringify(leftHandJoint).replace(/,/g, '|');
                const commaEscapedRightForCSV = JSON.stringify(rightHandJoint).replace(/,/g, '|');

                fs.appendFileSync(`${RecordingEvents.tempFolder}/temp.csv`, `${timestep},${commaEscapedLeftForCSV},${commaEscapedRightForCSV}\n`);
            } catch (err) {
                console.error('Error writing to file:', err);
            }
            
            return [leftHandJoint, rightHandJoint, handConnections];
        })

        

        return ipcMain;
    }

    static formatHandData(handData: NormalizedLandmark[]): Hand {
        if(!handData || handData.length === 0) {
            return null;
        }

        


        const hand: Hand = {
            palm: null,
            wrist: {
                type: 'wrist',
                joint_type: JointType.RADIOCARPAL,
                position: {
                    x: handData[JointMap.WRIST].x,
                    y: handData[JointMap.WRIST].y,
                    z: handData[JointMap.WRIST].z,
                    visibility: handData[JointMap.WRIST].visibility
                },
                confidence: handData[JointMap.WRIST].visibility,
                orientation: null,
                annotations: {
                    index: JointMap.WRIST,
                    connection: null
                },
                is_visible: false,
                flexion: 0,
                extension: 0,
                abduction: 0,
                adduction: 0
            },
            fingers: {
                thumb: {
                    CMC: {
                        type: 'finger',
                        joint_type: JointType.THUMB_CMC,
                        position: {
                            x: handData[JointMap.THUMB_CMC].x,
                            y: handData[JointMap.THUMB_CMC].y,
                            z: handData[JointMap.THUMB_CMC].z,
                            visibility: handData[JointMap.THUMB_CMC].visibility
                        },
                        confidence: handData[JointMap.THUMB_CMC].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.THUMB_CMC,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0, 
                        angle_degrees: angleAtPointB(handData[JointMap.WRIST], handData[JointMap.THUMB_CMC], handData[JointMap.THUMB_MCP])
                    },
                    MCP: {
                        type: 'finger',
                        joint_type: JointType.THUMB_MCP,
                        position: {
                            x: handData[JointMap.THUMB_MCP].x,
                            y: handData[JointMap.THUMB_MCP].y,
                            z: handData[JointMap.THUMB_MCP].z,
                            visibility: handData[JointMap.THUMB_MCP].visibility
                        },
                        confidence: handData[JointMap.THUMB_MCP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.THUMB_MCP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0,
                        angle_degrees: angleAtPointB(handData[JointMap.THUMB_CMC], handData[JointMap.THUMB_MCP], handData[JointMap.THUMB_IP])
                    },
                    IP: {
                        type: 'finger',
                        joint_type: JointType.THUMB_IP,
                        position: {
                            x: handData[JointMap.THUMB_IP].x,
                            y: handData[JointMap.THUMB_IP].y,
                            z: handData[JointMap.THUMB_IP].z,
                            visibility: handData[JointMap.THUMB_IP].visibility
                        },
                        confidence: handData[JointMap.THUMB_IP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.THUMB_IP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0,
                        angle_degrees: angleAtPointB(handData[JointMap.THUMB_MCP], handData[JointMap.THUMB_IP], handData[JointMap.THUMB_TIP])
                    },
                    TIP: {
                        type: 'finger',
                        joint_type: JointType.THUMB_TIP,
                        position: {
                            x: handData[JointMap.THUMB_TIP].x,
                            y: handData[JointMap.THUMB_TIP].y,
                            z: handData[JointMap.THUMB_TIP].z,
                            visibility: handData[JointMap.THUMB_TIP].visibility
                        },
                        confidence: handData[JointMap.THUMB_TIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.THUMB_TIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    }

                },
                index:{
                    MCP: {
                        type: 'finger',
                        joint_type: JointType.INDEX_FINGER_MCP,
                        position: {
                            x: handData[JointMap.INDEX_FINGER_MCP].x,
                            y: handData[JointMap.INDEX_FINGER_MCP].y,
                            z: handData[JointMap.INDEX_FINGER_MCP].z,
                            visibility: handData[JointMap.INDEX_FINGER_MCP].visibility
                        },
                        confidence: handData[JointMap.INDEX_FINGER_MCP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.INDEX_FINGER_MCP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    PIP: {
                        type: 'finger',
                        joint_type: JointType.INDEX_FINGER_PIP,
                        position: {
                            x: handData[JointMap.INDEX_FINGER_PIP].x,
                            y: handData[JointMap.INDEX_FINGER_PIP].y,
                            z: handData[JointMap.INDEX_FINGER_PIP].z,
                            visibility: handData[JointMap.INDEX_FINGER_PIP].visibility
                        },
                        confidence: handData[JointMap.INDEX_FINGER_PIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.INDEX_FINGER_PIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    DIP: {
                        type: 'finger',
                        joint_type: JointType.INDEX_FINGER_DIP,
                        position: {
                            x: handData[JointMap.INDEX_FINGER_DIP].x,
                            y: handData[JointMap.INDEX_FINGER_DIP].y,
                            z: handData[JointMap.INDEX_FINGER_DIP].z,
                            visibility: handData[JointMap.INDEX_FINGER_DIP].visibility
                        },
                        confidence: handData[JointMap.INDEX_FINGER_DIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.INDEX_FINGER_DIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    TIP: {
                        type: 'finger',
                        joint_type: JointType.INDEX_FINGER_TIP,
                        position: {
                            x: handData[JointMap.INDEX_FINGER_TIP].x,
                            y: handData[JointMap.INDEX_FINGER_TIP].y,
                            z: handData[JointMap.INDEX_FINGER_TIP].z,
                            visibility: handData[JointMap.INDEX_FINGER_TIP].visibility
                        },
                        confidence: handData[JointMap.INDEX_FINGER_TIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.INDEX_FINGER_TIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    }
                },
                middle:{
                    MCP: {
                        type: 'finger',
                        joint_type: JointType.MIDDLE_FINGER_MCP,
                        position: {
                            x: handData[JointMap.MIDDLE_FINGER_MCP].x,
                            y: handData[JointMap.MIDDLE_FINGER_MCP].y,
                            z: handData[JointMap.MIDDLE_FINGER_MCP].z,
                            visibility: handData[JointMap.MIDDLE_FINGER_MCP].visibility
                        },
                        confidence: handData[JointMap.MIDDLE_FINGER_MCP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.MIDDLE_FINGER_MCP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    PIP: {
                        type: 'finger',
                        joint_type: JointType.MIDDLE_FINGER_PIP,
                        position: {
                            x: handData[JointMap.MIDDLE_FINGER_PIP].x,
                            y: handData[JointMap.MIDDLE_FINGER_PIP].y,
                            z: handData[JointMap.MIDDLE_FINGER_PIP].z,
                            visibility: handData[JointMap.MIDDLE_FINGER_PIP].visibility
                        },
                        confidence: handData[JointMap.MIDDLE_FINGER_PIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.MIDDLE_FINGER_PIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    DIP: {
                        type: 'finger',
                        joint_type: JointType.MIDDLE_FINGER_DIP,
                        position: {
                            x: handData[JointMap.MIDDLE_FINGER_DIP].x,
                            y: handData[JointMap.MIDDLE_FINGER_DIP].y,
                            z: handData[JointMap.MIDDLE_FINGER_DIP].z,
                            visibility: handData[JointMap.MIDDLE_FINGER_DIP].visibility
                        },
                        confidence: handData[JointMap.MIDDLE_FINGER_DIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.MIDDLE_FINGER_DIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    TIP: {
                        type: 'finger',
                        joint_type: JointType.MIDDLE_FINGER_TIP,
                        position: {
                            x: handData[JointMap.MIDDLE_FINGER_TIP].x,
                            y: handData[JointMap.MIDDLE_FINGER_TIP].y,
                            z: handData[JointMap.MIDDLE_FINGER_TIP].z,
                            visibility: handData[JointMap.MIDDLE_FINGER_TIP].visibility
                        },
                        confidence: handData[JointMap.MIDDLE_FINGER_TIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.MIDDLE_FINGER_TIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    }
                },
                ring:{
                    MCP: {
                        type: 'finger',
                        joint_type: JointType.RING_FINGER_MCP,
                        position: {
                            x: handData[JointMap.RING_FINGER_MCP].x,
                            y: handData[JointMap.RING_FINGER_MCP].y,
                            z: handData[JointMap.RING_FINGER_MCP].z,
                            visibility: handData[JointMap.RING_FINGER_MCP].visibility
                        },
                        confidence: handData[JointMap.RING_FINGER_MCP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.RING_FINGER_MCP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    PIP: {
                        type: 'finger',
                        joint_type: JointType.RING_FINGER_PIP,
                        position: {
                            x: handData[JointMap.RING_FINGER_PIP].x,
                            y: handData[JointMap.RING_FINGER_PIP].y,
                            z: handData[JointMap.RING_FINGER_PIP].z,
                            visibility: handData[JointMap.RING_FINGER_PIP].visibility
                        },
                        confidence: handData[JointMap.RING_FINGER_PIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.RING_FINGER_PIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    DIP: {
                        type: 'finger',
                        joint_type: JointType.RING_FINGER_DIP,
                        position: {
                            x: handData[JointMap.RING_FINGER_DIP].x,
                            y: handData[JointMap.RING_FINGER_DIP].y,
                            z: handData[JointMap.RING_FINGER_DIP].z,
                            visibility: handData[JointMap.RING_FINGER_DIP].visibility
                        },
                        confidence: handData[JointMap.RING_FINGER_DIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.RING_FINGER_DIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    TIP: {
                        type: 'finger',
                        joint_type: JointType.RING_FINGER_TIP,
                        position: {
                            x: handData[JointMap.RING_FINGER_TIP].x,
                            y: handData[JointMap.RING_FINGER_TIP].y,
                            z: handData[JointMap.RING_FINGER_TIP].z,
                            visibility: handData[JointMap.RING_FINGER_TIP].visibility
                        },
                        confidence: handData[JointMap.RING_FINGER_TIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.RING_FINGER_TIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    }
                },
                pinky:{
                    MCP: {
                        type: 'finger',
                        joint_type: JointType.LITTLE_FINGER_MCP,
                        position: {
                            x: handData[JointMap.LITTLE_FINGER_MCP].x,
                            y: handData[JointMap.LITTLE_FINGER_MCP].y,
                            z: handData[JointMap.LITTLE_FINGER_MCP].z,
                            visibility: handData[JointMap.LITTLE_FINGER_MCP].visibility
                        },
                        confidence: handData[JointMap.LITTLE_FINGER_MCP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.LITTLE_FINGER_MCP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    PIP: {
                        type: 'finger',
                        joint_type: JointType.LITTLE_FINGER_PIP,
                        position: {
                            x: handData[JointMap.LITTLE_FINGER_PIP].x,
                            y: handData[JointMap.LITTLE_FINGER_PIP].y,
                            z: handData[JointMap.LITTLE_FINGER_PIP].z,
                            visibility: handData[JointMap.LITTLE_FINGER_PIP].visibility
                        },
                        confidence: handData[JointMap.LITTLE_FINGER_PIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.LITTLE_FINGER_PIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    DIP: {
                        type: 'finger',
                        joint_type: JointType.LITTLE_FINGER_DIP,
                        position: {
                            x: handData[JointMap.LITTLE_FINGER_DIP].x,
                            y: handData[JointMap.LITTLE_FINGER_DIP].y,
                            z: handData[JointMap.LITTLE_FINGER_DIP].z,
                            visibility: handData[JointMap.LITTLE_FINGER_DIP].visibility
                        },
                        confidence: handData[JointMap.LITTLE_FINGER_DIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.LITTLE_FINGER_DIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    },
                    TIP: {
                        type: 'finger',
                        joint_type: JointType.LITTLE_FINGER_TIP,
                        position: {
                            x: handData[JointMap.LITTLE_FINGER_TIP].x,
                            y: handData[JointMap.LITTLE_FINGER_TIP].y,
                            z: handData[JointMap.LITTLE_FINGER_TIP].z,
                            visibility: handData[JointMap.LITTLE_FINGER_TIP].visibility
                        },
                        confidence: handData[JointMap.LITTLE_FINGER_TIP].visibility,
                        orientation: null,
                        annotations: {
                            index: JointMap.LITTLE_FINGER_TIP,
                            connection: null
                        },
                        is_visible: false,
                        flexion: 0,
                        extension: 0,
                        abduction: 0,
                        adduction: 0
                    }
                }
            }
        }

        // lets test calc one of the angles angleBetweenTwoVectors(a, b)

        // const res = angleAtPointB(hand.fingers.index.MCP.position, hand.fingers.index.PIP.position, hand.fingers.index.DIP.position) * (180 / Math.PI);
        

        // console.log('Angle at PIP:', res);
        return hand;
    }

    static bootstrapAppEvents(app: App) {

    }
}