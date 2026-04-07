class GestureRecognizer {
    constructor() {
        this.gesture = "NONE";
        this.handX = 0.5;
        this.handY = 0.5;
    }

    update(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.gesture = "NONE";
            return;
        }

        const landmarks = results.multiHandLandmarks[0];
        
        // Center position based on middle finger MCP (landmark 9)
        // Hand coordinates are mirrored 1 - X because video is flipped horizontally in view
        this.handX = 1 - landmarks[9].x; 
        this.handY = landmarks[9].y;

        const fingersOpen = [false, false, false, false, false];

        const wrist = landmarks[0];
        const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        // Simple heuristic: if distance from wrist to tip is greater than wrist to PIP, finger is open.
        // Works well and is relatively invariant to hand orientation.
        fingersOpen[0] = dist(wrist, landmarks[4]) > dist(wrist, landmarks[3]);
        fingersOpen[1] = dist(wrist, landmarks[8]) > dist(wrist, landmarks[6]);
        fingersOpen[2] = dist(wrist, landmarks[12]) > dist(wrist, landmarks[10]);
        fingersOpen[3] = dist(wrist, landmarks[16]) > dist(wrist, landmarks[14]);
        fingersOpen[4] = dist(wrist, landmarks[20]) > dist(wrist, landmarks[18]);

        const openCount = fingersOpen.reduce((a, b) => a + (b ? 1 : 0), 0);

        if (openCount >= 4) {
            this.gesture = "OPEN_PALM";
        } else if (openCount === 0) {
            this.gesture = "FIST";
        } else if (openCount === 1 && fingersOpen[1]) {
            this.gesture = "1_FINGER";
        } else if (openCount === 2 && fingersOpen[1] && fingersOpen[2]) {
            this.gesture = "2_FINGERS";
        } else {
            // Count based fallback for other configurations
            if (openCount === 3) this.gesture = "3_FINGERS";
            else this.gesture = "UNKNOWN";
        }
    }
}
