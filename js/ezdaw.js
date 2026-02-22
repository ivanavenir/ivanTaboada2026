/**
 * EZDAW Core - Edición "Background Play"
 * Incluye: Resize de notas, Reset de huella y Audio estable en segundo plano.
 */

let audioCtx = null;
let isPlaying = false;
let currentStep = 0;
let bpm = 140;
let nextStepTime = 0.0;
const scheduleAheadTime = 0.1; // Cuánto tiempo miramos hacia el futuro (en segundos)
let timerID = null; // ID del reloj para segundo plano

// Variables para el Resize (Estiramiento)
let isResizing = false;
let currentPad = null;
let startX, startWidth;

const notes = { "C4": 261.63, "B3": 246.94, "A3": 220.00, "G3": 196.00, "F3": 174.61, "E3": 164.81, "D3": 146.83, "C3": 130.81 };
const noteNames = Object.keys(notes);
const audioBuffers = [null, null, null, null];
const filters = [null, null, null, null];
const sampleUrls = [
    '../assets/audio/kick.wav',
    '../assets/audio/snare.wav',
    '../assets/audio/hihat.wav',
    '../assets/audio/openhat.wav',
    '../assets/audio/industrial_synth.wav'
];

// --- 1. INICIALIZACIÓN DE AUDIO ---
async function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    for (let i = 0; i < sampleUrls.length; i++) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.connect(audioCtx.destination);
        filters[i] = filter;

        try {
            const response = await fetch(sampleUrls[i]);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[i] = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) { console.error("Error cargando sample:", i); }
    }
}

// --- 2. GENERACIÓN DE GRID DE BATERÍA ---
const sequencerGrid = document.getElementById('sequencer');
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 16; j++) {
        const pad = document.createElement('button');
        pad.classList.add('pad');
        pad.dataset.row = i;
        pad.dataset.step = j;
        pad.onmousedown = (e) => {
            if (e.button === 2) pad.classList.remove('active');
            else pad.classList.toggle('active');
        };
        sequencerGrid.appendChild(pad);
    }
}

// --- 3. GENERACIÓN DE PIANO ROLL (Con Resizer Invisible y Reset) ---
const pianoSequencer = document.getElementById('piano-sequencer');
noteNames.forEach((note, rowIndex) => {
    for (let j = 0; j < 16; j++) {
        const pad = document.createElement('div');
        pad.classList.add('piano-pad');
        pad.style.left = (j * 100) + "px";
        pad.style.top = (rowIndex * 30) + "px";
        pad.style.width = "100px";
        pad.style.height = "30px";
        pad.dataset.note = note;
        pad.dataset.step = j;

        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        pad.appendChild(resizer);

        pad.onmousedown = (e) => {
            if (e.target.classList.contains('resizer')) return;

            if (e.button === 2) {
                pad.classList.remove('active');
                pad.style.width = "100px"; // Reset de huella
            } else {
                if (pad.classList.contains('active')) {
                    pad.classList.remove('active');
                    pad.style.width = "100px"; // Reset al desactivar
                } else {
                    pad.classList.add('active');
                    if (audioCtx) playNote(note, audioCtx.currentTime);
                }
            }
        };
        pianoSequencer.appendChild(pad);
    }
});

// --- 4. LÓGICA DE RESIZE (ESTIRAMIENTO) ---
document.addEventListener('mousedown', e => {
    if (e.target.classList.contains('resizer')) {
        isResizing = true;
        currentPad = e.target.parentElement;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(currentPad).width, 10);
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    }
});

document.addEventListener('mousemove', e => {
    if (!isResizing || !currentPad) return;
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    const snappedWidth = Math.max(100, Math.round(newWidth / 50) * 50);
    currentPad.style.width = snappedWidth + 'px';
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        currentPad = null;
        document.body.style.cursor = 'default';
    }
});

