const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_OFFSETS = {
  "C#": 0.68,
  "D#": 1.68,
  "F#": 3.68,
  "G#": 4.68,
  "A#": 5.68,
};
const OCTAVES = [2, 3, 4, 5, 6];
const KEYBOARD_ORDER = [
  "A",
  "W",
  "S",
  "E",
  "D",
  "F",
  "T",
  "G",
  "Y",
  "H",
  "U",
  "J",
  "K",
];
const KEYBOARD_MAP = new Map(
  KEYBOARD_ORDER.map((key, index) => [key.toLowerCase(), index])
);
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024, expectOctaves: 2 },
  { name: "tablet", width: 1024, height: 768, expectOctaves: 2 },
  { name: "mobile", width: 390, height: 844, expectOctaves: 1 },
];

const appState = {
  visibleOctaves: 2,
  startOctaveIndex: 0,
  pointerToNote: new Map(),
  keyboardToNote: new Map(),
  activeNotes: new Set(),
  currentPreset: "Fender Rhodes",
  audioReady: false,
  sampler: null,
  noteElements: new Map(),
  keybedMetrics: { whiteKeyWidth: 72, octaveWidth: 504 },
};

const presetSelect = document.querySelector("#preset-select");
const keyRail = document.querySelector("#key-rail");
const viewport = document.querySelector("#piano-viewport");
const rangeLabel = document.querySelector("#range-label");
const layoutLabel = document.querySelector("#layout-label");
const ribbon = document.querySelector("#octave-ribbon");
const pianoShell = document.querySelector("#piano-shell");

const presetDefinitions = {
  "Fender Rhodes": () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 24,
      oscillator: { type: "triangle4" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.38, release: 1.4 },
    });
    const tremolo = new Tone.Tremolo({ frequency: 4.6, depth: 0.16, wet: 0.3 }).start();
    const chorus = new Tone.Chorus({ frequency: 1.4, delayTime: 2.5, depth: 0.26, wet: 0.28 }).start();
    const filter = new Tone.Filter(1800, "lowpass");
    const reverb = new Tone.Reverb({ decay: 2.7, wet: 0.2 });
    synth.chain(filter, tremolo, chorus, reverb, Tone.Destination);
    return synth;
  },
  "Wurlitzer Electronic Piano": () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 24,
      oscillator: { type: "square4" },
      envelope: { attack: 0.005, decay: 0.14, sustain: 0.3, release: 0.9 },
    });
    const filter = new Tone.Filter(1350, "lowpass");
    const drive = new Tone.Distortion(0.12);
    const vibrato = new Tone.Vibrato(5.2, 0.08);
    synth.chain(filter, drive, vibrato, Tone.Destination);
    return synth;
  },
  "Yamaha CP-70": () => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 20,
      harmonicity: 1.2,
      modulationIndex: 7.5,
      envelope: { attack: 0.002, decay: 0.38, sustain: 0.18, release: 1.1 },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.05, release: 0.6 },
    });
    const eq = new Tone.EQ3(-1, 1, 2);
    const comp = new Tone.Compressor(-26, 3);
    synth.chain(eq, comp, Tone.Destination);
    return synth;
  },
  "Yamaha CP-80": () => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 20,
      harmonicity: 1.65,
      modulationIndex: 9,
      envelope: { attack: 0.002, decay: 0.45, sustain: 0.14, release: 1.4 },
      modulationEnvelope: { attack: 0.002, decay: 0.28, sustain: 0.08, release: 0.9 },
    });
    const chorus = new Tone.Chorus({ frequency: 0.8, delayTime: 3.2, depth: 0.16, wet: 0.15 }).start();
    const comp = new Tone.Compressor(-24, 3.2);
    synth.chain(chorus, comp, Tone.Destination);
    return synth;
  },
  "Hohner Clavinet": () => {
    const synth = new Tone.PolySynth(Tone.MonoSynth, {
      maxPolyphony: 16,
      oscillator: { type: "square3" },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.06, release: 0.25 },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0.08,
        release: 0.2,
        baseFrequency: 450,
        octaves: 3.6,
      },
    });
    const wah = new Tone.AutoWah(80, 5, -22);
    const drive = new Tone.Distortion(0.18);
    synth.chain(wah, drive, Tone.Destination);
    return synth;
  },
  "Hohner Pianet": () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 20,
      oscillator: { type: "triangle2" },
      envelope: { attack: 0.003, decay: 0.16, sustain: 0.16, release: 0.55 },
    });
    const chorus = new Tone.Chorus({ frequency: 1.1, delayTime: 2.2, depth: 0.2, wet: 0.12 }).start();
    const eq = new Tone.EQ3(0, 1.2, -1);
    synth.chain(eq, chorus, Tone.Destination);
    return synth;
  },
  "Juno 106": () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 24,
      oscillator: { type: "sawtooth6" },
      envelope: { attack: 0.03, decay: 0.24, sustain: 0.62, release: 1.8 },
    });
    const filter = new Tone.Filter(1200, "lowpass");
    const chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.5, wet: 0.45 }).start();
    const reverb = new Tone.Reverb({ decay: 3.4, wet: 0.18 });
    synth.chain(filter, chorus, reverb, Tone.Destination);
    return synth;
  },
  "RMI Electra-piano": () => {
    const synth = new Tone.PolySynth(Tone.AMSynth, {
      maxPolyphony: 18,
      harmonicity: 2.3,
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.4 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.002, decay: 0.1, sustain: 0.08, release: 0.3 },
    });
    const eq = new Tone.EQ3(1.5, 0.2, 2.3);
    synth.chain(eq, Tone.Destination);
    return synth;
  },
  "Yamaha DX7 organ": () => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 24,
      harmonicity: 3,
      modulationIndex: 2.2,
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.95, release: 0.45 },
      modulationEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.35 },
    });
    const chorus = new Tone.Chorus({ frequency: 1.6, delayTime: 5.5, depth: 0.22, wet: 0.25 }).start();
    synth.chain(chorus, Tone.Destination);
    return synth;
  },
  "Clavia Nord Stage 4 Grand Piano": () => {
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 24,
      harmonicity: 1.08,
      modulationIndex: 6.5,
      envelope: { attack: 0.003, decay: 0.5, sustain: 0.22, release: 1.8 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.04, release: 0.6 },
    });
    const eq = new Tone.EQ3(1.2, 0.5, 1.8);
    const reverb = new Tone.Reverb({ decay: 4.2, wet: 0.22 });
    const comp = new Tone.Compressor(-22, 3);
    synth.chain(eq, reverb, comp, Tone.Destination);
    return synth;
  },
};

