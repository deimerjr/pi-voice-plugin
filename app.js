/**
 * PI VOICE PLUGIN — BRUTALIST LANDING INTERACTION (app.js)
 * Reproducción de audios reales generados con Kokoro TTS local,
 * Web Audio API para efectos, Web Speech API fallback y simulador TUI.
 * Estilo visual brutalista con iconos vectoriales de un solo tono sin emojis.
 */

// Datos de la Cuadrilla para el Soundboard con audios reales
const CUADRILLA_DATA = {
  gentleman: {
    name: "El Gentleman",
    role: "Orquestador",
    voiceName: "dora_heart",
    audioFile: "audio/gentleman.wav",
    text: "Entendido, Jefe. Pongo a la cuadrilla en marcha. Dora, relevá el terreno. Alex y Santa, atentos.",
    pitch: 0.95,
    rate: 1.05,
    synthTone: 320,
  },
  dora: {
    name: "Dora",
    role: "Exploradora",
    voiceName: "ef_dora",
    audioFile: "audio/dora.wav",
    text: "A la orden, Gentleman. Jefe, me pongo a explorar el terreno. Alex, te dejo la cancha lista.",
    pitch: 1.25,
    rate: 1.15,
    synthTone: 520,
  },
  alex: {
    name: "Alex",
    role: "Programador",
    voiceName: "em_alex",
    audioFile: "audio/alex.wav",
    text: "Recibido Dora, tomo la posta. Jefe, arranco con la implementación. Santa, pasale la lupa y fijate si no rompí nada.",
    pitch: 1.05,
    rate: 1.1,
    synthTone: 440,
  },
  santa: {
    name: "Santa",
    role: "Auditor",
    voiceName: "em_santa",
    audioFile: "audio/santa.wav",
    text: "A ver qué hiciste, Alex... Jefe, voy a auditar con lupa. Todo verificado y aprobado para el Jefe.",
    pitch: 0.75,
    rate: 0.95,
    synthTone: 220,
  },
};