// --- 5. LÓGICA DE AUDIO (REPRODUCCIÓN) ---
function playSound(index, time) {
    if (!audioBuffers[index]) return;
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffers[index];
    source.playbackRate.value = document.getElementById('drum-pitch-control').value;
    source.connect(filters[index]);
    source.start(time);
}

function playNote(note, time) {
    if (!audioBuffers[4]) return;

    const decayValue = parseFloat(document.getElementById('piano-decay').value);
    const activePads = document.querySelectorAll(`.piano-pad[data-note="${note}"].active`);
    let noteDuration = 0.15;
    
    activePads.forEach(p => {
        if(parseInt(p.dataset.step) === currentStep) {
            noteDuration = (parseInt(p.style.width) / 100) * (60 / bpm / 4);
        }
    });

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    source.buffer = audioBuffers[4];

    // Pitch (Afinación)
    const baseFreq = 130.81; 
    const playbackRate = notes[note] / baseFreq;
    source.playbackRate.setValueAtTime(playbackRate, time);

    // FILTRO: Bajamos la Q de 22 a 8 para quitar el "chillido" que distorsiona
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, time);
    filter.Q.setValueAtTime(8, time); 

    const releaseTime = decayValue;
    const totalDuration = noteDuration + releaseTime;

    // ENVOLVENTE: Bajamos la ganancia de 0.7 a 0.4 para evitar el clipping
    gain.gain.setValueAtTime(0, time);
    // Un ataque de 0.01s es lo suficientemente rápido para ser seco pero evita distorsión inicial
    gain.gain.linearRampToValueAtTime(0.4, time + 0.01); 
    gain.gain.setValueAtTime(0.4, time + noteDuration);
    
    // Release lineal más controlado
    gain.gain.linearRampToValueAtTime(0.0001, time + totalDuration);

    source.connect(filter);
    filter.connect(gain);
    
    // OPCIONAL: Conectar a un compresor si lo tienes, o directo al destino
    gain.connect(audioCtx.destination);

    source.start(time);
    source.stop(time + totalDuration);
}

// --- 6. MOTOR DE TIEMPO (ESTABLE EN SEGUNDO PLANO) ---
function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    nextStepTime += 0.25 * secondsPerBeat; // Avanzar 1/16 de nota
    currentStep = (currentStep + 1) % 16;
}

function scheduleStep(step, time) {
    // Audio: Se programa en el hardware (no se detiene al salir de la pestaña)
    document.querySelectorAll(`.pad[data-step="${step}"].active`).forEach(p => {
        playSound(parseInt(p.dataset.row), time);
    });
    document.querySelectorAll(`.piano-pad[data-step="${step}"].active`).forEach(p => {
        playNote(p.dataset.note, time);
    });

    // Visual: Se sincroniza mediante un pequeño retraso
    const drawTime = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => {
        if (!isPlaying) return;
        document.getElementById('drum-playhead').style.left = (step * 35) + "px";
        document.getElementById('playhead').style.left = (step * 100) + "px";
    }, drawTime);
}

function scheduler() {
    while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleStep(currentStep, nextStepTime);
        nextNote();
    }
}

// --- 7. EVENTOS DE CONTROL ---
document.getElementById('play-pause').onclick = async function () {
    await initAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    isPlaying = !isPlaying;
    this.textContent = isPlaying ? "Stop" : "Play";

    if (isPlaying) {
        currentStep = 0;
        nextStepTime = audioCtx.currentTime;
        // Usamos setInterval para que el navegador no lo pause al 100%
        timerID = setInterval(scheduler, 25);
    } else {
        clearInterval(timerID);
    }
};

document.getElementById('bpm').oninput = (e) => {
    bpm = e.target.value;
    document.getElementById('bpm-display').textContent = `${bpm} BPM`;
};

document.querySelectorAll('.drum-pitch-slider[data-row]').forEach(slider => {
    slider.oninput = (e) => {
        const row = e.target.dataset.row;
        if (filters[row]) filters[row].frequency.value = e.target.value;
    };
});

document.addEventListener('contextmenu', e => e.preventDefault());