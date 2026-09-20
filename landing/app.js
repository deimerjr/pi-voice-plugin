/**
 * PI VOICE PLUGIN — BRUTALIST LANDING & TERMINAL THEATER INTERACTION (app.js)
 * Sincronización de audio Kokoro, osciloscopio en canvas con paleta Gentleman-Sexy-Djr,
 * simulación interactiva de terminal en vivo y exportador de video WebM.
 */

// Datos de la Cuadrilla para el Soundboard y el Terminal Theater
const CUADRILLA_DATA = {
  gentleman: {
    key: "gentleman",
    name: "El Gentleman",
    role: "Orquestador // dora_heart",
    voiceName: "dora_heart",
    audioFile: "audio/gentleman.wav",
    elemId: "scene-gentleman",
    statusText: "Gentleman coordinando a la cuadrilla...",
    text: "Entendido, Jefe. Pongo a la cuadrilla en marcha. Dora, relevá el terreno. Alex y Santa, atentos.",
    pitch: 0.95,
    rate: 1.05,
    synthTone: 320,
    avatarSvg: `<rect x="6" y="10" width="36" height="30"/><line x1="6" y1="10" x2="24" y2="4"/><line x1="42" y1="10" x2="24" y2="4"/><rect x="14" y="20" width="8" height="8" fill="currentColor"/><circle cx="32" cy="24" r="5" stroke-width="3"/><line x1="32" y1="14" x2="32" y2="34"/>`,
  },
  dora: {
    key: "dora",
    name: "Dora",
    role: "Exploradora // ef_dora",
    voiceName: "ef_dora",
    audioFile: "audio/dora.wav",
    elemId: "scene-dora",
    statusText: "Dora explorando playground/validador...",
    text: "A la orden, Gentleman. Jefe, me pongo a explorar el terreno. Alex, te dejo la cancha lista.",
    pitch: 1.25,
    rate: 1.15,
    synthTone: 520,
    avatarSvg: `<polygon points="24,4 44,24 24,44 4,24"/><polygon points="24,12 36,24 24,36 12,24"/><rect x="21" y="21" width="6" height="6" fill="currentColor"/>`,
  },
  alex: {
    key: "alex",
    name: "Alex",
    role: "Programador // em_alex",
    voiceName: "em_alex",
    audioFile: "audio/alex.wav",
    elemId: "scene-alex",
    statusText: "Alex implementando validador.js y tests...",
    text: "Recibido Dora, tomo la posta. Jefe, arranco con la implementación. Santa, pasale la lupa y fijate si no rompí nada.",
    pitch: 1.05,
    rate: 1.1,
    synthTone: 440,
    avatarSvg: `<rect x="6" y="8" width="36" height="12"/><rect x="18" y="20" width="12" height="22"/><rect x="22" y="24" width="4" height="4" fill="currentColor"/>`,
  },
  santa: {
    key: "santa",
    name: "Santa",
    role: "Auditor // em_santa",
    voiceName: "em_santa",
    audioFile: "audio/santa.wav",
    elemId: "scene-santa",
    statusText: "Santa auditando con lupa y corriendo tests...",
    text: "A ver qué hiciste, Alex... Jefe, voy a auditar con lupa. Todo verificado y aprobado para el Jefe.",
    pitch: 0.75,
    rate: 0.95,
    synthTone: 220,
    avatarSvg: `<circle cx="20" cy="20" r="14" stroke-width="3"/><rect x="17" y="17" width="6" height="6" fill="currentColor"/><line x1="30" y1="30" x2="44" y2="44" stroke-width="5"/>`,
  },
};

const SCENES_ORDER = ["gentleman", "dora", "alex", "santa"];

