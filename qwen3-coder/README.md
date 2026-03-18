# Glassmorphism Synthesizer Piano

A 5-octave polyphonic web synthesizer piano with a modern glassmorphism UI.

## Features

- **5 Octaves**: Full range from C3 to B7
- **Glassmorphism UI**: Modern, sleek design with semi-transparent containers and blur effects
- **Responsive Layout**:
  - Mobile portrait: 1 octave visible
  - Desktop landscape: 2 octaves visible
- **Multiple Instrument Presets**: Fender Rhodes, Wurlitzer, CP-70, CP-80, Clavinet, Pianet, Juno 106, DX7, Nord Stage
- **Audio Effects**: Reverb and delay with wet/dry controls
- **Keyboard Mapping**: QWERTY keyboard support for playing
- **Swipe Navigation**: Touch and mouse drag to navigate octaves

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

This will start the server and open the app in your browser.

## Testing

```bash
npm test
```

## File Structure

```
index.html          # Main HTML structure
styles.css          # Glassmorphism styling
script.js           # Audio engine, UI logic, event handling
test/
  puppeteer.test.js # Puppeteer test suite
package.json        # Dependencies
```

## Controls

- **Computer Keyboard**: Play notes using Z/X/C/V/B... for white keys and S/D/G/H... for black keys
- **Octave Navigation**: Use arrow keys or swipe the ribbon to change visible octave range
- **Instrument**: Select from dropdown at top
- **Volume**: Adjust master volume slider
- **Effects**: Control reverb and delay wet/dry mix
