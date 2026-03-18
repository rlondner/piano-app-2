# Glass Synth: 5-Octave Glassmorphic Piano

A responsive, single-page web application featuring a polyphonic synthesizer piano with a modern glassmorphism aesthetic.

## 🎹 Features

- **5-Octave Range:** Supports a full range from C2 to C7 (61 keys).
- **Glassmorphism UI:** High-fidelity aesthetic using `backdrop-filter`, semi-transparent layers, and vibrant gradients.
- **Responsive Layout:**
  - **Desktop/Tablet (Landscape):** Displays **2 octaves** (14 white keys) for better playability.
  - **Mobile (Portrait):** Displays **1 octave** (7 white keys) to ensure keys remain touch-friendly.
- **10 Instrument Presets:** Authentic approximations of classic keyboards (Fender Rhodes, Wurlitzer, DX7, etc.) powered by Tone.js.
- **Octave Navigation:** A stylish, swipeable ribbon with "snapping" logic to quickly shift between ranges.
- **Automated Verification:** Includes a Puppeteer test suite to ensure consistent behavior across different viewports.

## 🛠️ Technical Choices

### Audio Engine (Tone.js)
- **Synthesis over Samples:** To keep the application lightweight and instant-loading, I chose to use `Tone.PolySynth` with FM, AM, and subtractive synthesis. This allows for a wide variety of "vintage" sounds without the overhead of large multi-sample libraries.
- **Polyphony:** The engine supports high polyphony, allowing for complex chords and sustain.
- **Effects Chain:** Each instrument is routed through a global reverb and specific filter/envelope settings to simulate the unique character of different mechanical and electronic pianos.

### UI & UX
- **Vanilla Foundation:** Built using pure HTML, CSS, and JavaScript for maximum performance and compatibility.
- **CSS Variable-Driven Layout:** Key widths and positioning for black keys are calculated using CSS variables and `calc()`. This ensures the layout is perfectly fluid when resizing or rotating devices.
- **Navigation Snapping:** The "Swipeable Ribbon" uses a calculation-based transform shift. Instead of free-scrolling, it "snaps" to the nearest octave to ensure the user always has a clear musical range visible.

### Performance
- **Dynamic Key Generation:** Keys are generated via JavaScript. This reduces HTML bloat and allows for easy expansion of the note range or keyboard mapping in the future.
- **Hardware Acceleration:** All transitions and transforms use GPU-accelerated CSS properties (`transform`, `opacity`) for 60fps animations.

## 🚀 Getting Started

### Local Setup
1. Clone the repository or download the files.
2. Open `index.html` in any modern web browser.
3. **Important:** Due to browser security policies regarding Web Audio, you must click the "Start Overlay" to enable audio output.

### Running a Local Server (Recommended)
To avoid potential cross-origin or local file restrictions, run a small server:
```bash
npx http-server .
```

### Running Tests
The project includes a Puppeteer-based test suite that verifies the responsive design and audio engine status.
```bash
npm install puppeteer
node test-piano.js
```

## 🎹 Instrument List
- Fender Rhodes (Sine/Tine)
- Wurlitzer Electronic Piano (Reed)
- Yamaha CP-70 & CP-80 (Electric Grand)
- Hohner Clavinet & Pianet
- Juno 106 (PWM Pad)
- RMI Electra-piano
- Yamaha DX7 Organ (FM)
- Clavia Nord Stage 4 Grand (Hybrid)

---
*Created with ❤️ using Tone.js and Vanilla JS.*
