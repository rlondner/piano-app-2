/**
 * Glassmorphic Web Synth Piano
 * A 5-octave web synthesizer with Tone.js
 */

// Configuration
const CONFIG = {
  totalOctaves: 5,
  startOctave: 2,
  whiteKeysPerOctave: 7,
  blackKeyPattern: [0, 1, 3, 4, 5], // Positions of black keys within an octave
  swipeThreshold: 50,
  keyboardBaseOctave: 2
};

// Note names
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

// Keyboard mapping (GarageBand-style)
const KEYBOARD_MAP = {
  whiteKeys: {
    'a': 0, // C
    's': 1, // D
    'd': 2, // E
    'f': 3, // F
    'g': 4, // G
    'h': 5, // A
    'j': 6, // B
    'k': 7  // C (next octave)
  },
  blackKeys: {
    'w': 0, // C#
    'e': 1, // D#
    't': 3, // F#
    'y': 4, // G#
    'u': 5  // A#
  },
  octaveShift: {
    'z': -1, // Shift down
    'x': 1   // Shift up
  }
};

// Instrument presets with accurate Tone.js configurations
const INSTRUMENT_PRESETS = {
  'grand-piano': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.3, release: 1.5 },
      volume: -8
    },
    effects: { chorus: true, delay: true, reverb: true }
  },
  'electric-piano': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.0 },
      volume: -6
    },
    effects: { chorus: true, delay: false, reverb: true }
  },
  'fender-rhodes': {
    type: 'fm',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sine' },
      modulation: { type: 'square', modulationIndex: 2 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -5
    },
    effects: { chorus: { rate: 2, depth: 0.3 }, delay: true, reverb: true }
  },
  'wurlitzer': {
    type: 'am',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'triangle' },
      modulation: { type: 'sine', modulationIndex: 1.5 },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.8 },
      volume: -4
    },
    effects: { chorus: { rate: 1.5, depth: 0.2 }, delay: true, reverb: true }
  },
  'dx7-organ': {
    type: 'fm',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sine' },
      modulation: { type: 'square', modulationIndex: 4 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
      volume: -3
    },
    effects: { chorus: false, delay: false, reverb: { decay: 1.5, wet: 0.2 } }
  },
  'nord-stage': {
    type: 'am',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sawtooth' },
      modulation: { type: 'sine', modulationIndex: 2 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 },
      volume: -6
    },
    effects: { chorus: true, delay: true, reverb: true }
  },
  'strings': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 2.0 },
      volume: -8
    },
    effects: { chorus: { rate: 0.5, depth: 0.4 }, delay: false, reverb: { decay: 3, wet: 0.4 } }
  },
  'pad': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.8, release: 2.5 },
      volume: -6
    },
    effects: { chorus: { rate: 0.3, depth: 0.5 }, delay: { time: 0.5, wet: 0.3 }, reverb: { decay: 4, wet: 0.5 } }
  },
  'bells': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.5, sustain: 0.1, release: 2.0 },
      volume: -4
    },
    effects: { chorus: false, delay: { time: 0.4, wet: 0.3 }, reverb: { decay: 3, wet: 0.4 } }
  },
  'synth-lead': {
    type: 'polyphony',
    synthType: Tone.PolySynth,
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 },
      volume: -5
    },
    effects: { chorus: false, delay: { time: 0.2, wet: 0.25 }, reverb: { decay: 1.5, wet: 0.3 } }
  }
};

// State
let currentOctave = CONFIG.startOctave;
let currentInstrument = 'grand-piano';
let synth = null;
let chorus = null;
let delay = null;
let reverb = null;
let keyboardOctaveOffset = 0;

// Swipe state
let isSwiping = false;
let swipeStartX = 0;
let swipeCurrentX = 0;

// DOM Elements
let keyboardEl;
let ribbonEl;
let octaveDisplayEl;
let instrumentSelectEl;
let volumeSliderEl;

/**
 * Initialize the application
 */
async function init() {
  // Wait for Tone.js to be ready
  await Tone.start();

  // Cache DOM elements
  keyboardEl = document.getElementById('keyboard');
  ribbonEl = document.getElementById('ribbon');
  octaveDisplayEl = document.getElementById('octave-display');
  instrumentSelectEl = document.getElementById('instrument');
  volumeSliderEl = document.getElementById('volume');

  // Initialize audio
  initAudio();

  // Generate keyboard
  generateKeyboard();

  // Setup event listeners
  addKeyListeners();
  addNavigationListeners();
  addSwipeListeners();
  addKeyboardListeners();
  addControlListeners();

  // Initial viewport update
  updateViewport();
  updateOctaveDisplay();
}

/**
 * Initialize audio chain with effects
 */
function initAudio() {
  // Create effects chain
  chorus = new Tone.Chorus(2, 2.5, 0.5).toDestination();
  chorus.wet.value = 0.3;

  delay = new Tone.FeedbackDelay('8n', 0.2).connect(chorus);

  reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(delay);

  // Create default synth
  createSynth(currentInstrument);
}

/**
 * Create synth based on preset
 */
