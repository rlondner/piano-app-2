/**
 * Glassmorphism Synthesizer Piano
 * Audio Engine, UI Logic, and Event Handling
 */

// Note constants
const NOTE_NUMBERS = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

// Octave ranges for navigation (C3 to B7 = 5 octaves)
const MIN_OCTAVE = 3;
const MAX_OCTAVE = 7;
const OCTAVES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Current state
let currentOctaveStart = 3; // Starting octave (C3)
let currentOctaveEnd = 3;   // End octave in view
let visibleOctaves = 1;     // Number of visible octaves based on screen size

// Audio engine state
let synth = null;
let masterVolume = null;
let reverb = null;
let delay = null;
let currentInstrument = 'rhodes';
let isAudioStarted = false;
// Expose to window for testing
window.isAudioStarted = isAudioStarted;

// Keyboard mapping for computer keyboard
const KEYBOARD_MAP = {
    // White keys (bottom row)
    'z': { note: 'C', octave: 3 },
    'x': { note: 'D', octave: 3 },
    'c': { note: 'E', octave: 3 },
    'v': { note: 'F', octave: 3 },
    'b': { note: 'G', octave: 3 },
    'n': { note: 'A', octave: 3 },
    'm': { note: 'B', octave: 3 },
    ',': { note: 'C', octave: 4 },
    '.': { note: 'D', octave: 4 },
    '/': { note: 'E', octave: 4 },

    // Black keys (bottom row)
    's': { note: 'C#', octave: 3 },
    'd': { note: 'D#', octave: 3 },
    'g': { note: 'F#', octave: 3 },
    'h': { note: 'G#', octave: 3 },
    'j': { note: 'A#', octave: 3 },

    // White keys (middle row)
    'q': { note: 'C', octave: 4 },
    'w': { note: 'D', octave: 4 },
    'e': { note: 'E', octave: 4 },
    'r': { note: 'F', octave: 4 },
    't': { note: 'G', octave: 4 },
    'y': { note: 'A', octave: 4 },
    'u': { note: 'B', octave: 4 },
    'i': { note: 'C', octave: 5 },
    'o': { note: 'D', octave: 5 },
    'p': { note: 'E', octave: 5 },

    // Black keys (middle row)
    '2': { note: 'C#', octave: 4 },
    '3': { note: 'D#', octave: 4 },
    '5': { note: 'F#', octave: 4 },
    '6': { note: 'G#', octave: 4 },
    '7': { note: 'A#', octave: 4 },
    '9': { note: 'C#', octave: 5 },
    '0': { note: 'D#', octave: 5 },

    // White keys (top row)
    'Z': { note: 'C', octave: 5 },
    'X': { note: 'D', octave: 5 },
    'C': { note: 'E', octave: 5 },
    'V': { note: 'F', octave: 5 },
    'B': { note: 'G', octave: 5 },
    'N': { note: 'A', octave: 5 },
    'M': { note: 'B', octave: 5 },

    // Extended range
    'Q': { note: 'C', octave: 6 },
    'W': { note: 'D', octave: 6 },
    'E': { note: 'E', octave: 6 },
    'R': { note: 'F', octave: 6 },
    'T': { note: 'G', octave: 6 },
    'Y': { note: 'A', octave: 6 },
    'U': { note: 'B', octave: 6 }
};

// Initialize audio context
async function initAudio() {
    if (isAudioStarted) return;

    await Tone.start();
    isAudioStarted = true;
    window.isAudioStarted = true;

    // Create master volume
    masterVolume = new Tone.Volume(-10); // Start at -10dB

    // Create effects
    reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
    delay = new Tone.Delay({
        delayTime: 0.3,
        feedback: 0.3,
        wet: 0.2
    }).connect(reverb);

    // Connect master volume to delay and direct
    masterVolume.connect(delay);
    masterVolume.connect(reverb.input);

    // Initialize synth based on selected instrument
    updateInstrument(currentInstrument);

    console.log('Audio initialized');
}

