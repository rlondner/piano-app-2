# 5-Octave Glassmorphism Web Piano

A browser-based piano synthesizer with 10 instrument presets, glassmorphism UI, keyboard/touch input, octave navigation, and WAV recording.

## Quick Start

1. Open `index.html` in a modern browser (Chrome/Edge recommended)
2. Click the overlay to enable audio
3. Play using mouse/touch or switch to keyboard mode (A-J for white keys, W/E/T/Y/U for black keys)

## Features

- **10 Instrument Presets**: Fender Rhodes, Wurlitzer, Yamaha CP-70/CP-80, Hohner Clavinet/Pianet, Juno 106, RMI Electra-piano, DX7 Organ, Nord Stage 4 Grand
- **5 Octaves** (C2–B6) with swipeable octave ribbon navigation
- **Visual Feedback**: Color glow or key depress modes
- **Input Modes**: Mouse/touch or QWERTY keyboard
- **WAV Recording**: Record and download performances as 16-bit PCM WAV files
- **Responsive**: Desktop (2 octaves visible), mobile (1 octave visible)

## Keyboard Mapping (Keyboard Mode)

| Key | Note |
|-----|------|
| A   | C    |
| W   | C#   |
| S   | D    |
| E   | D#   |
| D   | E    |
| F   | F    |
| T   | F#   |
| G   | G    |
| Y   | G#   |
| H   | A    |
| U   | A#   |
| J   | B    |
| ← → | Navigate octaves |

## Running Tests

```bash
npm install
npm test
```

Tests run Puppeteer across three viewports (desktop 1280×800, tablet 768×1024, mobile 375×667) and generate screenshots.