function createSynth(presetName) {
  const preset = INSTRUMENT_PRESETS[presetName];
  if (!preset) return;

  // Dispose of old synth
  if (synth) {
    synth.dispose();
  }

  // Create new synth
  synth = new preset.synthType(preset.options);
  synth.connect(reverb);

  // Configure effects based on preset
  configureEffects(preset.effects);
}

/**
 * Configure effects chain based on preset
 */
function configureEffects(effectsConfig) {
  // Reset effects
  chorus.wet.value = 0;
  delay.wet.value = 0;
  reverb.wet.value = 0;

  // Apply chorus
  if (effectsConfig.chorus) {
    if (typeof effectsConfig.chorus === 'object') {
      chorus.frequency.value = effectsConfig.chorus.rate || 2;
      chorus.depth.value = effectsConfig.chorus.depth || 0.3;
    }
    chorus.wet.value = 0.3;
  }

  // Apply delay
  if (effectsConfig.delay) {
    if (typeof effectsConfig.delay === 'object') {
      delay.delayTime.value = effectsConfig.delay.time || 0.3;
      delay.wet.value = effectsConfig.delay.wet || 0.2;
    } else {
      delay.wet.value = 0.2;
    }
  }

  // Apply reverb
  if (effectsConfig.reverb) {
    if (typeof effectsConfig.reverb === 'object') {
      reverb.decay.value = effectsConfig.reverb.decay || 2;
      reverb.wet.value = effectsConfig.reverb.wet || 0.3;
    } else {
      reverb.wet.value = 0.3;
    }
  }
}

/**
 * Generate keyboard HTML
 */
function generateKeyboard() {
  keyboardEl.innerHTML = '';

  // Create keys wrapper
  const keysWrapper = document.createElement('div');
  keysWrapper.className = 'keys-wrapper';
  keyboardEl.appendChild(keysWrapper);

  // Create white keys for all octaves
  for (let oct = 0; oct < CONFIG.totalOctaves; oct++) {
    const octave = CONFIG.startOctave + oct;
    for (let i = 0; i < CONFIG.whiteKeysPerOctave; i++) {
      const key = document.createElement('div');
      key.className = 'white-key';
      key.dataset.note = WHITE_NOTES[i];
      key.dataset.octave = octave;
      key.dataset.index = oct * CONFIG.whiteKeysPerOctave + i;
      keysWrapper.appendChild(key);
    }
  }

  // Create black keys container
  const blackKeysContainer = document.createElement('div');
  blackKeysContainer.className = 'black-keys-container';
  keyboardEl.appendChild(blackKeysContainer);

  // Create black keys for all octaves
  for (let oct = 0; oct < CONFIG.totalOctaves; oct++) {
    const octave = CONFIG.startOctave + oct;
    for (let i = 0; i < CONFIG.blackKeyPattern.length; i++) {
      const posIndex = CONFIG.blackKeyPattern[i];
      const key = document.createElement('div');
      key.className = 'black-key';
      key.dataset.note = BLACK_NOTES[i];
      key.dataset.octave = octave;
      key.dataset.offset = posIndex;
      key.dataset.octaveIndex = oct;
      blackKeysContainer.appendChild(key);
    }
  }
}

/**
 * Add key press/tap listeners
 */
function addKeyListeners() {
  const whiteKeys = keyboardEl.querySelectorAll('.white-key');
  const blackKeys = keyboardEl.querySelectorAll('.black-key');

  const handleKeyInteraction = (key, note, octave) => {
    playNote(note, octave);
    key.classList.add('active');
    setTimeout(() => key.classList.remove('active'), 150);
  };

  // White keys
  whiteKeys.forEach(key => {
    const note = key.dataset.note;
    const octave = parseInt(key.dataset.octave);

    // Mouse events
    key.addEventListener('mousedown', () => handleKeyInteraction(key, note, octave));

    // Touch events
    key.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleKeyInteraction(key, note, octave);
    });
  });

  // Black keys
  blackKeys.forEach(key => {
    const note = key.dataset.note;
    const octave = parseInt(key.dataset.octave);

    // Mouse events
    key.addEventListener('mousedown', () => handleKeyInteraction(key, note, octave));

    // Touch events
    key.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleKeyInteraction(key, note, octave);
    });
  });
}

/**
 * Play a note
 */
function playNote(note, octave) {
  if (!synth) return;

  const fullNote = `${note}${octave}`;
  synth.triggerAttackRelease(fullNote, '8n');
}

/**
 * Add navigation button listeners
 */
function addNavigationListeners() {
  const prevBtn = ribbonEl.querySelector('.prev-octave');
  const nextBtn = ribbonEl.querySelector('.next-octave');

  prevBtn.addEventListener('click', () => shiftOctave(-1));
  nextBtn.addEventListener('click', () => shiftOctave(1));
}

/**
 * Shift current octave
 */
function shiftOctave(direction) {
  const newOctave = currentOctave + direction;
  if (newOctave < CONFIG.startOctave) return;
  if (newOctave >= CONFIG.startOctave + CONFIG.totalOctaves) return;

  currentOctave = newOctave;
  updateOctaveDisplay();
  updateViewport();
}