// Generador de iconos SVG brutalistas
const ICONS = {
  play: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="3,2 14,8 3,14"/></svg>`,
  stop: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><rect x="2" y="2" width="12" height="12"/></svg>`,
  audio: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><polygon points="2,5 6,5 11,1 11,15 6,11 2,11"/><rect x="13" y="4" width="2" height="8"/></svg>`,
  mic: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="1" width="6" height="8" fill="currentColor"/><path d="M3 6v2a5 5 0 0 0 10 0V6"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="5" y1="15" x2="11" y2="15"/></svg>`,
  theme: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>`,
};

// Web Audio Context Helper para efectos
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
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
  } catch {
    // Audio context may be restricted before user gesture
  }
}

// Control de reproducción de audio
let currentAudioPlayer = null;
let activeAgentKey = null;

function stopCurrentSpeech() {
  if (currentAudioPlayer) {
    try {
      currentAudioPlayer.pause();
      currentAudioPlayer.currentTime = 0;
    } catch {
      // Ignorar
    }
    currentAudioPlayer = null;
  }

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignorar
    }
  }

  if (activeAgentKey) {
    const prevCard = document.querySelector(`.agent-card[data-agent="${activeAgentKey}"]`);
    if (prevCard) {
      prevCard.classList.remove("card-playing");
      const btn = prevCard.querySelector(".btn-voice-play");
      if (btn) btn.innerHTML = `${ICONS.play} ESCUCHAR A ${activeAgentKey.toUpperCase()}`;
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
    if (esVoice) {
      utterance.voice = esVoice;
    }

    const finish = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.innerHTML = `${ICONS.play} ESCUCHAR A ${agentKey.toUpperCase()}`;
      }
      activeAgentKey = null;
      if (typeof onEndCallback === "function") {
        onEndCallback();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  } else {
    // Beeps simulados si no hay sintetizador
    let step = 0;
    const interval = setInterval(() => {
      playRetroTone(data.synthTone + (step % 2 === 0 ? 40 : -40), 0.1, "sine");
      step++;
      if (step > 6) {
        clearInterval(interval);
        if (card) {
          card.classList.remove("card-playing");
          const btn = card.querySelector(".btn-voice-play");
          if (btn) btn.innerHTML = `${ICONS.play} ESCUCHAR A ${agentKey.toUpperCase()}`;
        }
        activeAgentKey = null;
        if (typeof onEndCallback === "function") {
          onEndCallback();
        }
      }
    }, 180);
  }
}

// Reproduce la voz original de un agente usando el audio generado por Kokoro
function speakAgent(agentKey, onEndCallback) {
  const data = CUADRILLA_DATA[agentKey];
  if (!data) return;

  stopCurrentSpeech();
  activeAgentKey = agentKey;

  const card = document.querySelector(`.agent-card[data-agent="${agentKey}"]`);
  if (card) {
    card.classList.add("card-playing");
    const btn = card.querySelector(".btn-voice-play");
    if (btn) btn.innerHTML = `${ICONS.stop} DETENER`;
  }

  // Reproducir el archivo de audio real
  if (data.audioFile) {
    const audio = new Audio(data.audioFile);
    currentAudioPlayer = audio;

    const cleanup = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.innerHTML = `${ICONS.play} ESCUCHAR A ${agentKey.toUpperCase()}`;
      }
      activeAgentKey = null;
      currentAudioPlayer = null;
      if (typeof onEndCallback === "function") {
        onEndCallback();
      }
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

// Reproducción en cadena de la Cuadrilla completa
function playCuadrillaChain() {
  const chain = ["gentleman", "dora", "alex", "santa"];
  let index = 0;

  const playNext = () => {
    if (index < chain.length) {
      const current = chain[index];
      index++;
      speakAgent(current, () => {
        setTimeout(playNext, 400);
      });
    }
  };

  playNext();
}

// Inicialización de Eventos DOM
document.addEventListener("DOMContentLoaded", () => {
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

  // 3. Soundboard botones individuales
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
      playCuadrillaChain();
    });
  }

  // 5. Simulador TUI interactivo
  const simVoiceBtn = document.getElementById("sim-btn-voice");
  const simVoiceState = document.getElementById("sim-voice-state");
  const simStopBtn = document.getElementById("sim-btn-stop");
  const simVolBtn = document.getElementById("sim-btn-volume");
  const simVolVal = document.getElementById("sim-vol-val");
  const simRecordBtn = document.getElementById("sim-btn-record");
  const termLog = document.querySelector(".term-log");

  // Alternar Voice ON / OFF
  let voiceActive = true;
  if (simVoiceBtn && simVoiceState) {
    simVoiceBtn.addEventListener("click", () => {
      voiceActive = !voiceActive;
      simVoiceState.textContent = voiceActive ? "ON" : "OFF";
      simVoiceState.style.color = voiceActive ? "var(--c-green)" : "#888";
      playRetroTone(voiceActive ? 600 : 300, 0.1, "square");
    });
  }

  // Botón Parar
  if (simStopBtn) {
    simStopBtn.addEventListener("click", () => {
      stopCurrentSpeech();
      const stopText = document.getElementById("sim-stop-text");
      if (stopText) stopText.textContent = "¡Detenido!";
      playRetroTone(200, 0.15, "sawtooth");
      setTimeout(() => {
        if (stopText) stopText.textContent = "Parar";
      }, 1200);
    });
  }

  // Botón Volumen cíclico
  const volumes = ["100%", "120%", "150%", "50%", "0% [MUTE]"];
  let volIndex = 0;
  if (simVolBtn && simVolVal) {
    simVolBtn.addEventListener("click", () => {
      volIndex = (volIndex + 1) % volumes.length;
      simVolVal.textContent = volumes[volIndex];
      playRetroTone(350 + volIndex * 60, 0.08, "triangle");
    });
  }

  // Botón Dictar STT simulado
  let isRecording = false;
  if (simRecordBtn && termLog) {
    simRecordBtn.addEventListener("click", () => {
      if (isRecording) return;
      isRecording = true;
      const recordText = document.getElementById("sim-record-text");
      if (recordText) recordText.textContent = "Grabando...";
      simRecordBtn.style.color = "var(--c-pink)";
      playRetroTone(700, 0.12, "sine");

      setTimeout(() => {
        isRecording = false;
        if (recordText) recordText.textContent = "Dictar";
        simRecordBtn.style.color = "";
        playRetroTone(900, 0.15, "sine");

        // Agregar línea simulada al log de la terminal
        const newLine = document.createElement("div");
        newLine.innerHTML = `
          <span class="log-prefix">whisper-stt &gt;</span> 
          <span style="color: var(--c-pink); font-weight: 800;">[Dictado transcrito]:</span> 
          "Jefe, revisá si los tests de la cuadrilla están pasando al 100%."
        `;
        termLog.appendChild(newLine);
      }, 2400);
    });
  }

  // 6. Botón Dark Matrix Mode Toggle con persistencia
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    try {
      const savedTheme = localStorage.getItem("pi_voice_theme");
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        btnThemeToggle.innerHTML = `${ICONS.theme} LIGHT MODE`;
      }
    } catch {
      // Ignorar restricciones en entornos aislados
    }

    btnThemeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      try {
        localStorage.setItem("pi_voice_theme", isDark ? "dark" : "light");
      } catch {
        // Ignorar
      }
      btnThemeToggle.innerHTML = isDark
        ? `${ICONS.theme} LIGHT MODE`
        : `${ICONS.theme} DARK MATRIX`;
      playRetroTone(isDark ? 800 : 400, 0.1, "square");
    });
  }
});