// Generador de iconos SVG brutalistas
const ICONS = {
  play: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="3,2 14,8 3,14"/></svg>`,
  stop: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><rect x="2" y="2" width="12" height="12"/></svg>`,
  audio: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><polygon points="2,5 6,5 11,1 11,15 6,11 2,11"/><rect x="13" y="4" width="2" height="8"/></svg>`,
  mic: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="1" width="6" height="8" fill="currentColor"/><path d="M3 6v2a5 5 0 0 0 10 0V6"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="5" y1="15" x2="11" y2="15"/></svg>`,
  theme: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>`,
};

// Web Audio Context & Analyser
let audioCtx = null;
let analyser = null;
let currentAudioPlayer = null;
let currentSource = null;
let isPlayingSequence = false;
let currentSceneIndex = 0;
let activeAgentKey = null;

// MediaRecorder state
let mediaRecorder = null;
let recordedChunks = [];
let isRecordingVideo = false;

function getAudioContext() {
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
  return audioCtx;
}

// Canvas Audio Wave Visualizer (Gentleman-Sexy-Djr palette)
function drawWaveform() {
  const canvas = document.getElementById("wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const isAudioPlaying = currentAudioPlayer && !currentAudioPlayer.paused;

  if (!analyser || (!isPlayingSequence && !isAudioPlaying)) {
    // Línea base en reposo
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#723C54";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    requestAnimationFrame(drawWaveform);
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

    // Gradiente en colores Gentleman-Sexy-Djr
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, "#E02B70"); // deepPink
    gradient.addColorStop(0.5, "#FF4F9A"); // activePink
    gradient.addColorStop(1, "#F0D28A"); // champagne

    ctx.fillStyle = gradient;
    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }

  requestAnimationFrame(drawWaveform);
}

// Generador de tono retro con Web Audio API
function playRetroTone(freq = 440, duration = 0.15, type = "square") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function updateHUD(data) {
  const hudAvatar = document.getElementById("hud-avatar");
  const hudName = document.getElementById("hud-name");
  const hudRole = document.getElementById("hud-role");
  const widgetVoice = document.getElementById("widget-active-voice");
  const widgetStatus = document.getElementById("widget-status-label");
  const speakerHud = document.getElementById("speaker-hud");
  const voiceBtn = document.getElementById("widget-voice-btn");

  if (hudName) hudName.textContent = data.name;
  if (hudRole) hudRole.textContent = data.role;
  if (widgetVoice) widgetVoice.textContent = `ON (${data.voiceName})`;
  if (widgetStatus) widgetStatus.textContent = data.statusText;
  if (speakerHud) speakerHud.classList.add("speaking");
  if (voiceBtn) voiceBtn.classList.add("speaking-now");

  if (hudAvatar && data.avatarSvg) {
    hudAvatar.innerHTML = `<svg viewBox="0 0 48 48" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square">${data.avatarSvg}</svg>`;
  }

  document.querySelectorAll(".scene-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.getAttribute("data-scene") === data.key);
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

function stopCurrentSpeech() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
    } catch {}
    currentAudioPlayer = null;
  }
  if (currentSource) {
    try {
      currentSource.disconnect();
    } catch {}
    currentSource = null;
  }

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (activeAgentKey) {
    const prevCard = document.querySelector(`.agent-card[data-agent="${activeAgentKey}"]`);
    if (prevCard) {
      prevCard.classList.remove("card-playing");
      const btn = prevCard.querySelector(".btn-voice-play");
      if (btn) btn.innerHTML = `${ICONS.play} <span class="btn-text">ESCUCHAR A ${activeAgentKey.toUpperCase()}</span>`;
    }
    activeAgentKey = null;
  }
}

// Fallback por Web Speech API si el archivo de audio falla
function fallbackSpeechSynthesis(data, card, agentKey, onEndCallback) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(data.text);
    utterance.lang = "es-ES";
    utterance.pitch = data.pitch;
    utterance.rate = data.rate;

    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith("es") || v.lang.startsWith("spa"));
    if (esVoice) utterance.voice = esVoice;

    const finish = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.innerHTML = `${ICONS.play} <span class="btn-text">ESCUCHAR A ${agentKey.toUpperCase()}</span>`;
      }
      activeAgentKey = null;
      if (typeof onEndCallback === "function") onEndCallback();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  } else {
    // Beeps si no hay sintetizador
    let step = 0;
    const interval = setInterval(() => {
      playRetroTone(data.synthTone + (step % 2 === 0 ? 40 : -40), 0.1, "sine");
      step++;
      if (step > 6) {
        clearInterval(interval);
        if (card) {
          card.classList.remove("card-playing");
          const btn = card.querySelector(".btn-voice-play");
          if (btn) btn.innerHTML = `${ICONS.play} <span class="btn-text">ESCUCHAR A ${agentKey.toUpperCase()}</span>`;
        }
        activeAgentKey = null;
        if (typeof onEndCallback === "function") onEndCallback();
      }
    }, 180);
  }
}