function buildPresetMenu() {
  Object.keys(presetDefinitions).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    presetSelect.append(option);
  });
  presetSelect.value = appState.currentPreset;
  presetSelect.addEventListener("change", async (event) => {
    appState.currentPreset = event.target.value;
    if (appState.audioReady) {
      await swapPreset();
    }
  });
}

function noteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTES[midi % 12]}${octave}`;
}

function renderKeys() {
  keyRail.innerHTML = "";
  appState.noteElements.clear();

  OCTAVES.forEach((octave, octaveIndex) => {
    WHITE_NOTES.forEach((note, whiteIndex) => {
      const midi = Tone.Frequency(`${note}${octave}`).toMidi();
      const left = (octaveIndex * 7 + whiteIndex) * appState.keybedMetrics.whiteKeyWidth;
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key white";
      key.dataset.note = noteName(midi);
      key.dataset.midi = String(midi);
      key.style.left = `${left}px`;
      key.setAttribute("aria-label", `${note}${octave}`);
      keyRail.append(key);
      appState.noteElements.set(key.dataset.note, key);
    });

    Object.entries(BLACK_OFFSETS).forEach(([note, offset]) => {
      const midi = Tone.Frequency(`${note}${octave}`).toMidi();
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key black";
      key.dataset.note = noteName(midi);
      key.dataset.midi = String(midi);
      key.style.left = `${
        (octaveIndex * 7 + offset) * appState.keybedMetrics.whiteKeyWidth -
        appState.keybedMetrics.whiteKeyWidth * 0.5 +
        appState.keybedMetrics.whiteKeyWidth * 0.18
      }px`;
      key.setAttribute("aria-label", `${note}${octave}`);
      keyRail.append(key);
      appState.noteElements.set(key.dataset.note, key);
    });
  });

  keyRail.style.width = `${appState.keybedMetrics.octaveWidth * OCTAVES.length}px`;
  bindKeyPointers();
}

function updateMetrics() {
  const styles = getComputedStyle(document.documentElement);
  appState.keybedMetrics.whiteKeyWidth = Number.parseFloat(
    styles.getPropertyValue("--white-key-width")
  );
  appState.keybedMetrics.octaveWidth = Number.parseFloat(styles.getPropertyValue("--octave-width"));
}

function clampStartOctave(index) {
  const maxStart = OCTAVES.length - appState.visibleOctaves;
  return Math.max(0, Math.min(index, maxStart));
}

function applyViewport() {
  appState.startOctaveIndex = clampStartOctave(appState.startOctaveIndex);
  viewport.style.width = `${appState.keybedMetrics.octaveWidth * appState.visibleOctaves}px`;
  keyRail.style.transform = `translateX(-${
    appState.startOctaveIndex * appState.keybedMetrics.octaveWidth
  }px)`;
  const start = OCTAVES[appState.startOctaveIndex];
  const end = OCTAVES[appState.startOctaveIndex + appState.visibleOctaves - 1];
  rangeLabel.textContent = `Current: C${start} - B${end}`;
  layoutLabel.textContent =
    appState.visibleOctaves === 1 ? "Portrait · 1 octave visible" : "Landscape/Desktop · 2 octaves visible";
  document.body.dataset.visibleOctaves = String(appState.visibleOctaves);
}

function updateLayout() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const visible = isPortrait && window.innerWidth < 900 ? 1 : 2;
  appState.visibleOctaves = visible;
  applyViewport();
}

async function ensureAudioReady() {
  if (appState.audioReady) {
    return;
  }
  await Tone.start();
  await swapPreset();
  appState.audioReady = true;
  window.__pianoState.audioReady = true;
}

async function swapPreset() {
  if (appState.sampler) {
    appState.sampler.releaseAll();
    appState.sampler.dispose();
  }
  appState.sampler = presetDefinitions[appState.currentPreset]();
  window.__pianoState.currentPreset = appState.currentPreset;
}

async function playNote(note) {
  await ensureAudioReady();
  if (appState.activeNotes.has(note)) {
    return;
  }
  appState.activeNotes.add(note);
  appState.sampler.triggerAttack(note, Tone.now(), 0.9);
  appState.noteElements.get(note)?.classList.add("active");
  window.__pianoState.playedNotes.push(note);
  window.__pianoState.activeNotes = [...appState.activeNotes];
}

function releaseNote(note) {
  if (!appState.activeNotes.has(note) || !appState.sampler) {
    return;
  }
  appState.activeNotes.delete(note);
  appState.sampler.triggerRelease(note, Tone.now());
  appState.noteElements.get(note)?.classList.remove("active");
  window.__pianoState.activeNotes = [...appState.activeNotes];
}

function bindKeyPointers() {
  const keyElements = keyRail.querySelectorAll(".key");

  keyElements.forEach((key) => {
    key.addEventListener("pointerdown", async (event) => {
      event.preventDefault();
      const note = key.dataset.note;
      key.setPointerCapture(event.pointerId);
      appState.pointerToNote.set(event.pointerId, note);
      await playNote(note);
    });

    key.addEventListener("pointerup", (event) => {
      const note = appState.pointerToNote.get(event.pointerId) ?? key.dataset.note;
      appState.pointerToNote.delete(event.pointerId);
      releaseNote(note);
    });

    key.addEventListener("pointercancel", (event) => {
      const note = appState.pointerToNote.get(event.pointerId) ?? key.dataset.note;
      appState.pointerToNote.delete(event.pointerId);
      releaseNote(note);
    });

    key.addEventListener("lostpointercapture", (event) => {
      const note = appState.pointerToNote.get(event.pointerId);
      if (note) {
        appState.pointerToNote.delete(event.pointerId);
        releaseNote(note);
      }
    });
  });
}

function bindKeyboard() {
  window.addEventListener("keydown", async (event) => {
    if (event.repeat || event.target instanceof HTMLSelectElement) {
      return;
    }
    const offset = KEYBOARD_MAP.get(event.key.toLowerCase());
    if (offset === undefined) {
      if (event.key === "ArrowLeft") {
        shiftOctave(-1);
      }
      if (event.key === "ArrowRight") {
        shiftOctave(1);
      }
      return;
    }

    const baseOctave = OCTAVES[appState.startOctaveIndex];
    const note = noteName(Tone.Frequency(`C${baseOctave}`).transpose(offset).toMidi());
    appState.keyboardToNote.set(event.key.toLowerCase(), note);
    await playNote(note);
  });

  window.addEventListener("keyup", (event) => {
    const note = appState.keyboardToNote.get(event.key.toLowerCase());
    if (!note) {
      return;
    }
    appState.keyboardToNote.delete(event.key.toLowerCase());
    releaseNote(note);
  });
}

function shiftOctave(delta) {
  const nextIndex = clampStartOctave(appState.startOctaveIndex + delta);
  if (nextIndex === appState.startOctaveIndex) {
    return;
  }
  appState.startOctaveIndex = nextIndex;
  applyViewport();
  window.__pianoState.startOctaveIndex = appState.startOctaveIndex;
}

function bindRibbon() {
  let dragStartX = 0;
  let dragging = false;

  ribbon.addEventListener("pointerdown", (event) => {
    dragStartX = event.clientX;
    dragging = true;
  });

  ribbon.addEventListener("pointerup", (event) => {
    if (!dragging) {
      return;
    }
    const delta = event.clientX - dragStartX;
    dragging = false;
    if (Math.abs(delta) < 40) {
      return;
    }
    shiftOctave(delta < 0 ? 1 : -1);
  });

  ribbon.addEventListener("pointercancel", () => {
    dragging = false;
  });

  ribbon.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      shiftOctave(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      shiftOctave(1);
    }
  });
}

function setupResizeHandling() {
  const observer = new ResizeObserver(() => {
    updateMetrics();
    renderKeys();
    updateLayout();
  });
  observer.observe(pianoShell);
  window.addEventListener("resize", updateLayout);
}

function exposeTestState() {
  window.__pianoState = {
    audioReady: false,
    currentPreset: appState.currentPreset,
    playedNotes: [],
    activeNotes: [],
    startOctaveIndex: appState.startOctaveIndex,
    get visibleOctaves() {
      return appState.visibleOctaves;
    },
    get rangeText() {
      return rangeLabel.textContent;
    },
    get keyCount() {
      return keyRail.querySelectorAll(".key").length;
    },
  };
  window.__pianoViewports = VIEWPORTS;
}

function boot() {
  exposeTestState();
  updateMetrics();
  buildPresetMenu();
  renderKeys();
  bindKeyboard();
  bindRibbon();
  setupResizeHandling();
  updateLayout();
}

boot();
