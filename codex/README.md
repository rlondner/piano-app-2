# Glass Synth Piano

A responsive single-page web synthesizer piano built with vanilla HTML, CSS, and JavaScript, using Tone.js for audio synthesis.

It provides:

- A 5-octave polyphonic piano from `C2` to `B6`
- A glassmorphism interface with a deep gradient background
- Responsive octave viewport rules
- Swipeable octave navigation
- Mouse, touch, and computer keyboard input
- Multiple electric piano / synth-style preset approximations

## Files

- `index.html`: app structure and CDN imports
- `styles.css`: glassmorphism styling, keyboard layout, and responsive rules
- `app.js`: piano rendering, interaction logic, layout handling, and Tone.js audio engine
- `test-ui.mjs`: Puppeteer-based UI verification script
- `package.json`: test dependency and script definition

## How To Run

This is a static app. Serve the folder with a local HTTP server.

Example with Python:

```bash
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

You should run it over `http://localhost` or `http://127.0.0.1`, not directly via `file://`, because browser audio and module loading are more reliable through a local server.

## How To Use

### Play Notes

- Click piano keys with a mouse
- Tap piano keys on touch devices
- Use the computer keyboard shortcuts:
  - `A W S E D F T G Y H U J K`

These map across one octave starting at the currently visible base octave.

### Change Instrument Preset

Use the preset dropdown at the top of the page to switch between:

- Fender Rhodes
- Wurlitzer Electronic Piano
- Yamaha CP-70
- Yamaha CP-80
- Hohner Clavinet
- Hohner Pianet
- Juno 106
- RMI Electra-piano
- Yamaha DX7 organ
- Clavia Nord Stage 4 Grand Piano

### Navigate Octaves

Use the swipeable ribbon above the keys:

- Swipe left to move up by one octave
- Swipe right to move down by one octave
- Use left/right arrow keys while focused on the ribbon
- Use the global keyboard left/right arrows as a shortcut

The viewport is clamped so it cannot move below `C2` or above `B6`.

## Responsive Behavior

The audio engine always supports the full 5-octave range, but the UI only shows a subset at once to keep keys playable:

- Portrait mode on narrow screens: `1 octave`
- Landscape and larger screens: `2 octaves`

This is handled with a combination of:

- CSS sizing rules
- `ResizeObserver`
- JS layout state that updates the keyboard viewport width and offset

The app renders all 5 octaves once, then slides a hidden-overflow viewport across that larger key rail instead of rerendering the piano on every navigation step.

## Testing

Install dependencies:

```bash
npm install
```

Run the UI verification:

```bash
npm run test:ui
```

The Puppeteer test checks:

- the piano renders correctly
- notes can be triggered by clicking
- notes can be triggered by keyboard shortcuts
- desktop shows 2 visible octaves
- tablet shows 2 visible octaves
- mobile portrait shows 1 visible octave
- octave navigation updates the visible range

## Design Choices

### 1. Static Vanilla Stack

I kept the app to plain HTML, CSS, and JS to match the request and keep it easy to run locally without a build tool.

### 2. Glassmorphism UI

The interface uses:

- semi-transparent panels
- blurred backgrounds
- light borders
- soft shadows
- a deep violet-to-blue background gradient

This keeps the app visually modern while preserving enough contrast around controls and keys.

### 3. Full Engine, Constrained Viewport

Instead of rendering only the current octave range, the app renders the complete 5-octave keyboard and shifts the visible viewport horizontally. This keeps note layout, pointer bindings, and octave navigation simpler and more reliable.

### 4. One-Octave Swipe Steps

The ribbon does not free-scroll. It moves one octave per swipe because that matches the requested interaction model and avoids ambiguous partial ranges.

### 5. Tone.js Preset Approximations

The requested instruments are approximated with Tone.js synths and effects, not sample libraries. That means:

- they are lightweight
- they load quickly
- they remain fully browser-based
- they are stylistic approximations, not exact reproductions

The presets use combinations of:

- `PolySynth`
- `Synth`
- `FMSynth`
- `AMSynth`
- `MonoSynth`
- chorus
- tremolo
- filter
- EQ
- reverb
- compression
- distortion

This was the best fit for the requirement to build instrument-like sounds directly in Tone.js.

### 6. Unified Interaction Model

The app supports:

- pointer input for mouse and touch
- polyphonic playback
- keyboard shortcuts
- swipe and arrow-key octave navigation

This makes the app usable on desktop and mobile without separate code paths for each platform.

## Limitations

- The acoustic/electromechanical presets are synth approximations, not sampled instruments
- Mobile browsers may require the first user interaction before audio starts
- The keyboard shortcut mapping covers one octave at a time relative to the current visible range

## Possible Next Improvements

- sustain pedal support
- velocity sensitivity simulation
- visual labels for key names
- ADSR or effects controls
- record / playback
- MIDI input support
- better keyboard-drag glissando behavior