// Reproduce la voz original de un agente usando el audio de Kokoro
function speakAgent(agentKey, onEndCallback) {
  const data = CUADRILLA_DATA[agentKey];
  if (!data) return;

  stopCurrentSpeech();
  activeAgentKey = agentKey;

  const card = document.querySelector(`.agent-card[data-agent="${agentKey}"]`);
  if (card) {
    card.classList.add("card-playing");
    const btn = card.querySelector(".btn-voice-play");
    if (btn) btn.innerHTML = `${ICONS.stop} <span class="btn-text">DETENER</span>`;
  }

  // Actualizar HUD del simulador si está visible
  updateHUD(data);

  // Reproducir el archivo de audio real y conectarlo al osciloscopio
  if (data.audioFile) {
    const audio = new Audio(data.audioFile);
    currentAudioPlayer = audio;

    const ctx = getAudioContext();
    if (ctx && analyser) {
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        currentSource = source;
      } catch {}
    }

    const cleanup = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.innerHTML = `${ICONS.play} <span class="btn-text">ESCUCHAR A ${agentKey.toUpperCase()}</span>`;
      }
      activeAgentKey = null;
      currentAudioPlayer = null;
      if (typeof onEndCallback === "function") onEndCallback();
    };

    audio.onended = cleanup;
    audio.onerror = (e) => {
      console.warn(`[Pi Voice] Error cargando audio original ${data.audioFile}, activando fallback:`, e);
      fallbackSpeechSynthesis(data, card, agentKey, onEndCallback);
    };

    audio.play().catch((err) => {
      console.warn(`[Pi Voice] Error reproduciendo audio ${data.audioFile}:`, err);
      fallbackSpeechSynthesis(data, card, agentKey, onEndCallback);
    });
    return;
  }

  fallbackSpeechSynthesis(data, card, agentKey, onEndCallback);
}

// Reproduce una escena específica de la animación de terminal
function playTheaterScene(index, onComplete) {
  if (index >= SCENES_ORDER.length) {
    isPlayingSequence = false;
    resetHUD();
    const playBtn = document.getElementById("btn-play-theater");
    if (playBtn) playBtn.innerHTML = "▶ REPRODUCIR DE NUEVO";
    if (typeof onComplete === "function") onComplete();
    return;
  }

  getAudioContext();
  stopCurrentSpeech();

  currentSceneIndex = index;
  const key = SCENES_ORDER[index];
  const data = CUADRILLA_DATA[key];

  // Resaltar caja de escena en el terminal
  const sceneElem = document.getElementById(data.elemId);
  if (sceneElem) {
    sceneElem.classList.add("visible");
    document.querySelectorAll(".agent-msg-box").forEach((b) => b.classList.remove("active-speaking"));
    sceneElem.classList.add("active-speaking");

    const terminalBody = document.getElementById("terminal-body");
    if (terminalBody) {
      terminalBody.scrollTop = sceneElem.offsetTop - 60;
    }
  }

  updateHUD(data);

  speakAgent(key, () => {
    // Pausa conversacional entre agentes
    setTimeout(() => {
      if (isPlayingSequence) {
        playTheaterScene(index + 1, onComplete);
      }
    }, 450);
  });
}

function startFullTheater() {
  getAudioContext();
  isPlayingSequence = true;

  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) playBtn.innerHTML = "⏸ PAUSAR";

  // Ocultar todas las escenas para arrancar la secuencia limpia
  document.querySelectorAll(".agent-msg-box").forEach((b) => {
    b.classList.remove("visible", "active-speaking");
  });

  const terminalBody = document.getElementById("terminal-body");
  if (terminalBody) terminalBody.scrollTop = 0;

  playTheaterScene(0, () => {
    if (isRecordingVideo && mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  });
}

