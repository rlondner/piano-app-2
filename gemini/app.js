// Constants
const MIN_OCTAVE = 2; // C2
const MAX_OCTAVE = 7; // C7
const TOTAL_KEYS = 61; // 5 octaves + 1 high C
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// State
let currentOctaveIndex = 1; // 0-based index of visible octave range (starts at C3)
let isAudioStarted = false;
let currentInstrument = 'fender_rhodes';
let synth = null;
let activeNotes = new Set();

// DOM Elements
const pianoStrip = document.getElementById('piano-strip');
const ribbonLabel = document.getElementById('ribbon-label');
const startOverlay = document.getElementById('start-overlay');
const instrumentSelect = document.getElementById('instrument-select');
const navLeft = document.getElementById('nav-left');
const navRight = document.getElementById('nav-right');

// Instrument Presets (Approximations)
const instruments = {
    fender_rhodes: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.5, release: 2 }
    },
    wurlitzer: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 1.5 }
    },
    yamaha_cp70: {
        oscillator: { type: 'square' }, // Simplified approximation
        filter: { type: 'lowpass', frequency: 2000 },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 1 }
    },
    yamaha_cp80: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.6, release: 1.2 }
    },
    hohner_clavinet: {
        oscillator: { type: 'pulse', width: 0.2 },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.5 }
    },
    hohner_pianet: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 }
    },
    juno_106: {
        oscillator: { type: 'pwm', modulationFrequency: 0.4 },
        envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 2 }
    },
    rmi_electra: {
        oscillator: { type: 'pulse', width: 0.5 },
        envelope: { attack: 0.01, decay: 2, sustain: 0, release: 0.5 }
    },
    dx7_organ: {
        oscillator: { type: 'fmsine', modulationIndex: 10, harmonicity: 3 },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 1 }
    },
    nord_stage: {
        oscillator: { type: 'amsine', harmonicity: 2, modulationType: 'sine' },
        envelope: { attack: 0.01, decay: 0.6, sustain: 0.4, release: 2.5 }
    }
};

// --- Audio Engine ---

async function initAudio() {
    if (isAudioStarted) return;
    
    await Tone.start();
    console.log('Audio Context Started');
    
    // Create base PolySynth
    synth = new Tone.PolySynth(Tone.Synth, instruments[currentInstrument]).toDestination();
    synth.volume.value = -5; // Prevent clipping
    
    // Add simple reverb for space
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
    synth.connect(reverb);

    isAudioStarted = true;
    startOverlay.classList.add('hidden');
}

function setInstrument(name) {
    if (!synth) return;
    currentInstrument = name;
    const settings = instruments[name];
    
    // Release all notes to prevent stuck sounds when switching
    synth.releaseAll();
    
    // Update synth settings
    synth.set(settings);
    console.log(`Instrument changed to: ${name}`);
}

function playNote(note) {
    if (!isAudioStarted || !synth) return;
    if (activeNotes.has(note)) return; // Prevent re-triggering while held
    
    synth.triggerAttack(note);
    activeNotes.add(note);
    
    // Visual feedback
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) key.classList.add('active');
}

function stopNote(note) {
    if (!isAudioStarted || !synth) return;
    
    synth.triggerRelease(note);
    activeNotes.delete(note);
    
    // Visual feedback
    const key = document.querySelector(`.key[data-note="${note}"]`);
    if (key) key.classList.remove('active');
}


// --- UI Generation ---