function updateInstrument(instrumentName) {
    const options = getInstrumentOptions(instrumentName);

    switch (instrumentName) {
        case 'rhodes':
            // Fender Rhodes - Membrane with noise
            synth = new Tone.PolySynth(Tone.Membrane, options);
            synth.connect(masterVolume);
            break;

        case 'wurlitzer':
        case 'cp70':
        case 'cp80':
            // Wurlitzer/CP series - Synth with custom envelope
            synth = new Tone.PolySynth(Tone.Synth, options);
            synth.connect(masterVolume);
            break;

        case 'clavinet':
        case 'pianet':
            // Clavinet/Pianet - With distortion
            const dist = new Tone.Distortion(0.3);
            synth = new Tone.PolySynth(Tone.Synth, options);
            synth.connect(dist).connect(masterVolume);
            break;

        case 'juno':
            // Juno 106 - AM Synth
            synth = new Tone.PolySynth(Tone.AMSynth, options);
            synth.connect(masterVolume);
            break;

        case 'electra':
            // RMI Electra-piano - FM Synth
            synth = new Tone.PolySynth(Tone.FMSynth, options);
            synth.connect(masterVolume);
            break;

        case 'dx7':
            // Yamaha DX7 - FM Synth
            synth = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: options.harmonicity,
                modulationIndex: options.modulationIndex,
                envelope: options.envelope,
                modulation: {
                    envelope: options.modulationEnvelope
                }
            });
            synth.connect(masterVolume);
            break;

        case 'nord':
            // Nord Stage 4 - Rich PolySynth
            synth = new Tone.PolySynth(Tone.PolySynth, options);
            synth.connect(masterVolume);
            break;

        default:
            // Default
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1 }
            });
            synth.connect(masterVolume);
    }

    currentInstrument = instrumentName;
}

function getInstrumentOptions(name) {
    const commonOptions = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1 }
    };

    const instrumentOptions = {
        rhodes: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.5 }
        },
        wurlitzer: {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.4 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 }
        },
        cp70: {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.4 },
            filter: { type: 'lowpass', rolloff: -12, Q: 0.8 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 }
        },
        cp80: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.18, sustain: 0.35, release: 0.45 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.5 }
        },
        clavinet: {
            oscillator: { type: 'square' },
            envelope: { attack: 0.002, decay: 0.1, sustain: 0.2, release: 0.3 },
            filter: { type: 'bandpass', Q: 2 },
            filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.3 }
        },
        pianet: {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 },
            filter: { type: 'lowpass', Q: 0.5 },
            filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 }
        },
        juno: {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
            filter: { type: 'lowpass', Q: 5 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.5 }
        },
        electra: {
            harmonicity: 4,
            modulationIndex: 2,
            envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.4 },
            modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 }
        },
        dx7: {
            harmonicity: 2,
            modulationIndex: 3,
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
            modulationEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.3 }
        },
        nord: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.8 },
            filter: { type: 'lowpass', Q: 1 },
            filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.6 }
        }
    };

    return instrumentOptions[name] || commonOptions;
}

// Note to frequency conversion
function noteToFrequency(noteName, octave) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const semitone = notes.indexOf(noteName);
    // A4 = 440Hz, A4 is at octave 4, semitone 9
    // MIDI note number: C3 = 48
    const midiNumber = 12 * (octave + 1) + semitone;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

// Piano key generation
function generatePianoKeys() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    // Calculate visible range
    const firstOctave = currentOctaveStart;
    const lastOctave = firstOctave + visibleOctaves - 1;

    for (let oct = firstOctave; oct <= lastOctave; oct++) {
        OCTAVES.forEach((note) => {
            const isSharp = note.includes('#');
            const noteKey = createPianoKey(note, oct, isSharp);
            keyboard.appendChild(noteKey);
        });
    }

    updateOctaveDisplay();
}