function pauseTheater() {
  isPlayingSequence = false;
  stopCurrentSpeech();
  resetHUD();
  const playBtn = document.getElementById("btn-play-theater");
  if (playBtn) playBtn.innerHTML = "▶ CONTINUAR";
}

function restartTheater() {
  isPlayingSequence = false;
  stopCurrentSpeech();
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
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      return;
    }

    try {
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
        btnRecord.innerHTML = "[REC] GRABAR VIDEO (.WEBM)";

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
      btnRecord.innerHTML = "[REC] GRABANDO... (CLIC PARA PARAR)";

      mediaRecorder.start();
      startFullTheater();
    } catch (err) {
      console.log("[Theater] Grabación cancelada:", err);
      btnRecord.classList.remove("recording");
      btnRecord.innerHTML = "[REC] GRABAR VIDEO (.WEBM)";
    }
  });
}

// Alias para retrocompatibilidad
const playCuadrillaChain = startFullTheater;

// Inicialización de Eventos DOM
document.addEventListener("DOMContentLoaded", () => {
  drawWaveform();

  // 1. Botón copiar snippet de instalación
  const btnCopy = document.getElementById("btn-copy-install");
  const cmdElem = document.getElementById("cmd-install");
  if (btnCopy && cmdElem) {
    btnCopy.addEventListener("click", () => {
      const textToCopy = cmdElem.textContent || "";
      navigator.clipboard.writeText(textToCopy).then(() => {
        const copyText = btnCopy.querySelector(".copy-text");
        if (copyText) {
          copyText.textContent = "[OK] COPIADO";
          btnCopy.style.background = "var(--c-green)";
          setTimeout(() => {
            copyText.textContent = "COPIAR";
            btnCopy.style.background = "";
          }, 2000);
        }
      });
      playRetroTone(880, 0.08, "triangle");
    });
  }

  // 2. Botón Test Audio Engine en Monitor Hero con audio original
  const btnTestSound = document.getElementById("btn-trigger-test-sound");
  if (btnTestSound) {
    btnTestSound.addEventListener("click", () => {
      stopCurrentSpeech();
      const testAudio = new Audio("audio/test-engine.wav");
      currentAudioPlayer = testAudio;
      btnTestSound.innerHTML = `${ICONS.audio} REPRODUCIENDO...`;

      const ctx = getAudioContext();
      if (ctx && analyser) {
        try {
          const source = ctx.createMediaElementSource(testAudio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          currentSource = source;
        } catch {}
      }

      const resetBtn = () => {
        btnTestSound.innerHTML = `${ICONS.play} TEST AUDIO ENGINE`;
        currentAudioPlayer = null;
      };

      testAudio.onended = resetBtn;
      testAudio.onerror = () => {
        resetBtn();
        playRetroTone(440, 0.1, "square");
        setTimeout(() => playRetroTone(660, 0.1, "square"), 100);
        setTimeout(() => playRetroTone(880, 0.18, "square"), 200);
      };

      testAudio.play().catch(() => {
        resetBtn();
      });
    });
  }

  // 3. Soundboard botones individuales de agentes
  const playButtons = document.querySelectorAll(".btn-voice-play");
  playButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const voiceKey = target.getAttribute("data-voice");
      if (activeAgentKey === voiceKey) {
        stopCurrentSpeech();
      } else {
        speakAgent(voiceKey);
      }
    });
  });

  // 4. Botón reproducir diálogo completo
  const btnPlayAll = document.getElementById("btn-play-all-cuadrilla");
  if (btnPlayAll) {
    btnPlayAll.addEventListener("click", () => {
      startFullTheater();
    });
  }

  // 5. Controles de animación de terminal (Theater)
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

  // Píldoras de salto de escena
  document.querySelectorAll(".scene-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const sceneKey = pill.getAttribute("data-scene");
      const idx = SCENES_ORDER.indexOf(sceneKey);
      if (idx !== -1) {
        isPlayingSequence = true;
        const pBtn = document.getElementById("btn-play-theater");
        if (pBtn) pBtn.innerHTML = "⏸ PAUSAR";
        playTheaterScene(idx);
      }
    });
  });

  // 6. Botones interactivos de la barra de widget de Pi
  const widgetStopBtn = document.getElementById("sim-btn-stop") || document.getElementById("widget-stop-btn");
  if (widgetStopBtn) {
    widgetStopBtn.addEventListener("click", () => {
      pauseTheater();
      stopCurrentSpeech();
      const stopText = widgetStopBtn.querySelector("span") || widgetStopBtn;
      stopText.textContent = "¡Detenido!";
      playRetroTone(200, 0.15, "sawtooth");
      setTimeout(() => {
        stopText.textContent = "Parar";
      }, 1200);
    });
  }

  const widgetVoiceBtn = document.getElementById("sim-btn-voice") || document.getElementById("widget-voice-btn");
  let voiceActive = true;
  if (widgetVoiceBtn) {
    widgetVoiceBtn.addEventListener("click", () => {
      voiceActive = !voiceActive;
      const voiceSpan = document.getElementById("widget-active-voice");
      if (voiceSpan) voiceSpan.textContent = voiceActive ? "ON (dora_heart)" : "OFF (silencio)";
      playRetroTone(voiceActive ? 600 : 300, 0.1, "square");
    });
  }

  const widgetVolBtn = document.getElementById("sim-btn-volume") || document.getElementById("widget-vol-btn");
  const widgetVolVal = document.getElementById("widget-vol-val");
  const volumes = ["100%", "120%", "150%", "50%", "0% [MUTE]"];
  let volIndex = 0;
  if (widgetVolBtn && widgetVolVal) {
    widgetVolBtn.addEventListener("click", () => {
      volIndex = (volIndex + 1) % volumes.length;
      widgetVolVal.textContent = volumes[volIndex];
      playRetroTone(350 + volIndex * 60, 0.08, "triangle");
    });
  }

  const widgetDictBtn = document.getElementById("sim-btn-record") || document.getElementById("widget-dict-btn");
  let isRecordingSTT = false;
  if (widgetDictBtn) {
    widgetDictBtn.addEventListener("click", () => {
      if (isRecordingSTT) return;
      isRecordingSTT = true;
      widgetDictBtn.textContent = "Grabando...";
      widgetDictBtn.style.color = "#FF6B8B";
      playRetroTone(700, 0.12, "sine");

      setTimeout(() => {
        isRecordingSTT = false;
        widgetDictBtn.textContent = "Dictar (Alt+R)";
        widgetDictBtn.style.color = "";
        playRetroTone(900, 0.15, "sine");

        const termBody = document.getElementById("terminal-body");
        if (termBody) {
          const newLine = document.createElement("div");
          newLine.className = "tool-artifact-box";
          newLine.innerHTML = `
            <div class="tool-header-line">[STT WHISPER] Transcripción capturada:</div>
            <div style="color: #FF4F9A; font-weight: 800;">"Jefe, la cuadrilla completó todas las tareas al 100%."</div>
          `;
          termBody.appendChild(newLine);
          termBody.scrollTop = termBody.scrollHeight;
        }
      }, 2400);
    });
  }

  // 7. Botón Dark Matrix Mode Toggle con persistencia
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    try {
      const savedTheme = localStorage.getItem("pi_voice_theme");
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        btnThemeToggle.innerHTML = `${ICONS.theme} LIGHT MODE`;
      }
    } catch {}

    btnThemeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      try {
        localStorage.setItem("pi_voice_theme", isDark ? "dark" : "light");
      } catch {}
      btnThemeToggle.innerHTML = isDark
        ? `${ICONS.theme} LIGHT MODE`
        : `${ICONS.theme} DARK MATRIX`;
      playRetroTone(isDark ? 800 : 400, 0.1, "square");
    });
  }

  setupVideoRecorder();
});
