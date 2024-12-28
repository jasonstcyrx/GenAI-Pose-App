import { Connection } from "./Connection"

// Joint Map - this maps the mediapipe/hands landmarks to the anatomical structure of the hand
export enum JointMap {
    WRIST = 0,
    THUMB_CMC = 1,
    THUMB_MCP = 2,
    THUMB_IP = 3,
    THUMB_TIP = 4,
    INDEX_FINGER_MCP = 5,
    INDEX_FINGER_PIP = 6,
    INDEX_FINGER_DIP = 7,
    INDEX_FINGER_TIP = 8,
    MIDDLE_FINGER_MCP = 9,
    MIDDLE_FINGER_PIP = 10,
    MIDDLE_FINGER_DIP = 11,
    MIDDLE_FINGER_TIP = 12,
    RING_FINGER_MCP = 13,
    RING_FINGER_PIP = 14,
    RING_FINGER_DIP = 15,
    RING_FINGER_TIP = 16,
    LITTLE_FINGER_MCP = 17,
    LITTLE_FINGER_PIP = 18,
    LITTLE_FINGER_DIP = 19,
    LITTLE_FINGER_TIP = 20
}

// This is going to model the anatomical structure of the hand and each of the 21 keypoints joints that the hand landmark model detects.
export type JointPosition = {
    x: number,
    y: number,
    z: number,
    visibility: number
}
export type JointOrientation = {
    quaternion: {
        x: number,
        y: number,
        z: number,
        w: number
    },
    euler_angles: {
        x: number,
        y: number,
        z: number
    }
}

export enum JointType {
    RADIOCARPAL = 'Radiocarpal Joint',
    MIDCARPAL = 'Midcarpal Joint',
    THUMB_CMC = 'Trapezium-Metatarsal Joint (Thumb CMC)',
    INDEX_FINGER_CMC = 'Trapezoid-Metatarsal Joint (Index Finger CMC)',
    MIDDLE_FINGER_CMC = 'Capitate-Metatarsal Joint (Middle Finger CMC)',
    LITTLE_FINGER_CMC = 'Hamate-Metatarsal Joint (Little Finger CMC)',
    RING_FINGER_CMC = 'Lunate-Metatarsal Joint (Ring Finger CMC)',
    THUMB_MCP = 'First Metacarpophalangeal Joint (Thumb MCP)',
    INDEX_FINGER_MCP = 'Second Metacarpophalangeal Joint (Index Finger MCP)',
    MIDDLE_FINGER_MCP = 'Third Metacarpophalangeal Joint (Middle Finger MCP)',
    RING_FINGER_MCP = 'Fourth Metacarpophalangeal Joint (Ring Finger MCP)',
    LITTLE_FINGER_MCP = 'Fifth Metacarpophalangeal Joint (Little Finger MCP)',
    INDEX_FINGER_PIP = 'Proximal Interphalangeal Joint of the Index Finger',
    INDEX_FINGER_DIP = 'Distal Interphalangeal Joint of the Index Finger',
    MIDDLE_FINGER_PIP = 'Proximal Interphalangeal Joint of the Middle Finger',
    MIDDLE_FINGER_DIP = 'Distal Interphalangeal Joint of the Middle Finger',
    RING_FINGER_PIP = 'Proximal Interphalangeal Joint of the Ring Finger',
    RING_FINGER_DIP = 'Distal Interphalangeal Joint of the Ring Finger',
    LITTLE_FINGER_PIP = 'Proximal Interphalangeal Joint of the Little Finger',
    LITTLE_FINGER_DIP = 'Distal Interphalangeal Joint of the Little Finger',
    THUMB_IP = 'Interphalangeal Joint of the Thumb',
    THUMB_TIP = 'Tip of the Thumb',
    INDEX_FINGER_TIP = 'Tip of the Index Finger',
    MIDDLE_FINGER_TIP = 'Tip of the Middle Finger',
    RING_FINGER_TIP = 'Tip of the Ring Finger',
    LITTLE_FINGER_TIP = 'Tip of the Little Finger'
    
}

export type Joint = {
    type: 'palm' | 'wrist' | 'finger',
    joint_type: JointType,
    // The position of the joint in 3D space
    position: JointPosition,
    // The confidence of the model in detecting the joint
    confidence: number,
    // The orientation of the joint - the rotation of the joint in 3D space and the euler angles
    orientation: JointOrientation,
    // The annotations of the joint
    annotations: {
        // The index of the joint in the array of landmarks
        index: JointMap,
        connection: Connection
    },
    // The visibility of the joint
    is_visible: boolean,

    // The angles of the joint - these need to be calculated and may not be all 
    flexion: number, // bending 
    extension: number, // straightening
    abduction: number, // moving away from thesbody
    adduction: number, // moving towards the body,
    angle_degrees?: number
}


export type Thumb = {
    CMC: Joint, // Carpometacarpal Joint
    MCP: Joint, // Metacarpophalangeal Joint
    IP: Joint, // Interphalangeal Joint
    TIP: Joint // Tip of the thumb
}

export type Finger = { //
    MCP: Joint, // Metacarpophalangeal Joint
    PIP: Joint, // Proximal Interphalangeal Joint
    DIP: Joint, // Distal Interphalangeal Joint
    TIP: Joint // Tip of the finger
}