function createPianoKey(note, octave, isSharp) {
    const key = document.createElement('div');
    key.className = `piano-key ${isSharp ? 'black' : 'white'}`;
    key.dataset.note = `${note}${octave}`;
    key.dataset.octave = octave;
    key.dataset.noteName = note;
    key.dataset.isSharp = isSharp;

    // Calculate position for black keys
    if (isSharp) {
        const noteIndex = NOTE_NUMBERS[note];
        // Find how many white keys before this note
        let whiteKeysBefore = 0;
        for (let i = 0; i < noteIndex; i++) {
            if (!OCTAVES[i].includes('#')) {
                whiteKeysBefore++;
            }
        }
        // Position: (whiteKeysBefore * whiteKeyWidth) - (blackKeyWidth / 2)
        // We'll handle this with CSS margin for relative positioning
    }

    // Mouse events
    key.addEventListener('mousedown', () => playNote(note, octave));
    key.addEventListener('mouseup', () => releaseNote(note, octave));
    key.addEventListener('mouseleave', () => releaseNote(note, octave));

    // Touch events
    key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        playNote(note, octave);
    });
    key.addEventListener('touchend', (e) => {
        e.preventDefault();
        releaseNote(note, octave);
    });

    return key;
}

// Note playback
function playNote(noteName, octave) {
    if (!synth) return;

    const frequency = noteToFrequency(noteName, octave);
    const note = `${noteName}${octave}`;

    // Visual feedback
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
        keyElement.classList.add('highlight');
    }

    // Play note with velocity
    const velocity = 0.8;
    synth.triggerAttack(note, undefined, velocity);
}

function releaseNote(noteName, octave) {
    if (!synth) return;

    const note = `${noteName}${octave}`;

    // Visual feedback
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.remove('active');
        keyElement.classList.remove('highlight');
    }

    // Release note
    synth.triggerRelease(note);
}

// Computer keyboard handlers
let activeKeys = new Set();

function handleKeyDown(e) {
    // Prevent default for some keys to avoid scrolling
    if (['z', 'x', 'c', 'v', 'b', 'n', 'm', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 's', 'd', 'g', 'h', 'j', '2', '3', '5', '6', '7', '9', '0'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }

    // Handle octave navigation
    if (e.key === 'ArrowLeft') {
        changeOctave(-1);
        return;
    }
    if (e.key === 'ArrowRight') {
        changeOctave(1);
        return;
    }

    // Check if key is already pressed (prevent repeat)
    if (activeKeys.has(e.key)) return;

    const keyMap = KEYBOARD_MAP[e.key];
    if (keyMap) {
        activeKeys.add(e.key);
        playNote(keyMap.note, keyMap.octave);

        // Auto-play with repeat delay
        setTimeout(() => {
            const interval = setInterval(() => {
                if (!activeKeys.has(e.key)) {
                    clearInterval(interval);
                } else {
                    playNote(keyMap.note, keyMap.octave);
                }
            }, 100);
        }, 200);
    }
}

function handleKeyUp(e) {
    const keyMap = KEYBOARD_MAP[e.key];
    if (keyMap) {
        activeKeys.delete(e.key);
        releaseNote(keyMap.note, keyMap.octave);
    }
}

// Octave navigation
function changeOctave(direction) {
    const newStart = currentOctaveStart + direction;
    if (newStart < MIN_OCTAVE || newStart + visibleOctaves - 1 > MAX_OCTAVE) {
        return;
    }

    currentOctaveStart = newStart;
    currentOctaveEnd = newStart + visibleOctaves - 1;

    generatePianoKeys();
    updateOctaveDisplay();
}

function updateOctaveDisplay() {
    const display = document.querySelector('.octave-display');
    if (display) {
        display.textContent = `Current: C${currentOctaveStart} - B${currentOctaveEnd}`;
    }
}

// Ribbon swipe handling
function initRibbonSwipe() {
    const ribbon = document.getElementById('ribbon');
    let startX = 0;
    let isDragging = false;
    let startXPos = 0;

    ribbon.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startXPos = currentOctaveStart;
        ribbon.style.cursor = 'grabbing';
    });

    ribbon.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        startXPos = currentOctaveStart;
    });

    ribbon.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const deltaX = e.clientX - startX;
        const threshold = 50; // Swipe threshold

        if (Math.abs(deltaX) >= threshold) {
            const direction = deltaX > 0 ? 1 : -1;
            changeOctave(direction);
            startX = e.clientX;
        }
    });

    ribbon.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - startX;
        const threshold = 30; // Smaller threshold for touch

        if (Math.abs(deltaX) >= threshold) {
            const direction = deltaX > 0 ? 1 : -1;
            changeOctave(direction);
            startX = e.touches[0].clientX;
        }
    });

    ribbon.addEventListener('mouseup', () => {
        isDragging = false;
        ribbon.style.cursor = 'grab';
    });

    ribbon.addEventListener('mouseleave', () => {
        isDragging = false;
        ribbon.style.cursor = 'grab';
    });

    ribbon.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// Arrow button handlers
