window.gestureRecognizer = new GestureRecognizer();
const game = new Game('game_canvas');

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const gestureStatus = document.getElementById('gesture_status');

function onResults(results) {
    if (game.state === 'LOADING') {
        game.setState('MENU');
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        window.gestureRecognizer.update(results);
        gestureStatus.innerText = "Gesture: " + window.gestureRecognizer.gesture;

        // Pass gestures directly into the game loop's State Machine
        game.handleGesture(window.gestureRecognizer.gesture);

        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
        }
    } else {
        gestureStatus.innerText = "No Hand Detected";
        window.gestureRecognizer.gesture = "NONE";
    }
    canvasCtx.restore();
}

/**
 * Configure MediaPipe hands model
 */
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1, 
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});
hands.onResults(onResults);

/**
 * Stream Webcam
 */
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start().catch((err) => {
    document.getElementById('loading_status').innerHTML = "<h2>Error accessing Camera!</h2><p>Please allow permissions in your browser.</p>";
    console.error("Camera Error:", err);
});