/**
 * Update octave display text
 */
function updateOctaveDisplay() {
  const endOctave = currentOctave + 1;
  octaveDisplayEl.textContent = `C${currentOctave} - C${endOctave}`;
}

/**
 * Update viewport transform based on current octave
 */
function updateViewport() {
  const isMobile = window.innerWidth < 768;
  const visibleKeys = isMobile ? CONFIG.whiteKeysPerOctave : CONFIG.whiteKeysPerOctave * 2;
  const totalWhiteKeys = CONFIG.totalOctaves * CONFIG.whiteKeysPerOctave;

  const currentKeyIndex = (currentOctave - CONFIG.startOctave) * CONFIG.whiteKeysPerOctave;

  // Get key width from CSS variable
  const keyWidthVar = isMobile ? '--white-key-width-mobile' : '--white-key-width-desktop';
  const keyWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(keyWidthVar)) || 50;

  // Calculate transform in pixels based on visible keys
  const translatePixels = currentKeyIndex * keyWidth;

  const keysWrapper = keyboardEl.querySelector('.keys-wrapper');
  const blackKeysContainer = keyboardEl.querySelector('.black-keys-container');

  keysWrapper.style.transform = `translateX(-${translatePixels}px)`;
  blackKeysContainer.style.transform = `translateX(-${translatePixels}px)`;
}

/**
 * Add swipe gesture listeners
 */
function addSwipeListeners() {
  // Touch events
  ribbonEl.addEventListener('touchstart', handleSwipeStart, { passive: true });
  ribbonEl.addEventListener('touchmove', handleSwipeMove, { passive: true });
  ribbonEl.addEventListener('touchend', handleSwipeEnd, { passive: true });

  // Mouse events (for drag)
  ribbonEl.addEventListener('mousedown', handleSwipeStart);
  document.addEventListener('mousemove', handleSwipeMove);
  document.addEventListener('mouseup', handleSwipeEnd);
}

function handleSwipeStart(e) {
  isSwiping = true;
  swipeStartX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  ribbonEl.classList.add('swiping');
}

function handleSwipeMove(e) {
  if (!isSwiping) return;
  swipeCurrentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
}

function handleSwipeEnd(e) {
  if (!isSwiping) return;
  isSwiping = false;
  ribbonEl.classList.remove('swiping');

  const endX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
  const delta = endX - swipeStartX;

  if (Math.abs(delta) > CONFIG.swipeThreshold) {
    if (delta < 0) {
      // Swipe left - higher octave
      shiftOctave(1);
    } else {
      // Swipe right - lower octave
      shiftOctave(-1);
    }
  }
}

/**
 * Add keyboard event listeners
 */
function addKeyboardListeners() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  const pressedKeys = new Set();

  function handleKeyDown(e) {
    if (e.repeat) return;

    const key = e.key.toLowerCase();

    // Check for octave shift
    if (key in KEYBOARD_MAP.octaveShift) {
      keyboardOctaveOffset += KEYBOARD_MAP.octaveShift[key];
      return;
    }

    // Check for white key
    if (key in KEYBOARD_MAP.whiteKeys) {
      pressedKeys.add(key);
      const keyIndex = KEYBOARD_MAP.whiteKeys[key];
      const octave = CONFIG.startOctave + keyboardOctaveOffset + Math.floor(keyIndex / 7);
      const noteIndex = keyIndex % 7;
      const note = WHITE_NOTES[noteIndex];

      const domKey = keyboardEl.querySelector(`.white-key[data-note="${note}"][data-octave="${octave}"]`);
      if (domKey) {
        domKey.classList.add('active');
        playNote(note, octave);
      }
    }

    // Check for black key
    if (key in KEYBOARD_MAP.blackKeys) {
      pressedKeys.add(key);
      const keyIndex = KEYBOARD_MAP.blackKeys[key];
      const octave = CONFIG.startOctave + keyboardOctaveOffset;
      const noteIndex = keyIndex;
      const note = BLACK_NOTES[noteIndex];

      const domKey = keyboardEl.querySelector(`.black-key[data-note="${note}"][data-octave="${octave}"]`);
      if (domKey) {
        domKey.classList.add('active');
        playNote(note, octave);
      }
    }
  }

  function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    pressedKeys.delete(key);

    // Remove active class from all keys when key is released
    const activeKeys = keyboardEl.querySelectorAll('.active');
    activeKeys.forEach(k => k.classList.remove('active'));
  }
}

/**
 * Add control listeners
 */
function addControlListeners() {
  // Instrument selector
  instrumentSelectEl.addEventListener('change', (e) => {
    currentInstrument = e.target.value;
    createSynth(currentInstrument);
  });

  // Volume slider
  volumeSliderEl.addEventListener('input', (e) => {
    const volume = e.target.value;
    Tone.Destination.volume.value = -((100 - volume) / 100) * 50;
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Handle window resize
window.addEventListener('resize', updateViewport);
