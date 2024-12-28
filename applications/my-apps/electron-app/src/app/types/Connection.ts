export type Connection = {
    startIndex: number,
    endIndex: number
}

export const connections: Connection[] = [
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