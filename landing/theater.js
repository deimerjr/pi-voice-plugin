/**
 * PI TERMINAL THEATER — INTERACTIVE ENGINE & RECORDER (theater.js)
 * Sincronización de audio Kokoro, osciloscopio en canvas con paleta Gentleman-Sexy-Djr
 * y exportación de video WebM con MediaRecorder.
 */

const SCENES_DATA = [
  {
    key: "gentleman",
    name: "el Gentleman",
    role: "Orquestador // dora_heart",
    voice: "dora_heart",
    audioFile: "audio/gentleman.wav",
    elemId: "scene-gentleman",
    statusText: "Gentleman coordinando a la cuadrilla...",
    avatarSvg: `<rect x="6" y="10" width="36" height="30"/><line x1="6" y1="10" x2="24" y2="4"/><line x1="42" y1="10" x2="24" y2="4"/><rect x="14" y="20" width="8" height="8" fill="currentColor"/><circle cx="32" cy="24" r="5" stroke-width="3"/><line x1="32" y1="14" x2="32" y2="34"/>`,
  },
  {
    key: "dora",
    name: "Dora",
    role: "Exploradora // ef_dora",
    voice: "ef_dora",
    audioFile: "audio/dora.wav",
    elemId: "scene-dora",
    statusText: "Dora explorando playground/validador...",
    avatarSvg: `<polygon points="24,4 44,24 24,44 4,24"/><polygon points="24,12 36,24 24,36 12,24"/><rect x="21" y="21" width="6" height="6" fill="currentColor"/>`,
  },
  {
    key: "alex",
    name: "Alex",
    role: "Programador // em_alex",
    voice: "em_alex",
    audioFile: "audio/alex.wav",
    elemId: "scene-alex",
    statusText: "Alex implementando validador.js y tests...",
    avatarSvg: `<rect x="6" y="8" width="36" height="12"/><rect x="18" y="20" width="12" height="22"/><rect x="22" y="24" width="4" height="4" fill="currentColor"/>`,
  },
  {
    key: "santa",
    name: "Santa",
    role: "Auditor // em_santa",
    voice: "em_santa",
    audioFile: "audio/santa.wav",
    elemId: "scene-santa",
    statusText: "Santa ejecutando npm test con lupa...",
    avatarSvg: `<circle cx="20" cy="20" r="14" stroke-width="3"/><rect x="17" y="17" width="6" height="6" fill="currentColor"/><line x1="30" y1="30" x2="44" y2="44" stroke-width="5"/>`,
  },
];

let audioCtx = null;
let analyser = null;
let currentAudio = null;
let currentSource = null;
let isPlayingSequence = false;
let currentSceneIndex = 0;
let animationFrameId = null;

// MediaRecorder state
let mediaRecorder = null;
let recordedChunks = [];
let isRecordingVideo = false;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// Canvas Audio Wave Visualizer (Gentleman-Sexy-Djr palette)
function drawWaveform() {
  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  if (!analyser || !isPlayingSequence) {
    // Dibujar línea base en reposo
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#723C54";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    animationFrameId = requestAnimationFrame(drawWaveform);
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, width, height);

  const barWidth = (width / bufferLength) * 1.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height;

    // Gradiente dinámico en colores Gentleman-Sexy-Djr
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, "#E02B70"); // deepPink
    gradient.addColorStop(0.5, "#FF4F9A"); // activePink
    gradient.addColorStop(1, "#F0D28A"); // champagne

    ctx.fillStyle = gradient;
    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

    x += barWidth;
  }

  animationFrameId = requestAnimationFrame(drawWaveform);
}

function updateHUD(scene) {
  const hudAvatar = document.getElementById("hud-avatar");
  const hudName = document.getElementById("hud-name");
  const hudRole = document.getElementById("hud-role");
  const widgetVoice = document.getElementById("widget-active-voice");
  const widgetStatus = document.getElementById("widget-status-label");
  const speakerHud = document.getElementById("speaker-hud");
  const voiceBtn = document.getElementById("widget-voice-btn");

  if (hudName) hudName.textContent = scene.name;
  if (hudRole) hudRole.textContent = scene.role;
  if (widgetVoice) widgetVoice.textContent = scene.voice;
  if (widgetStatus) widgetStatus.textContent = scene.statusText;
  if (speakerHud) speakerHud.classList.add("speaking");
  if (voiceBtn) voiceBtn.classList.add("speaking-now");

  if (hudAvatar && scene.avatarSvg) {
    hudAvatar.innerHTML = `<svg viewBox="0 0 48 48" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square">${scene.avatarSvg}</svg>`;
  }

  // Resaltar píldora activa de escena
  document.querySelectorAll(".scene-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.getAttribute("data-scene") === scene.key);
  });
}

function resetHUD() {
  const speakerHud = document.getElementById("speaker-hud");
  const voiceBtn = document.getElementById("widget-voice-btn");
  const widgetStatus = document.getElementById("widget-status-label");

  if (speakerHud) speakerHud.classList.remove("speaking");
  if (voiceBtn) voiceBtn.classList.remove("speaking-now");
  if (widgetStatus) widgetStatus.textContent = "Cuadrilla en espera (Jefe listo)";
  document.querySelectorAll(".scene-pill").forEach((pill) => pill.classList.remove("active"));
  document.querySelectorAll(".agent-msg-box").forEach((b) => b.classList.remove("active-speaking"));
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentSource) {
    try {
      currentSource.disconnect();
    } catch {}
    currentSource = null;
  }
}

