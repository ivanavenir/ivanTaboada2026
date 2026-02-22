/**
 * EZDAW - Professional Audio Engine & Sequencer
 * Features: Polyphony, Smart Resizing (FL Style), Magnetic Snap, Right-Click Erase.
 */

// 1. WEB WORKER (Precisión de reloj profesional)
const workerCode = `
    let timerID = null;
    self.onmessage = function(e) {
        if (e.data === "start") {
            timerID = setInterval(() => postMessage("tick"), 25);
        } else if (e.data === "stop") {
            clearInterval(timerID);
            timerID = null;
        }
    };
`;
const timerWorker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));

// 2. CONFIGURACIÓN DE AUDIO CORE
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const limiter = audioCtx.createDynamicsCompressor();
const masterGain = audioCtx.createGain();

limiter.threshold.setValueAtTime(-3, audioCtx.currentTime); // Compresión para polifonía
limiter.connect(masterGain);
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.6; // Margen de volumen para evitar saturación

// 3. FILTROS Y ESTADO
const instrumentFilters = [];
for (let i = 0; i < 4; i++) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = i < 2 ? 3000 : 10000;
    filter.connect(limiter);
    instrumentFilters.push(filter);
}

const notes = {
    "C4": 261.63, "Bb3": 233.08, "B3": 246.94, "Ab3": 207.65, 
    "A3": 220.00, "Gb3": 185.00, "G3": 196.00, "F3": 174.61,
    "E3": 164.81, "Eb3": 155.56, "D3": 146.83, "Db3": 138.59, "C3": 130.81
};
const noteNames = Object.keys(notes);
const STEP_WIDTH = 100;  
const STEP_HEIGHT = 35; 

let isPlaying = false;
let currentStep = 0;
let bpm = 140;
let nextStepTime = 0;
let isResizing = false;
let currentResizingPad = null;

// 4. CARGA DE SAMPLES
const sampleUrls = ['../assets/audio/kick.wav', '../assets/audio/snare.wav', '../assets/audio/hihat.wav', '../assets/audio/openhat.wav'];
const audioBuffers = [null, null, null, null];

async function loadSamples() {
    for (let i = 0; i < sampleUrls.length; i++) {
        try {
            const response = await fetch(sampleUrls[i]);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[i] = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (err) { console.warn(`Sample ${i} no cargado, usando síntesis.`); }
    }
}
loadSamples();

// 5. GENERACIÓN DE INTERFAZ
const sequencer = document.getElementById('sequencer');
const pianoSequencer = document.getElementById('piano-sequencer');

// Drum Grid
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 16; j++) {
        const pad = document.createElement('button');
        pad.classList.add('pad');
        pad.dataset.row = i;
        pad.dataset.step = j;
        pad.addEventListener('mousedown', (e) => {
            if (e.button === 2) pad.classList.remove('active');
            else pad.classList.toggle('active');
        });
        pad.addEventListener('contextmenu', e => e.preventDefault());
        sequencer.appendChild(pad);
    }
}

// Piano Roll Grid (Lógica FL Studio)
noteNames.forEach((note, rowIndex) => {
    for (let j = 0; j < 16; j++) {
        const pad = document.createElement('div');
        pad.classList.add('piano-pad');
        pad.style.left = (j * STEP_WIDTH) + "px";
        pad.style.top = (rowIndex * STEP_HEIGHT) + "px";
        pad.style.width = STEP_WIDTH + "px";
        pad.style.height = STEP_HEIGHT + "px";
        
        pad.dataset.note = note;
        pad.dataset.step = j;
        pad.dataset.duration = 1;

        // Overlay para estirar
        const resizer = document.createElement('div');
        resizer.classList.add('resizer-overlay');
        pad.appendChild(resizer);

        pad.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Clic derecho para borrar
                pad.classList.remove('active');
                pad.style.width = STEP_WIDTH + "px";
                pad.dataset.duration = 1;
                return;
            }

            if (pad.classList.contains('active')) {
                if (e.target.classList.contains('resizer-overlay')) {
                    isResizing = true;
                    currentResizingPad = pad;
                }
            } else {
                pad.classList.add('active');
                playNote(note, audioCtx.currentTime, 0.15);
            }
            e.preventDefault();
        });

        pad.addEventListener('contextmenu', e => e.preventDefault());
        pianoSequencer.appendChild(pad);
    }
});

// 6. LÓGICA DE RESIZE (MouseMove Global)
window.addEventListener('mousemove', (e) => {
    if (!isResizing || !currentResizingPad) return;

    const rect = pianoSequencer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + pianoSequencer.scrollLeft;
    const startX = parseInt(currentResizingPad.dataset.step) * STEP_WIDTH;
    
    // Snap magnético al grid
    let steps = Math.max(1, Math.round((mouseX - startX) / STEP_WIDTH));
    const maxSteps = 16 - parseInt(currentResizingPad.dataset.step);
    steps = Math.min(steps, maxSteps);
    
    currentResizingPad.dataset.duration = steps;
    currentResizingPad.style.width = (steps * STEP_WIDTH) + "px";
});

window.addEventListener('mouseup', () => {
    isResizing = false;
    currentResizingPad = null;
});

// 7. MOTOR DE AUDIO (Polifónico)
function playSound(row, time) {
    if (audioBuffers[row]) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffers[row];
        source.connect(instrumentFilters[row]);
        source.start(time);
    }
}

function playNote(noteName, time, durationSecs) {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[noteName], time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + durationSecs);

    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.15, time + 0.01); 
    env.gain.exponentialRampToValueAtTime(0.001, time + durationSecs);

    osc.connect(filter);
    filter.connect(env);
    env.connect(limiter);

    osc.start(time);
    osc.stop(time + durationSecs);
}

// 8. BUCLE DE TIEMPO
timerWorker.onmessage = function () {
    while (nextStepTime < audioCtx.currentTime + 0.1) {
        const stepDuration = (60.0 / bpm / 4);

        // Batería
        document.querySelectorAll(`.pad[data-step="${currentStep}"]:not(.piano-pad)`).forEach(pad => {
            pad.classList.add('current');
            if (pad.classList.contains('active')) playSound(parseInt(pad.dataset.row), nextStepTime);
            setTimeout(() => pad.classList.remove('current'), 100);
        });

        // Piano Roll Polifónico (Busca todas las notas que empiezan en este step)
        document.querySelectorAll(`.piano-pad[data-step="${currentStep}"].active`).forEach(pad => {
            pad.classList.add('current');
            const noteDur = parseInt(pad.dataset.duration) * stepDuration;
            playNote(pad.dataset.note, nextStepTime, noteDur);
            setTimeout(() => pad.classList.remove('current'), 100);
        });

        nextStepTime += stepDuration;
        currentStep = (currentStep + 1) % 16;
    }
};

// 9. EVENTOS DE INTERFAZ
document.getElementById('play-pause').addEventListener('click', (e) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlaying = !isPlaying;
    if (isPlaying) {
        e.target.textContent = "Stop";
        nextStepTime = audioCtx.currentTime;
        timerWorker.postMessage("start");
    } else {
        e.target.textContent = "Play";
        timerWorker.postMessage("stop");
        currentStep = 0;
    }
});

document.getElementById('bpm').addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    document.getElementById('bpm-display').textContent = `${bpm} BPM`;
});

document.querySelectorAll('.knob').forEach(knob => {
    knob.addEventListener('input', (e) => {
        instrumentFilters[e.target.dataset.row].frequency.setTargetAtTime(e.target.value, audioCtx.currentTime, 0.05);
    });
});