function generateKeys() {
    pianoStrip.innerHTML = '';
    
    let whiteKeyIndex = 0;
    
    for (let i = 0; i < TOTAL_KEYS; i++) {
        const absoluteIndex = i;
        const octave = Math.floor(i / 12) + MIN_OCTAVE;
        const noteIndex = i % 12;
        const noteName = NOTES[noteIndex];
        const fullNote = `${noteName}${octave}`;
        const isBlack = noteName.includes('#');
        
        const key = document.createElement('div');
        key.classList.add('key');
        key.dataset.note = fullNote;
        
        if (isBlack) {
            key.classList.add('black');
            // Position calculation:
            // Black keys are positioned relative to the previous white key.
            // We need to calculate 'left' percentage.
            // Standard piano layout: 
            // C# -> between C and D (14.3% of octave width)
            // D# -> between D and E (28.6% ...)
            
            // Simplified positioning using absolute left based on white key count
            // 1 White key width unit = 100% / 7 (approx 14.28%)
            // Black keys are offset.
            
            // However, since we are using a flexible flex layout for white keys, 
            // black keys are best placed absolutely relative to the container,
            // OR we can just rely on the fact that we know the visual index.
            
            // Better approach for responsive: 
            // Place black key inside the wrapper, but use absolute positioning.
            // BUT, our strip is a flex container.
            // So we need to insert white keys in flow, and black keys absolutely positioned.
            
            // To make this robust:
            // Let's rely on `left` style relative to the start of the strip.
            // Each white key is width W.
            // Black key centers on the border between white keys.
            
            // We'll set the specific `left` style inline during generation.
            
            // C# is after 1st white key. Center is at 1 * W.
            // D# is after 2nd white key. Center at 2 * W.
            // F# is after 4th white key. Center at 4 * W.
            // G# is after 5th white key. Center at 5 * W.
            // A# is after 6th white key. Center at 6 * W.
            
            // Note index in octave:
            // 0:C, 1:C#, 2:D, 3:D#, 4:E, 5:F, 6:F#, 7:G, 8:G#, 9:A, 10:A#, 11:B
            // White keys passed in current octave:
            // C(1), D(2), E(3), F(4), G(5), A(6), B(7)
            
            // We can calculate offset based on total white keys passed so far.
            const offsetWhiteKeys = whiteKeyIndex; 
            // To center it on the line, we want center at offsetWhiteKeys * WhiteKeyWidth.
            // But we can't know pixel width easily in JS without measuring.
            // CSS Variables to the rescue? 
            
            // Let's use CALC in style.
            // We need to know which media query is active to know if width is 1/7 or 1/14 vw.
            // Actually, we can just use a CSS variable for unit width.
            
            // Total white keys from start (C2) to this position.
            // whiteKeyIndex is global counter.
            
            // C# (1) is between C(0) and D(1). It sits on the border after C.
            // So left = (whiteKeyIndex) * var(--key-width) - (blackKeyWidth / 2)
            
            // Wait, if isBlack is true, we haven't incremented whiteKeyIndex for THIS note yet.
            // But we have for the previous white note (C).
            // So for C#, whiteKeyIndex is 1 (C).
            // Left position should be approx 1 unit.
            
            const positionMultiplier = whiteKeyIndex; 
            
            // We apply a style.
            // We need to differentiate mobile vs desktop variable in CSS.
            // So we assign a class or variable that CSS uses.
            // Actually, best to just put it in the DOM and let CSS handle absolute positioning relative to strip?
            // Yes, strip is relative.
            
            key.style.left = `calc(${positionMultiplier} * var(--white-key-width-mobile) - (var(--white-key-width-mobile) * 0.3))`;
            
            // We need a media query override in JS? No, prefer CSS.
            // We can set a custom property `--pos-index: ${positionMultiplier}`
            key.style.setProperty('--pos-index', positionMultiplier);
            
            // In CSS we will define:
            // left: calc(var(--pos-index) * var(--white-key-width-mobile) - (var(--white-key-width-mobile) * 0.3));
            // @media ... left: calc(var(--pos-index) * var(--white-key-width-desktop) - (var(--white-key-width-desktop) * 0.3));
            
        } else {
            key.classList.add('white');
            whiteKeyIndex++;
        }
        
        // Touch/Mouse Events
        addKeyListeners(key, fullNote);
        pianoStrip.appendChild(key);
    }
    
    // Update CSS rule for black key positioning dynamically or via stylesheet
    updateBlackKeyCSS();
}

function updateBlackKeyCSS() {
    // We inject a dynamic style block to handle the complex calc logic if needed, 
    // but the inline style with CSS variables is cleaner.
    // Let's check styles.css to ensure we support the variable approach.
    // I will append a style block to head to ensure these calculations work.
    
    const style = document.createElement('style');
    style.innerHTML = `
        .key.black {
            left: calc(var(--pos-index) * var(--white-key-width-mobile) - (var(--white-key-width-mobile) * 0.3));
        }
        @media (min-width: 768px) {
            .key.black {
                left: calc(var(--pos-index) * var(--white-key-width-desktop) - (var(--white-key-width-desktop) * 0.3));
            }
        }
    `;
    document.head.appendChild(style);
}

function addKeyListeners(key, note) {
    const start = (e) => {
        e.preventDefault();
        playNote(note);
    };
    const end = (e) => {
        e.preventDefault();
        stopNote(note);
    };
    
    key.addEventListener('mousedown', start);
    key.addEventListener('mouseup', end);
    key.addEventListener('mouseleave', end);
    
    key.addEventListener('touchstart', start, { passive: false });
    key.addEventListener('touchend', end);
    key.addEventListener('touchcancel', end);
}


// --- Navigation & Layout ---

