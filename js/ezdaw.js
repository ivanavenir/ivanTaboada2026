// 1. CREACIÓN DEL WORKER VIRTUAL (Hilos para segundo plano)
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
const blob = new Blob([workerCode], { type: 'application/javascript' });
const timerWorker = new Worker(URL.createObjectURL(blob));

// 2. CONFIGURACIÓN DE AUDIO GLOBAL
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
const limiter = audioCtx.createDynamicsCompressor();

limiter.threshold.setValueAtTime(-1, audioCtx.currentTime);
limiter.connect(masterGain);
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.9;

// 3. FILTROS POR INSTRUMENTO (Las Perillas)
const instrumentFilters = [];
for (let i = 0; i < 4; i++) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass"; 
    // Frecuencias iniciales: graves para Kick/Snare, agudos para Hats
    filter.frequency.value = i < 2 ? 3000 : 10000; 
    filter.connect(limiter);
    instrumentFilters.push(filter);
}

// 4. CARGA DE SAMPLES
const sampleUrls = [
    '../assets/audio/kick.wav',
    '../assets/audio/snare.wav',
    '../assets/audio/hihat.wav',
    '../assets/audio/openhat.wav'
];
const audioBuffers = [null, null, null, null];

async function loadSamples() {
    for (let i = 0; i < sampleUrls.length; i++) {
        try {
            const response = await fetch(sampleUrls[i]);
            if (!response.ok) throw new Error();
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[i] = await audioCtx.decodeAudioData(arrayBuffer);
            console.log(`Sample ${i} listo`);
        } catch (err) {
            console.warn(`Sample ${i} falló. Usando synth de emergencia.`);
        }
    }
}
loadSamples();

// 5. VARIABLES DEL SECUENCIADOR Y UI
let isPlaying = false;
let currentStep = 0;
let bpm = 140;
let nextStepTime = 0;

const sequencer = document.getElementById('sequencer');
const bpmInput = document.getElementById('bpm');
const bpmDisplay = document.getElementById('bpm-display');

// Control de BPM
bpmInput.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    bpmDisplay.textContent = `${bpm} BPM`;
});

// Control de Perillas (Knobs)
document.querySelectorAll('.knob').forEach(knob => {
    knob.addEventListener('input', (e) => {
        const row = e.target.dataset.row;
        const val = e.target.value;
        // setTargetAtTime evita "clics" auditivos al mover la perilla
        instrumentFilters[row].frequency.setTargetAtTime(val, audioCtx.currentTime, 0.05);
    });
});

// Crear Grid de 4x16
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 16; j++) {
        const pad = document.createElement('button');
        pad.classList.add('pad');
        pad.dataset.row = i;
        pad.dataset.step = j;
        pad.addEventListener('click', () => pad.classList.toggle('active'));
        sequencer.appendChild(pad);
    }
}

// 6. REPRODUCCIÓN
function playSound(row, time) {
    let source;
    let fallbackEnv = null;

    if (audioBuffers[row]) {
        source = audioCtx.createBufferSource();
        source.buffer = audioBuffers[row];
    } else {
        // Sintetizador de emergencia corregido para conectar a filtros
        source = audioCtx.createOscillator();
        fallbackEnv = audioCtx.createGain();
        
        if (row === 0) {
            source.frequency.setValueAtTime(150, time);
            source.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
        } else if (row === 1) {
            source.type = 'triangle';
            source.frequency.setValueAtTime(250, time);
        } else {
            source.type = 'square';
            source.frequency.setValueAtTime(row === 2 ? 8000 : 6000, time);
        }
        
        fallbackEnv.gain.setValueAtTime(0.4, time);
        fallbackEnv.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
        source.connect(fallbackEnv);
        source.start(time);
        source.stop(time + 0.3);
    }

    // CONEXIÓN FINAL: Audio -> Filtro de su fila -> Limitador
    if (fallbackEnv) {
        fallbackEnv.connect(instrumentFilters[row]);
    } else {
        source.connect(instrumentFilters[row]);
        source.start(time);
    }
}

// 7. MOTOR DE TIEMPO (Worker)
timerWorker.onmessage = function() {
    while (nextStepTime < audioCtx.currentTime + 0.1) {
        const pads = document.querySelectorAll(`.pad[data-step="${currentStep}"]`);
        pads.forEach(pad => {
            pad.classList.add('current');
            if (pad.classList.contains('active')) {
                playSound(parseInt(pad.dataset.row), nextStepTime);
            }
            setTimeout(() => pad.classList.remove('current'), 150);
        });
        
        const secondsPerBeat = 60.0 / bpm / 4;
        nextStepTime += secondsPerBeat;
        currentStep = (currentStep + 1) % 16;
    }
};

// 8. PLAY/STOP
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
    }
});