function playScene(index, onComplete) {
  if (index >= SCENES_DATA.length) {
    isPlayingSequence = false;
    resetHUD();
    const playBtn = document.getElementById("btn-play-theater");
    if (playBtn) playBtn.innerHTML = "▶ REPRODUCIR DE NUEVO";
    if (typeof onComplete === "function") onComplete();
    return;
  }

  initAudioContext();
  stopCurrentAudio();

  currentSceneIndex = index;
  const scene = SCENES_DATA[index];

  // Revelar la caja de la escena en el terminal
  const sceneElem = document.getElementById(scene.elemId);
  if (sceneElem) {
    sceneElem.classList.add("visible");
    document.querySelectorAll(".agent-msg-box").forEach((b) => b.classList.remove("active-speaking"));
    sceneElem.classList.add("active-speaking");

    // Auto-scroll suave de la terminal
    const terminalBody = document.getElementById("terminal-body");
    if (terminalBody) {
      terminalBody.scrollTop = sceneElem.offsetTop - 60;
    }
  }

  updateHUD(scene);

  const audio = new Audio(scene.audioFile);
  currentAudio = audio;

  // Conectar con Web Audio Analyser si el audio context está disponible
  if (audioCtx && analyser) {
    try {
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      currentSource = source;
    } catch {}
  }

  audio.onended = () => {
    stopCurrentAudio();
    // Breve pausa conversacional entre agentes (350ms)
    setTimeout(() => {
      playScene(index + 1, onComplete);
    }, 400);
  };

  audio.onerror = () => {
    console.warn(`[Theater] No se pudo cargar el audio ${scene.audioFile}, continuando...`);
    setTimeout(() => {
      playScene(index + 1, onComplete);
    }, 2000);
  };

  audio.play().catch(() => {
    // Si el navegador requiere interacción de usuario
    setTimeout(() => {
      playScene(index + 1, onComplete);
    }, 2000);
  });
}

function startFullTheater() {
  initAudioContext();
  isPlayingSequence = true;

  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) playBtn.innerHTML = "⏸ PAUSAR";

  // Ocultar todas las escenas para arrancar la secuencia limpia
  document.querySelectorAll(".agent-msg-box").forEach((b) => {
    b.classList.remove("visible", "active-speaking");
  });

  const terminalBody = document.getElementById("terminal-body");
  if (terminalBody) terminalBody.scrollTop = 0;

  playScene(0, () => {
    if (isRecordingVideo && mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  });
}

function pauseTheater() {
  isPlayingSequence = false;
  stopCurrentAudio();
  resetHUD();
  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) playBtn.innerHTML = "▶ CONTINUAR";
}

function restartTheater() {
  isPlayingSequence = false;
  stopCurrentAudio();
  resetHUD();
  document.querySelectorAll(".agent-msg-box").forEach((b) => {
    b.classList.remove("visible", "active-speaking");
  });
  const terminalBody = document.getElementById("terminal-body");
  if (terminalBody) terminalBody.scrollTop = 0;
  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) playBtn.innerHTML = "▶ INICIAR ANIMACIÓN";
}

// MediaRecorder para exportación directa a video WebM
function setupVideoRecorder() {
  const btnRecord = document.getElementById("btn-record-video");
  if (!btnRecord) return;

  btnRecord.addEventListener("click", async () => {
    if (isRecordingVideo) {
      // Detener grabación manual
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      return;
    }

    try {
      // Captura de pantalla de la terminal
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", displaySurface: "browser" },
        audio: true,
      });

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        isRecordingVideo = false;
        btnRecord.classList.remove("recording");
        btnRecord.innerHTML = "🎬 GRABAR VIDEO (.WEBM)";

        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pi-voice-cuadrilla-gentleman-theme.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        stream.getTracks().forEach((t) => t.stop());
      };

      isRecordingVideo = true;
      btnRecord.classList.add("recording");
      btnRecord.innerHTML = "🔴 GRABANDO... (CLIC PARA PARAR)";

      mediaRecorder.start();
      startFullTheater();
    } catch (err) {
      console.log("[Theater] Captura cancelada o no disponible:", err);
      btnRecord.classList.remove("recording");
      btnRecord.innerHTML = "🎬 GRABAR VIDEO (.WEBM)";
    }
  });
}

// Inicialización de controles DOM
document.addEventListener("DOMContentLoaded", () => {
  drawWaveform();

  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (isPlayingSequence) {
        pauseTheater();
      } else {
        startFullTheater();
      }
    });
  }

  const restartBtn = document.getElementById("btn-restart-theater");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      restartTheater();
    });
  }

  // Píldoras de salto de escena individual
  document.querySelectorAll(".scene-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const sceneKey = pill.getAttribute("data-scene");
      const idx = SCENES_DATA.findIndex((s) => s.key === sceneKey);
      if (idx !== -1) {
        isPlayingSequence = true;
        const pBtn = document.getElementById("btn-play-theater");
        if (pBtn) pBtn.innerHTML = "⏸ PAUSAR";
        playScene(idx);
      }
    });
  });

  // Botón Parar en la barra de widget
  const stopWidgetBtn = document.getElementById("widget-stop-btn");
  if (stopWidgetBtn) {
    stopWidgetBtn.addEventListener("click", () => {
      pauseTheater();
    });
  }

  setupVideoRecorder();
});