function updateViewport() {
    // Calculate translation based on currentOctaveIndex
    // We want to shift the strip so that 'currentOctaveIndex' is the first visible octave.
    // currentOctaveIndex 0 = C2 (Start)
    // currentOctaveIndex 1 = C3
    // ...
    
    // Each octave has 7 white keys.
    // Shift amount = currentOctaveIndex * 7 * keyWidth
    
    const isDesktop = window.innerWidth >= 768;
    const shiftKeys = (currentOctaveIndex - (MIN_OCTAVE - 2)) * 7; 
    // Wait, currentOctaveIndex is just an index 0..4 for navigation?
    // Let's redefine: currentOctaveIndex 0 => shows C2-B2.
    
    // We start at C2. 
    // Index 0: shift 0.
    // Index 1: shift 7 keys.
    
    // We set a CSS variable for the shift index
    pianoStrip.style.setProperty('--shift-index', currentOctaveIndex);
    
    // Apply transform in JS to be safe
    // We need to read the computed key width? 
    // Or just use percentage: 100vw = 7 keys (mobile) or 14 keys (desktop).
    // So 1 key = 100/7 vw or 100/14 vw.
    
    // shift % = currentOctaveIndex * 7 * (100 / (isDesktop ? 14 : 7))
    // = currentOctaveIndex * (isDesktop ? 50 : 100)
    
    const translatePercent = currentOctaveIndex * (isDesktop ? 50 : 100);
    pianoStrip.style.transform = `translateX(-${translatePercent}vw)`;
    
    updateRibbonText();
    updateNavButtons();
}

function updateRibbonText() {
    // C2 is min.
    // currentOctaveIndex 0 => C2
    const startOctave = MIN_OCTAVE + currentOctaveIndex;
    const isDesktop = window.innerWidth >= 768;
    const endOctave = isDesktop ? startOctave + 1 : startOctave;
    
    // Clamp display
    const displayStart = `C${startOctave}`;
    const displayEnd = `B${Math.min(endOctave, MAX_OCTAVE)}`; // Logic simplified
    
    // Actually, if desktop shows 2 octaves: C3 - B4
    // If mobile: C3 - B3
    
    let text = `Range: ${displayStart} - `;
    if (isDesktop) {
        text += `B${startOctave + 1}`;
    } else {
        text += `B${startOctave}`;
    }
    
    ribbonLabel.querySelector('.range-text').textContent = text;
}

function updateNavButtons() {
    const isDesktop = window.innerWidth >= 768;
    const maxIndex = isDesktop ? 3 : 4; // 5 octaves total. 
    // Mobile: 0,1,2,3,4 (5 views)
    // Desktop: 0(C2-C4), 1(C3-C5), 2(C4-C6), 3(C5-C7)? 
    // Let's stick to simple logic: we shift by 1 octave steps.
    // Total octaves = 5 (C2, C3, C4, C5, C6).
    // Mobile max index = 4 (shows C6).
    // Desktop max index: if we show 2 octaves, we can go up to index 3 (shows C5-C6).
    
    navLeft.style.opacity = currentOctaveIndex <= 0 ? 0.3 : 1;
    navRight.style.opacity = currentOctaveIndex >= maxIndex ? 0.3 : 1;
    navLeft.disabled = currentOctaveIndex <= 0;
    navRight.disabled = currentOctaveIndex >= maxIndex;
}

function shiftOctave(direction) {
    const isDesktop = window.innerWidth >= 768;
    const maxIndex = isDesktop ? 3 : 4;
    
    const newIndex = currentOctaveIndex + direction;
    if (newIndex >= 0 && newIndex <= maxIndex) {
        currentOctaveIndex = newIndex;
        updateViewport();
    }
}

// --- Initialization ---

instrumentSelect.addEventListener('change', (e) => {
    setInstrument(e.target.value);
});

navLeft.addEventListener('click', () => shiftOctave(-1));
navRight.addEventListener('click', () => shiftOctave(1));

startOverlay.addEventListener('click', initAudio);

// Keyboard support
window.addEventListener('keydown', (e) => {
    // Simple mapping for testing: Z SX DC V G B H N J M (bottom row)
    // Not exhaustive, just for basic playability if needed
});

// Resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Clamp index if we switched modes and are out of bounds
        const isDesktop = window.innerWidth >= 768;
        const maxIndex = isDesktop ? 3 : 4;
        if (currentOctaveIndex > maxIndex) currentOctaveIndex = maxIndex;
        updateViewport();
    }, 100);
});

// Initial Setup
generateKeys();
// Set initial view to middle C (C3-C4 range) -> Index 1 (Starts at C3)
// Mobile: Index 1 shows C3. Desktop: Index 1 shows C3-C4.
currentOctaveIndex = 1;
updateViewport();