export type Fingers = {
    index: Finger,
    middle: Finger,
    ring: Finger,
    pinky: Finger,
    thumb: Thumb
}

/**
 * Calculates the angle at point B formed by three points A, B, and C in 3D space.
 * The angle is between vectors AB and CB.
 * 
 * @param a - Joint position A
 * @param b - Joint position B (vertex of the angle)
 * @param c - Joint position C
 * @returns The angle at point B in radians
 * @throws Will throw an error if either vector AB or CB has zero length
 */
export function angleAtPointB(a: JointPosition, b: JointPosition, c: JointPosition): number {
    // Vectors AB and CB
    const ab = {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };

    const cb = {
        x: c.x - b.x,
        y: c.y - b.y,
        z: c.z - b.z
    };

    // Dot product of AB and CB
    const dotProduct = (ab.x * cb.x) + (ab.y * cb.y) + (ab.z * cb.z);

    // Magnitudes of AB and CB
    const magnitudeAB = Math.sqrt(ab.x ** 2 + ab.y ** 2 + ab.z ** 2);
    const magnitudeCB = Math.sqrt(cb.x ** 2 + cb.y ** 2 + cb.z ** 2);

    // Error handling for zero-length vectors
    if (magnitudeAB === 0 || magnitudeCB === 0) {
        throw new Error("One of the vectors AB or CB has zero length.");
    }

    // Compute cosine of the angle using dot product formula
    let cosTheta = dotProduct / (magnitudeAB * magnitudeCB);

    // Clamp cosine to the valid range [-1, 1] to prevent NaN from Math.acos
    cosTheta = Math.max(-1, Math.min(1, cosTheta));

    // Calculate and return the angle in degreeds
    return Math.acos(cosTheta) * (180 / Math.PI);
}

// define all the joints that we are going to use
// Starting from the thumb and going to the pinky
// Wew are going to define the three points from the model that we are going to use to calculate the angles
// 1st point is the first point in the line 
// 2nd point is the second point in the line or the angle point 
// 3rd point is the third point in the line
// Thumb
const thumbCMC = [JointMap.WRIST, JointMap.THUMB_CMC, JointMap.THUMB_MCP];
const thumbMCP = [JointMap.THUMB_CMC, JointMap.THUMB_MCP, JointMap.THUMB_IP];
const thumbIP = [JointMap.THUMB_MCP, JointMap.THUMB_IP, JointMap.THUMB_TIP];
const wrist = [JointMap.WRIST, JointMap.THUMB_CMC, JointMap.INDEX_FINGER_MCP];
// Index Finger
const indexFingerMCP = [JointMap.WRIST, JointMap.INDEX_FINGER_MCP, JointMap.INDEX_FINGER_PIP];
const indexFingerPIP = [JointMap.INDEX_FINGER_MCP, JointMap.INDEX_FINGER_PIP, JointMap.INDEX_FINGER_DIP];
const indexFingerDIP = [JointMap.INDEX_FINGER_PIP, JointMap.INDEX_FINGER_DIP, JointMap.INDEX_FINGER_TIP];
// Middle Finger
const middleFingerMCP = [JointMap.WRIST, JointMap.MIDDLE_FINGER_MCP, JointMap.MIDDLE_FINGER_PIP];
const middleFingerPIP = [JointMap.MIDDLE_FINGER_MCP, JointMap.MIDDLE_FINGER_PIP, JointMap.MIDDLE_FINGER_DIP];
const middleFingerDIP = [JointMap.MIDDLE_FINGER_PIP, JointMap.MIDDLE_FINGER_DIP, JointMap.MIDDLE_FINGER_TIP];
// Ring Finger
const ringFingerMCP = [JointMap.WRIST, JointMap.RING_FINGER_MCP, JointMap.RING_FINGER_PIP];
const ringFingerPIP = [JointMap.RING_FINGER_MCP, JointMap.RING_FINGER_PIP, JointMap.RING_FINGER_DIP];
const ringFingerDIP = [JointMap.RING_FINGER_PIP, JointMap.RING_FINGER_DIP, JointMap.RING_FINGER_TIP];
// Little Finger
const littleFingerMCP = [JointMap.WRIST, JointMap.LITTLE_FINGER_MCP, JointMap.LITTLE_FINGER_PIP];
const littleFingerPIP = [JointMap.LITTLE_FINGER_MCP, JointMap.LITTLE_FINGER_PIP, JointMap.LITTLE_FINGER_DIP];
const littleFingerDIP = [JointMap.LITTLE_FINGER_PIP, JointMap.LITTLE_FINGER_DIP, JointMap.LITTLE_FINGER_TIP];

export const joint_vectors = {
    wrist,
    thumb: {
        CMC: thumbCMC,
        MCP: thumbMCP,
        IP: thumbIP,
        
    },
    index: {
        MCP: indexFingerMCP,
        PIP: indexFingerPIP,
        DIP: indexFingerDIP
    },
    middle: {
        MCP: middleFingerMCP,
        PIP: middleFingerPIP,
        DIP: middleFingerDIP
    },
    ring: {
        MCP: ringFingerMCP,
        PIP: ringFingerPIP,
        DIP: ringFingerDIP
    },
    little: {
        MCP: littleFingerMCP,
        PIP: littleFingerPIP,
        DIP: littleFingerDIP
    }
}