function initArrowButtons() {
    const leftArrow = document.getElementById('arrow-left');
    const rightArrow = document.getElementById('arrow-right');

    leftArrow.addEventListener('click', () => changeOctave(-1));
    rightArrow.addEventListener('click', () => changeOctave(1));

    // Also allow tap on ribbon container
    document.getElementById('ribbon-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Control handlers
function initControls() {
    // Instrument selector
    const instrumentSelect = document.getElementById('instrument-select');
    instrumentSelect.addEventListener('change', (e) => {
        updateInstrument(e.target.value);
    });

    // Master volume
    const masterVolumeSlider = document.getElementById('master-volume');
    masterVolumeSlider.addEventListener('input', (e) => {
        const value = e.target.value / 100;
        if (masterVolume) {
            masterVolume.volume.value = value * 2 - 10; // -10dB to +10dB range
        }
    });

    // Reverb wet/dry
    const reverbSlider = document.getElementById('reverb-wet');
    reverbSlider.addEventListener('input', (e) => {
        if (reverb) {
            reverb.wet.value = e.target.value / 100;
        }
    });

    // Delay wet/dry
    const delaySlider = document.getElementById('delay-wet');
    delaySlider.addEventListener('input', (e) => {
        if (delay) {
            delay.wet.value = e.target.value / 100;
        }
    });
}

// Responsive visibility detection
function initResponsive() {
    function updateVisibleOctaves() {
        const width = window.innerWidth;
        const isPortrait = window.matchMedia('(orientation: portrait)').matches;

        if (isPortrait) {
            visibleOctaves = 1;
        } else if (width < 768) {
            visibleOctaves = 1;
        } else if (width < 1024) {
            visibleOctaves = 2;
        } else {
            visibleOctaves = 2;
        }

        generatePianoKeys();
    }

    // Initial check
    updateVisibleOctaves();

    // Listen for resize/orientation changes
    window.addEventListener('resize', updateVisibleOctaves);
    window.matchMedia('(orientation: portrait)').addEventListener('change', updateVisibleOctaves);
    window.matchMedia('(orientation: landscape)').addEventListener('change', updateVisibleOctaves);
}

// Initialize all
async function init() {
    // Initialize responsive layout first
    initResponsive();

    // Initialize ribbon swipe
    initRibbonSwipe();

    // Initialize arrow buttons
    initArrowButtons();

    // Initialize controls
    initControls();

    // Initialize audio (on first user interaction)
    document.addEventListener('click', async () => {
        if (!isAudioStarted) {
            await initAudio();
        }
    }, { once: true });

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Generate initial keys
    generatePianoKeys();

    console.log('Piano initialized');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
