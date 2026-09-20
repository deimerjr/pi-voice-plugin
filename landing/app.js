/**
 * PI VOICE PLUGIN — BRUTALIST LANDING INTERACTION (app.js)
 * Manejo de eventos, sintetizador Web Audio API, Web Speech API y simulador TUI.
 */

// Datos de la Cuadrilla para el Soundboard
const CUADRILLA_DATA = {
  gentleman: {
    name: "El Gentleman",
    role: "Orquestador",
    voiceName: "dora_heart",
    text: "Entendido, Jefe. Pongo a la cuadrilla en marcha. Dora, relevá el terreno. Alex y Santa, atentos.",
    pitch: 0.95,
    rate: 1.05,
    synthTone: 320,
  },
  dora: {
    name: "Dora",
    role: "Exploradora",
    voiceName: "ef_dora",
    text: "A la orden, Gentleman. Jefe, me pongo a explorar el terreno... Alex, te dejo la cancha lista.",
    pitch: 1.25,
    rate: 1.15,
    synthTone: 520,
  },
  alex: {
    name: "Alex",
    role: "Programador",
    voiceName: "em_alex",
    text: "Recibido Dora, tomo la posta. Jefe, arranco con la implementación... Santa, pasale la lupa y fijate si no rompí nada.",
    pitch: 1.05,
    rate: 1.1,
    synthTone: 440,
  },
  santa: {
    name: "Santa",
    role: "Auditor",
    voiceName: "em_santa",
    text: "A ver qué hiciste, Alex... Jefe, voy a auditar con lupa. Todo verificado y aprobado para el Jefe.",
    pitch: 0.75,
    rate: 0.95,
    synthTone: 220,
  },
};

// Web Audio Context Helper
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

// Sintetizador oral con Web Speech API
let activeUtterance = null;
let activeAgentKey = null;

function stopCurrentSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
  if (activeAgentKey) {
    const prevCard = document.querySelector(`.agent-card[data-agent="${activeAgentKey}"]`);
    if (prevCard) {
      prevCard.classList.remove("card-playing");
      const btn = prevCard.querySelector(".btn-voice-play");
      if (btn) btn.textContent = `▶ ESCUCHAR A ${activeAgentKey.toUpperCase()}`;
    }
    activeAgentKey = null;
  }
}

function speakAgent(agentKey, onEndCallback) {
  const data = CUADRILLA_DATA[agentKey];
  if (!data) return;

  stopCurrentSpeech();
  activeAgentKey = agentKey;

  const card = document.querySelector(`.agent-card[data-agent="${agentKey}"]`);
  if (card) {
    card.classList.add("card-playing");
    const btn = card.querySelector(".btn-voice-play");
    if (btn) btn.textContent = "⏹ DETENER";
  }

  // Tono de apertura de canal
  playRetroTone(data.synthTone, 0.12, "sawtooth");

  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(data.text);
    utterance.lang = "es-ES";
    utterance.pitch = data.pitch;
    utterance.rate = data.rate;

    // Intentar buscar voces en español disponibles
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith("es") || v.lang.startsWith("spa"));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onend = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.textContent = `▶ ESCUCHAR A ${agentKey.toUpperCase()}`;
      }
      activeAgentKey = null;
      if (typeof onEndCallback === "function") {
        onEndCallback();
      }
    };

    utterance.onerror = () => {
      if (card) {
        card.classList.remove("card-playing");
        const btn = card.querySelector(".btn-voice-play");
        if (btn) btn.textContent = `▶ ESCUCHAR A ${agentKey.toUpperCase()}`;
      }
      activeAgentKey = null;
      if (typeof onEndCallback === "function") {
        onEndCallback();
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } else {
    // Si no soporta speechSynthesis, simular locución con beeps rítmicos
    let step = 0;
    const interval = setInterval(() => {
      playRetroTone(data.synthTone + (step % 2 === 0 ? 40 : -40), 0.1, "sine");
      step++;
      if (step > 6) {
        clearInterval(interval);
        if (card) {
          card.classList.remove("card-playing");
          const btn = card.querySelector(".btn-voice-play");
          if (btn) btn.textContent = `▶ ESCUCHAR A ${agentKey.toUpperCase()}`;
        }
        activeAgentKey = null;
        if (typeof onEndCallback === "function") {
          onEndCallback();
        }
      }
    }, 180);
  }
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
          copyText.textContent = "✓ COPIADO!";
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

  // 2. Botón Test Audio Engine en Monitor Hero
  const btnTestSound = document.getElementById("btn-trigger-test-sound");
  if (btnTestSound) {
    btnTestSound.addEventListener("click", () => {
      playRetroTone(440, 0.1, "square");
      setTimeout(() => playRetroTone(660, 0.1, "square"), 100);
      setTimeout(() => playRetroTone(880, 0.18, "square"), 200);
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
  const simVolIcon = document.getElementById("sim-vol-icon");
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
      simStopBtn.textContent = "⏹️ ¡Detenido!";
      playRetroTone(200, 0.15, "sawtooth");
      setTimeout(() => {
        simStopBtn.textContent = "⏹️ Parar";
      }, 1200);
    });
  }

  // Botón Volumen cíclico
  const volumes = [
    { val: "100%", icon: "🔊" },
    { val: "120%", icon: "🔊" },
    { val: "150%", icon: "🔊" },
    { val: "50%", icon: "🔉" },
    { val: "0% (MUTE)", icon: "🔇" },
  ];
  let volIndex = 0;
  if (simVolBtn && simVolVal && simVolIcon) {
    simVolBtn.addEventListener("click", () => {
      volIndex = (volIndex + 1) % volumes.length;
      simVolVal.textContent = volumes[volIndex].val;
      simVolIcon.textContent = volumes[volIndex].icon;
      playRetroTone(350 + volIndex * 60, 0.08, "triangle");
    });
  }

  // Botón Dictar STT simulado
  let isRecording = false;
  if (simRecordBtn && termLog) {
    simRecordBtn.addEventListener("click", () => {
      if (isRecording) return;
      isRecording = true;
      simRecordBtn.textContent = "🔴 Grabando... (hablá)";
      simRecordBtn.style.color = "var(--c-pink)";
      playRetroTone(700, 0.12, "sine");

      setTimeout(() => {
        isRecording = false;
        simRecordBtn.textContent = "🎙️ Dictar";
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
        btnThemeToggle.textContent = "☀️ LIGHT MODE";
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
      btnThemeToggle.textContent = isDark ? "☀️ LIGHT MODE" : "🌙 DARK MATRIX";
      playRetroTone(isDark ? 800 : 400, 0.1, "square");
    });
  }
});
