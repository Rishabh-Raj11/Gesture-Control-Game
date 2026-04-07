# Space Dodger: Gesture-Control Web Game

A real-time gesture-controlled browser game using the webcam, MediaPipe Hands, and HTML5 Canvas.

## Features
- **Touchless Interaction:** Control the game purely with hand gestures. 
    - ✋ **Open Palm:** Activate Force Shield
    - ✊ **Fist:** Fire Plasma Cannons
    - ✌️ **Two Fingers:** Equip Spread Shot
- **Zero Hardware Dependencies:** Runs entirely in the browser using pre-trained MediaPipe neural networks via CDN.
- **Sub-100ms Latency:** Highly optimized tracking logic rendering at native 60fps.
- **Cinematic Aesthetic:** Modern Cyberpunk visuals, procedural glowing asteroids, particle shockwaves, and parallax starfields.
- **Adaptive Adjustments:** Adjustable tracking sensitivity for varying physical setups.

## How to Play
1. Clone this repository.
2. Open the directory and serve it over a local static web server (e.g., `npx http-server`).
3. Open `index.html` in your browser.
4. Allow webcam access when prompted.
5. Hold up an **Open Palm** to jump seamlessly from the animated menu into the combat zone!

## Tech Stack
- Vanilla HTML5 / CSS3 / JavaScript
- [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) via CDN
