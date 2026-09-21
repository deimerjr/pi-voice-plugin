import {
  Container,
  Text,
  SelectList,
  Spacer,
  matchesKey,
  Key,
  visibleWidth,
  type SelectItem,
  type SelectListTheme,
  type Theme,
  type TUI,
  type TuiMouseEvent,
  type TuiMouseEventResult,
} from "@earendil-works/pi-tui";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  ConfigManager,
  type VoicePluginConfig,
  type SpeechProviderType,
  type CodeFilterMode,
  type VoiceShortcutsConfig,
  type SubagentVoicesConfig,
  type TldrLevel,
} from "./config.ts";
import { AudioPlayer } from "./player.ts";
import { createTTSProvider } from "./providers/factory.ts";
import type { ConcurrencyMode } from "./lock.ts";

export type MenuScreen =
  | "main"
  | "voices"
  | "api_hub"
  | "volume"
  | "shortcuts"
  | "subagents"
  | "subagent_voice"
  | "subagent_name"
  | "tldr_level"
  | "speed"
  | "filter"
  | "user_title"
  | "concurrency";

export type SubagentRoleKey = "scout" | "worker" | "reviewer" | "orchestrator";

export interface VoiceOption {
  id: string;
  name: string;
  desc: string;
}

export const ROLE_LABELS: Record<SubagentRoleKey, string> = {
  scout: "Explorador / Scout",
  worker: "Programador / Worker",
  reviewer: "Auditor / Reviewer",
  orchestrator: "Orquestador / Principal",
};

export const OPENAI_VOICES: VoiceOption[] = [
  { id: "nova", name: "nova", desc: "Femenina, enérgica y natural" },
  { id: "alloy", name: "alloy", desc: "Neutra, clara y balanceada" },
  { id: "echo", name: "echo", desc: "Masculina, cálida y cercana" },
  { id: "fable", name: "fable", desc: "Expresiva, acento británico" },
  { id: "onyx", name: "onyx", desc: "Masculina, profunda y autoritaria" },
  { id: "shimmer", name: "shimmer", desc: "Femenina, brillante y nítida" },
  { id: "ash", name: "ash", desc: "Masculina suave y cotidiana" },
  { id: "sage", name: "sage", desc: "Neutra, serena y reposada" },
  { id: "coral", name: "coral", desc: "Femenina, cálida y amigable" },
];

export const KOKORO_VOICES: VoiceOption[] = [
  { id: "ef_dora", name: "Dora (Español)", desc: "Femenina, natural y fluida" },
  { id: "ximena", name: "Ximena (Español México)", desc: "Femenina cálida, melódica y suave con acento mexicano/latino" },
  { id: "em_alex", name: "Alex (Español)", desc: "Masculina, clara y cercana" },
  { id: "em_santa", name: "Santa (Español)", desc: "Masculina, tono narrador" },
  { id: "mateo", name: "Mateo (Español)", desc: "Masculina fresca, clara y natural (Híbrida Michael)" },
  { id: "adrian", name: "Adrián (Español)", desc: "Masculina cálida, profunda y segura (Híbrida Adam)" },
  { id: "fenrir_es", name: "Fenrir (Español)", desc: "Masculina profunda, autoritaria y cinematográfica (Híbrida)" },
  { id: "juan_carlos", name: "Juan Carlos (Clonada)", desc: "Masculina expresiva, enérgica y amistosa (Locutor)" },
  { id: "valeria", name: "Valeria (Clonada)", desc: "Femenina ejecutiva, dicción nítida y tono elegante (Clon ElevenLabs)" },
  { id: "lucia", name: "Lucía (Clonada)", desc: "Femenina ágil, articulación brillante y ritmo conversacional" },
  { id: "dora_heart", name: "Dora Heart (Híbrida)", desc: "Femenina cálida, prosodia fluida y presencia envolvente" },
  { id: "af_heart", name: "Heart (Inglés)", desc: "Femenina, máxima calidad y realismo" },
  { id: "af_nova", name: "Nova (Inglés)", desc: "Femenina, expresiva y enérgica" },
  { id: "af_alloy", name: "Alloy (Inglés)", desc: "Neutra, balanceada" },
  { id: "am_echo", name: "Echo (Inglés)", desc: "Masculina, cálida y conversacional" },
  { id: "am_fenrir", name: "Fenrir (Inglés)", desc: "Masculina, profunda y seria" },
  { id: "bf_emma", name: "Emma (Británico)", desc: "Femenina británica elegante" },
  { id: "bm_george", name: "George (Británico)", desc: "Masculina británica culta" },
];

export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calma y natural" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Enérgica y segura" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Suave y expresiva" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Masculina modulada" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", desc: "Masculina joven" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Masculina profunda" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Narrador profesional" },
];

export interface VoiceMenuOptions {
  configManager: ConfigManager;
  player: AudioPlayer;
  theme: Theme;
  tui: TUI;
  ctx: ExtensionContext;
  lastAssistantText?: string;
  initialScreen?: MenuScreen;
  onClose: () => void;
  onConfigChanged: (newConfig: VoicePluginConfig) => void;
  onDictate?: () => void;
}

class HorizontalLine {
  private colorFn: (s: string) => string;
  constructor(colorFn: (s: string) => string) {
    this.colorFn = colorFn;
  }
  render(width: number): string[] {
    return [this.colorFn("─".repeat(Math.max(10, width)))];
  }
  invalidate(): void {}
}

export class VoiceMenuComponent extends Container {
  private configManager: ConfigManager;
  private player: AudioPlayer;
  private theme: Theme;
  private tui: TUI;
  private ctx: ExtensionContext;
  private lastAssistantText?: string;
  private onClose: () => void;
  private onConfigChanged: (newConfig: VoicePluginConfig) => void;
  private onDictate?: () => void;

  private initialScreen: MenuScreen = "main";
  private currentScreen: MenuScreen = "main";
  private selectedSubagentRole?: SubagentRoleKey;
  private activeSelectList: SelectList | null = null;
  private statusNotice?: string;
  private isPreviewing: boolean = false;

  constructor(options: VoiceMenuOptions) {
    super();
    this.configManager = options.configManager;
    this.player = options.player;
    this.theme = options.theme;
    this.tui = options.tui;
    this.ctx = options.ctx;
    this.lastAssistantText = options.lastAssistantText;
    this.onClose = options.onClose;
    this.onConfigChanged = options.onConfigChanged;
    this.onDictate = options.onDictate;
    this.initialScreen = options.initialScreen || "main";
    this.currentScreen = this.initialScreen;

    this.renderScreen();
  }

  public override render(width: number): string[] {
    const rawLines = super.render(width);
    const safeWidth = Math.max(10, width);
    // Render with 100% solid, opaque pure black background (\x1b[48;2;0;0;0m)
    return rawLines.map((line) => {
      const len = visibleWidth(line);
      const pad = " ".repeat(Math.max(0, safeWidth - len));
      return `\x1b[48;2;0;0;0m${line}${pad}\x1b[49m`;
    });
  }

  public handleInput(keyData: string): void {
    if (
      matchesKey(keyData, "escape") ||
      matchesKey(keyData, Key.escape) ||
      matchesKey(keyData, "ctrl+c") ||
      keyData === "\x1b" ||
      keyData === "escape" ||
      keyData === "esc"
    ) {
      this.goBackOrClose();
      return;
    }

    if (this.activeSelectList) {
      this.activeSelectList.handleInput(keyData);
      this.tui.requestRender();
    }
  }

  public override handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    const result = super.handleMouse(event);
    if (result) {
      this.tui.requestRender();
    }
    return result;
  }

  private goBackOrClose(): void {
    if (
      this.currentScreen === "subagent_voice" ||
      this.currentScreen === "subagent_name" ||
      this.currentScreen === "user_title"
    ) {
      this.statusNotice = undefined;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }
    if (this.currentScreen === "concurrency" || this.currentScreen === "tldr_level") {
      this.statusNotice = undefined;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }
    if (this.currentScreen !== "main" && this.initialScreen !== this.currentScreen) {
      this.statusNotice = undefined;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }
    this.onClose();
  }

  private renderScreen(): void {
    this.clear();

    const config = this.configManager.getConfig();
    const selectTheme: SelectListTheme = {
      selectedPrefix: (t: string) => this.theme.fg("accent", t),
      selectedText: (t: string) => this.theme.fg("accent", this.theme.bold(t)),
      description: (t: string) => this.theme.fg("muted", t),
      scrollInfo: (t: string) => this.theme.fg("dim", t),
      noMatch: (t: string) => this.theme.fg("error", t),
    };

    // Top border
    this.addChild(new HorizontalLine((s: string) => this.theme.fg("accent", s)));

    // Header title (monochrome diamond)
    let titleText = "Menú de Voz (Pi CLI)";
    if (this.currentScreen === "voices") titleText = "Catálogo de Voces y Muestras";
    else if (this.currentScreen === "api_hub") titleText = "Configuración de APIs y Proveedores";
    else if (this.currentScreen === "volume") titleText = "Control de Volumen";
    else if (this.currentScreen === "shortcuts") titleText = "Atajos de Teclado y Teclas";
    else if (this.currentScreen === "subagents") titleText = "Voces de Agentes y Roles";
    else if (this.currentScreen === "subagent_voice") {
      const role = this.selectedSubagentRole || "scout";
      const roleLabel = ROLE_LABELS[role] || role;
      titleText = `Seleccionar Voz: ${roleLabel}`;
    }
    else if (this.currentScreen === "subagent_name") {
      const role = this.selectedSubagentRole || "scout";
      const roleLabel = ROLE_LABELS[role] || role;
      titleText = `Nombre para ${roleLabel}`;
    }
    else if (this.currentScreen === "tldr_level") titleText = "Nivel de Resumen TL;DR";
    else if (this.currentScreen === "user_title") titleText = "Apelativo de Usuario (Modo Cuadrilla)";
    else if (this.currentScreen === "speed") titleText = "Velocidad de Locución";
    else if (this.currentScreen === "filter") titleText = "Filtro de Código y Formato";
    else if (this.currentScreen === "concurrency") titleText = "Concurrencia de Audio entre Sesiones";

    this.addChild(
      new Text(this.theme.fg("accent", this.theme.bold(` ◈ ${titleText} `)), 0, 0)
    );

    // Status notice or subtitle
    if (this.statusNotice) {
      this.addChild(new Text(this.theme.fg("warning", ` ℹ ${this.statusNotice}`), 0, 0));
    } else {
      const activeVoice =
        config.provider === "openai"
          ? config.openai.voice
          : config.provider === "kokoro"
          ? config.kokoro.voice
          : config.provider === "elevenlabs"
          ? config.elevenlabs.voiceId
          : "custom";
      const volPct = Math.round((config.volume ?? 1.0) * 100);
      const statusLine = ` [TTS: ${config.provider} (${activeVoice}) • STT: ${
        config.stt?.provider || "openai"
      } • Auto: ${config.autoRead ? "ON" : "OFF"} • TL;DR: ${
        config.tldr ? "ON" : "OFF"
      } • Vol: ${volPct}%]`;
      this.addChild(new Text(this.theme.fg("dim", statusLine), 0, 0));
    }

    this.addChild(new Spacer(1));

    // Build items for current screen
    const items = this.getItemsForScreen(config);
    const maxVisible = Math.min(items.length, 12);

    const selectLayout = {
      minPrimaryColumnWidth: 38,
      maxPrimaryColumnWidth: 54,
    };
    const list = new SelectList(items, maxVisible, selectTheme, selectLayout);
    list.onSelect = (selectedItem: SelectItem) => {
      this.handleItemSelection(selectedItem.value);
    };
    list.onCancel = () => {
      this.goBackOrClose();
    };

    this.activeSelectList = list;
    this.addChild(list);

    // Footer hints
    this.addChild(new Spacer(1));
    this.addChild(
      new Text(
        this.theme.fg(
          "dim",
          "  ↑/↓ Navegar • Enter Seleccionar • Esc Volver / Cerrar"
        ),
        0,
        0
      )
    );
    this.addChild(new HorizontalLine((s: string) => this.theme.fg("accent", s)));
  }

  private getItemsForScreen(config: VoicePluginConfig): SelectItem[] {
    switch (this.currentScreen) {
      case "main": {
        const activeVoice =
          config.provider === "openai"
            ? config.openai.voice
            : config.provider === "kokoro"
            ? config.kokoro.voice
            : config.provider === "elevenlabs"
            ? config.elevenlabs.voiceId
            : "custom";
        const volPct = Math.round((config.volume ?? 1.0) * 100);

        return [
          {
            value: "toggle_autoread",
            label: `${config.autoRead ? "●" : "○"} Auto-lectura: ${config.autoRead ? "ACTIVADA" : "DESACTIVADA"}`,
            description: "Lee automáticamente cada respuesta generada",
          },
          {
            value: "toggle_tldr",
            label: `${config.tldr ? "●" : "○"} Modo Resumen (TL;DR): ${config.tldr ? "ACTIVADO (Resumen breve)" : "DESACTIVADO (Lectura completa)"}`,
            description: config.tldr
              ? "Sintetiza respuestas extensas en 1 o 2 frases antes de hablar"
              : "Lee las respuestas completas palabra por palabra sin resumir",
          },
          {
            value: "goto_tldr_level",
            label: `▸ Nivel de Resumen: [ ${
              (config.tldrLevel || "medium") === "high"
                ? "Alto"
                : (config.tldrLevel || "medium") === "low"
                ? "Bajo"
                : "Medio"
            } ]`,
            description: "Ajustar nivel de detalle y síntesis para TL;DR (Alto, Medio, Bajo)",
          },
          {
            value: "trigger_dictate",
            label: "▸ Dictar Prompt por Voz",
            description: "Hablá por el micrófono y Pi transcribirá tu mensaje [Alt+R]",
          },
          {
            value: "goto_voices",
            label: "◆ Catálogo de Voces...",
            description: `Voz actual: ${activeVoice} • Escuchá muestras en vivo`,
          },
          {
            value: "goto_api_hub",
            label: "◆ APIs y Proveedores (TTS / STT)...",
            description: "Servicios de voz saliente y dictado por micrófono",
          },
          {
            value: "goto_volume",
            label: `◆ Control de Volumen (${volPct}%)...`,
            description: "Ajustar volumen de la locución (0% a 150%)",
          },
          {
            value: "goto_shortcuts",
            label: "◆ Atajos de Teclado...",
            description: "Personalizar teclas para dictar, parar, volumen y menú",
          },
          {
            value: "goto_subagents",
            label: "◆ Voces de Agentes y Roles...",
            description: "Personalizar voz y avisos para Scout, Worker y Reviewer",
          },
          {
            value: "goto_speed",
            label: `◆ Velocidad de habla (${config.openai.speed}x)...`,
            description: "Ajustar rapidez de locución",
          },
          {
            value: "goto_filter",
            label: `◆ Filtro de código (${config.filterCode})...`,
            description: "Omitir código, mencionar bloques o leer todo",
          },
          {
            value: "goto_concurrency",
            label: `◆ Concurrencia entre sesiones (${config.concurrency ?? "queue"})...`,
            description: "Coordinar audio entre múltiples sesiones (cola FIFO, interrupción, foco o apagado)",
          },
          {
            value: "read_last",
            label: "▸ Leer última respuesta",
            description: "Reproducir la última respuesta por audio",
          },
          {
            value: "stop_audio",
            label: "■ Detener audio en curso",
            description: "Cortar el audio en reproducción de inmediato [Alt+S]",
          },
          {
            value: "close",
            label: "✕ Cerrar Menú",
            description: "Salir a la terminal de Pi CLI [Esc]",
          },
        ];
      }

      case "api_hub": {
        const ttsKeyConfigured = Boolean(this.configManager.getActiveApiKey());
        const sttKeyConfigured = Boolean(this.configManager.getActiveSTTApiKey());
        const sttProv = config.stt?.provider || "openai";

        return [
          {
            value: "api_tts_provider",
            label: `● [TTS] Proveedor Saliente: ${config.provider}`,
            description: "Clic para alternar: kokoro (Local), openai, elevenlabs, custom",
          },
          {
            value: "api_tts_key",
            label: `○ [TTS] Clave API TTS: ${
              config.provider === "kokoro"
                ? "No requerida (Local)"
                : ttsKeyConfigured
                ? "Configurada"
                : "No configurada"
            }`,
            description: "Ingresar o actualizar API Key de OpenAI o ElevenLabs",
          },
          {
            value: "api_tts_url",
            label: `○ [TTS] URL Endpoint Custom: ${config.custom.url}`,
            description: "Editar URL de servidor TTS local o custom",
          },
          {
            value: "api_tts_method",
            label: `○ [TTS] Método Custom: ${config.custom.method}`,
            description: "Alternar método HTTP (POST o GET)",
          },
          {
            value: "api_stt_provider",
            label: `● [STT] Proveedor Dictado: ${sttProv}`,
            description: "Clic para alternar: openai (Whisper), groq, custom",
          },
          {
            value: "api_stt_key",
            label: `○ [STT] Clave API STT: ${sttKeyConfigured ? "Configurada" : "No configurada"}`,
            description: "Ingresar clave de API para Whisper (OpenAI / Groq)",
          },
          {
            value: "api_stt_url",
            label: `○ [STT] URL Endpoint STT: ${config.stt?.baseUrl || "https://api.openai.com/v1"}`,
            description: "Editar URL de API para transcripción",
          },
          {
            value: "api_stt_model",
            label: `○ [STT] Modelo STT: ${config.stt?.model || "whisper-1"}`,
            description: "Cambiar modelo (ej: whisper-1, whisper-large-v3-turbo)",
          },
          {
            value: "api_stt_lang",
            label: `○ [STT] Idioma Dictado: ${config.stt?.language || "es"}`,
            description: "Cambiar código de idioma (ej: es, en)",
          },
          {
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }

      case "voices": {
        if (config.provider === "openai") {
          const items: SelectItem[] = OPENAI_VOICES.map((v) => {
            const isCurrent = config.openai.voice === v.id;
            return {
              value: `voice:${v.id}`,
              label: `${isCurrent ? "● " : "○ "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar y activar]`,
            };
          });

          items.push({
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else if (config.provider === "kokoro") {
          const items: SelectItem[] = KOKORO_VOICES.map((v) => {
            const isCurrent = config.kokoro.voice === v.id;
            return {
              value: `voice:${v.id}`,
              label: `${isCurrent ? "● " : "○ "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar y activar]`,
            };
          });

          items.push({
            value: "kokoro_custom_voice",
            label: "▸ Crear voz personalizada o mezclar (Blend)...",
            description: "Ingresá un nombre guardado o fórmula (ej: ef_dora:0.6,af_heart:0.4)",
          });
          items.push({
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else if (config.provider === "elevenlabs") {
          const items: SelectItem[] = ELEVENLABS_VOICES.map((v) => {
            const isCurrent = config.elevenlabs.voiceId === v.id;
            return {
              value: `voice:${v.id}`,
              label: `${isCurrent ? "● " : "○ "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar y activar]`,
            };
          });

          items.push({
            value: "eleven_custom_id",
            label: "▸ Ingresar otro Voice ID de ElevenLabs...",
            description: "Ingresar el ID de una voz clonada o diseñada",
          });
          items.push({
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else {
          return [
            {
              value: "custom_test_voice",
              label: "▸ Probar síntesis con Custom API",
              description: "Envía una muestra al endpoint configurado",
            },
            {
              value: "back",
              label: "⬅ Volver al menú principal",
              description: "Regresar a las opciones principales",
            },
          ];
        }
      }

      case "volume": {
        const currentPct = Math.round((config.volume ?? 1.0) * 100);
        const presets = [
          { pct: 150, desc: "Volumen amplificado (potenciado)" },
          { pct: 100, desc: "Volumen estándar recomendado" },
          { pct: 80, desc: "Volumen alto y claro" },
          { pct: 60, desc: "Volumen moderado / balanceado" },
          { pct: 40, desc: "Volumen bajo / discreto" },
          { pct: 20, desc: "Volumen suave" },
          { pct: 0, desc: "Silencio total (0%)" },
        ];

        const items: SelectItem[] = presets.map((p) => ({
          value: `set_vol:${p.pct}`,
          label: `${currentPct === p.pct ? "● " : "○ "}${p.pct}%`,
          description: `${p.desc} • [Clic para seleccionar]`,
        }));

        items.push({
          value: "volume_custom_input",
          label: "▸ Ingresar porcentaje personalizado...",
          description: "Escribir cualquier valor entre 0 y 150",
        });

        items.push({
          value: "back",
          label: "⬅ Volver",
          description: "Regresar al menú",
        });
        return items;
      }

      case "shortcuts": {
        const sc = config.shortcuts || {
          menu: "alt+v",
          stop: "alt+s",
          record: "alt+r",
          volumeUp: "alt+up",
          volumeDown: "alt+down",
        };

        return [
          {
            value: "change_sc:record",
            label: `▸ Dictado de voz: [ ${sc.record} ]`,
            description: "Clic para cambiar la tecla de inicio/parada de dictado",
          },
          {
            value: "change_sc:stop",
            label: `▸ Detener audio: [ ${sc.stop} ]`,
            description: "Clic para cambiar la tecla de parada inmediata de audio",
          },
          {
            value: "change_sc:menu",
            label: `▸ Abrir Menú: [ ${sc.menu} ]`,
            description: "Clic para cambiar la tecla de acceso rápido al menú",
          },
          {
            value: "change_sc:volumeUp",
            label: `▸ Subir volumen: [ ${sc.volumeUp} ]`,
            description: "Clic para cambiar la tecla para subir volumen (+10%)",
          },
          {
            value: "change_sc:volumeDown",
            label: `▸ Bajar volumen: [ ${sc.volumeDown} ]`,
            description: "Clic para cambiar la tecla para bajar volumen (-10%)",
          },
          {
            value: "reset_shortcuts",
            label: "🔄 Restaurar atajos por defecto (Alt+R, Alt+S, etc.)",
            description: "Reestablece las combinaciones recomendadas",
          },
          {
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }

      case "tldr_level": {
        const current = config.tldrLevel || "medium";
        const levels: { level: TldrLevel; title: string; desc: string }[] = [
          {
            level: "high",
            title: "Alto: 1 frase (Máxima síntesis, ~25 palabras)",
            desc: "Ideal para escuchar solo la conclusión directa más importante",
          },
          {
            level: "medium",
            title: "Medio: 2-3 frases (Resumen ejecutivo balanceado)",
            desc: "Equilibrio óptimo entre contexto y brevedad (Predeterminado)",
          },
          {
            level: "low",
            title: "Bajo: 80-90% detalle (Alta fidelidad)",
            desc: "Conserva párrafos y detalles técnicos casi como la respuesta original",
          },
        ];

        const items: SelectItem[] = levels.map((l) => ({
          value: `set_tldr_level:${l.level}`,
          label: `${current === l.level ? "● " : "○ "}${l.title}`,
          description: l.desc,
        }));

        items.push({
          value: "back",
          label: "⬅ Volver al menú principal",
          description: "Regresar a las opciones principales",
        });

        return items;
      }

      case "subagents": {
        const sub = config.subagents || {
          enabled: true,
          crewMode: true,
          announceStart: true,
          announceEnd: true,
          announceOrchestratorPhases: true,
          announceTests: true,
          orchestrator: "dora_heart",
          scout: "ef_dora",
          worker: "em_alex",
          reviewer: "em_santa",
          userTitle: "Jefe",
        };

        return [
          {
            value: "sub_toggle_enabled",
            label: `${sub.enabled ? "●" : "○"} Voces de Agentes: ${sub.enabled ? "ACTIVADO" : "DESACTIVADO"}`,
            description: "Activa voces diferenciadas para cada subagente",
          },
          {
            value: "goto_user_title",
            label: `▸ Apelativo / Título: [ ${sub.userTitle || "Jefe"} ]`,
            description: "Cómo te llaman los agentes (Jefe, Comandante, Líder, etc.)",
          },
          {
            value: "sub_name:scout",
            label: `▸ Nombre de Explorador: [ ${sub.scoutName || "Dora"} ]`,
            description: "Personalizar el nombre para el rol de exploración",
          },
          {
            value: "sub_name:worker",
            label: `▸ Nombre de Programador: [ ${sub.workerName || "Alex"} ]`,
            description: "Personalizar el nombre para el rol de implementación",
          },
          {
            value: "sub_name:reviewer",
            label: `▸ Nombre de Auditor: [ ${sub.reviewerName || "Santa"} ]`,
            description: "Personalizar el nombre para el rol de verificación",
          },
          {
            value: "sub_name:orchestrator",
            label: `▸ Nombre de Orquestador: [ ${sub.orchestratorName || "el Gentleman"} ]`,
            description: "Personalizar el nombre para el orquestador principal",
          },
          {
            value: "sub_toggle_start",
            label: `${sub.announceStart ? "●" : "○"} Anunciar inicio de tarea: ${sub.announceStart ? "SÍ" : "NO"}`,
            description: "Locución oral cuando un subagente empieza a trabajar",
          },
          {
            value: "sub_toggle_end",
            label: `${sub.announceEnd ? "●" : "○"} Anunciar fin y resumen: ${sub.announceEnd ? "SÍ" : "NO"}`,
            description: "Síntesis oral de lo logrado al terminar cada tarea",
          },
          {
            value: "sub_toggle_orchestrator_phases",
            label: `${sub.announceOrchestratorPhases ?? true ? "●" : "○"} Fases del Orquestador: ${sub.announceOrchestratorPhases ?? true ? "SÍ" : "NO"}`,
            description: "Locución de cada fase de trabajo cuando el orquestador trabaja directo",
          },
          {
            value: "sub_toggle_tests",
            label: `${sub.announceTests ?? true ? "●" : "○"} Anunciar pruebas de verificación: ${sub.announceTests ?? true ? "SÍ" : "NO"}`,
            description: "Locución oral al ejecutar tests en consola sin subagentes",
          },
          {
            value: "sub_voice:scout",
            label: `▸ Explorador / Scout: [ ${sub.scout} ]`,
            description: "Voz en español para exploración y mapeo",
          },
          {
            value: "sub_voice:worker",
            label: `▸ Programador / Worker: [ ${sub.worker} ]`,
            description: "Voz en español para implementación y código",
          },
          {
            value: "sub_voice:reviewer",
            label: `▸ Auditor / Reviewer: [ ${sub.reviewer} ]`,
            description: "Voz en español para verificación y tests",
          },
          {
            value: "sub_voice:orchestrator",
            label: `▸ Orquestador / Principal: [ ${sub.orchestrator} ]`,
            description: "Voz principal para el Gentleman",
          },
          {
            value: "sub_reset",
            label: "🔄 Restaurar voces y nombres por defecto",
            description: "Dora, Alex, Santa y el Gentleman",
          },
          {
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }

      case "subagent_voice": {
        const role = this.selectedSubagentRole || "scout";
        const currentVoice = config.subagents?.[role] || "";

        let voiceList: VoiceOption[] = [];
        if (config.provider === "kokoro") {
          voiceList = KOKORO_VOICES;
        } else if (config.provider === "openai") {
          voiceList = OPENAI_VOICES;
        } else if (config.provider === "elevenlabs") {
          voiceList = ELEVENLABS_VOICES;
        }

        const items: SelectItem[] = voiceList.map((v) => {
          const isAssigned = currentVoice === v.id;
          return {
            value: `set_sub_voice:${role}:${v.id}`,
            label: `${isAssigned ? "● " : "○ "}${v.name}`,
            description: `${v.desc} • [Clic: activar y escuchar]`,
          };
        });

        items.push({
          value: `custom_sub_voice:${role}`,
          label: "✏️ Voz personalizada o fórmula manual...",
          description: `Ingresar nombre o mezcla Kokoro (actual: ${currentVoice})`,
        });

        items.push({
          value: "back_to_subagents",
          label: "⬅ Volver a Voces de Agentes",
          description: "Regresar a la configuración de subagentes",
        });

        return items;
      }

      case "subagent_name": {
        const sub = config.subagents || {};
        const role = this.selectedSubagentRole || "scout";
        const roleLabel = ROLE_LABELS[role] || role;
        const currentName =
          role === "scout"
            ? sub.scoutName || "Dora"
            : role === "worker"
            ? sub.workerName || "Alex"
            : role === "reviewer"
            ? sub.reviewerName || "Santa"
            : sub.orchestratorName || "el Gentleman";

        let presets: string[] = [];
        if (role === "scout") {
          presets = ["Dora", "Scout", "Hermes", "Atlas", "Ariadna"];
        } else if (role === "worker") {
          presets = ["Alex", "Worker", "Hermes", "Ciro", "Vulcano"];
        } else if (role === "reviewer") {
          presets = ["Santa", "Reviewer", "Minos", "Argos", "Auditor"];
        } else if (role === "orchestrator") {
          presets = ["el Gentleman", "Gentleman", "Director", "Arquitecto", "Orquestador"];
        }

        const items: SelectItem[] = presets.map((preset) => {
          const isSelected = currentName.trim().toLowerCase() === preset.toLowerCase();
          return {
            value: `set_sub_name:${role}:${preset}`,
            label: `${isSelected ? "●" : "○"} ${preset}`,
            description: isSelected
              ? `Nombre actualmente asignado (${preset})`
              : `Asignar nombre "${preset}" al rol de ${roleLabel}`,
          };
        });

        items.push({
          value: `custom_sub_name:${role}`,
          label: "✏️ Nombre personalizado...",
          description: `Ingresar un nombre libre (actual: ${currentName})`,
        });

        items.push({
          value: "back_to_subagents",
          label: "⬅ Volver a Voces de Agentes",
          description: "Regresar a la configuración de subagentes",
        });

        return items;
      }

      case "user_title": {
        const currentTitle = config.subagents?.userTitle || "Jefe";
        const presets = ["Jefe", "Comandante", "Líder", "Sensei", "Capitán"];
        const items: SelectItem[] = presets.map((preset) => {
          const isSelected = currentTitle.trim().toLowerCase() === preset.toLowerCase();
          return {
            value: `set_user_title:${preset}`,
            label: `${isSelected ? "●" : "○"} ${preset}`,
            description: isSelected
              ? `Apelativo actualmente activo (${preset})`
              : `Llamarme "${preset}" en locuciones de agentes`,
          };
        });

        items.push({
          value: "set_user_title_custom",
          label: "✏️ Personalizado...",
          description: `Ingresar apelativo a medida (actual: ${currentTitle})`,
        });

        items.push({
          value: "back_to_subagents",
          label: "⬅ Volver a Voces de Agentes",
          description: "Regresar a la configuración de subagentes",
        });

        return items;
      }

      case "speed": {
        const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
        const items: SelectItem[] = speeds.map((s) => ({
          value: `set_speed:${s}`,
          label: `${config.openai.speed === s ? "● " : "○ "}${s}x`,
          description: s === 1.0 ? "Velocidad normal" : s < 1 ? "Pausada" : "Rápida",
        }));
        items.push({
          value: "back",
          label: "⬅ Volver al menú principal",
          description: "Regresar a las opciones principales",
        });
        return items;
      }

      case "filter": {
        const modes: { mode: CodeFilterMode; title: string; desc: string }[] = [
          {
            mode: "omit",
            title: "Omitir código y tablas (Recomendado)",
            desc: "Lee únicamente la prosa y explicaciones naturales",
          },
          {
            mode: "mention",
            title: "Mencionar bloque omitido",
            desc: "Avisa oralmente cuando saltea un bloque de código",
          },
          {
            mode: "raw",
            title: "Leer todo sin filtrar",
            desc: "Lee código fuente y caracteres técnicos tal cual",
          },
        ];

        const items: SelectItem[] = modes.map((m) => ({
          value: `set_filter:${m.mode}`,
          label: `${config.filterCode === m.mode ? "● " : "○ "}${m.title}`,
          description: m.desc,
        }));
        items.push({
          value: "back",
          label: "⬅ Volver al menú principal",
          description: "Regresar a las opciones principales",
        });
        return items;
      }

      case "concurrency": {
        const cur = config.concurrency ?? "queue";
        return [
          {
            value: "set_concurrency:queue",
            label: `${cur === "queue" ? "● " : "○ "}Opción 1: Cola ordenada FIFO (Por defecto / Recomendado)`,
            description: "Espera ordenada en cola. Ninguna sesión corta a otra ni se mezclan las voces.",
          },
          {
            value: "set_concurrency:interrupt",
            label: `${cur === "interrupt" ? "● " : "○ "}Opción 2: Interrumpir sesión previa (Takeover)`,
            description: "La sesión más reciente corta el audio en curso de cualquier otra sesión.",
          },
          {
            value: "set_concurrency:focus",
            label: `${cur === "focus" ? "● " : "○ "}Opción 3: Modo Foco (Solo habla la sesión activa)`,
            description: "Solo emite audio la terminal donde estás trabajando; las demás se silencian.",
          },
          {
            value: "set_concurrency:off",
            label: `${cur === "off" ? "● " : "○ "}Desactivado (Sin bloqueo)`,
            description: "Sin bloqueo inter-proceso. Múltiples sesiones pueden sonar al mismo tiempo.",
          },
          {
            value: "toggle_announce_project",
            label: `${config.announceProject ? "●" : "○"} Anunciar nombre de proyecto/sesión: ${config.announceProject ? "SÍ" : "NO"}`,
            description: "Antepone 'En <proyecto>:' antes de hablar para identificar qué terminal emite el audio",
          },
          {
            value: "back",
            label: "⬅ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }
    }
  }

  private async handleItemSelection(value: string): Promise<void> {
    if (value === "close") {
      this.onClose();
      return;
    }

    if (value === "back") {
      this.goBackOrClose();
      return;
    }

    // Submenu navigations
    if (value === "trigger_dictate") {
      this.onClose();
      this.onDictate?.();
      return;
    }

    if (value === "goto_voices") {
      this.statusNotice = undefined;
      this.currentScreen = "voices";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_tldr_level") {
      this.statusNotice = undefined;
      this.currentScreen = "tldr_level";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("set_tldr_level:")) {
      const level = value.slice(15) as TldrLevel;
      const updated = this.configManager.save({ tldrLevel: level });
      this.onConfigChanged(updated);
      const levelLabel =
        level === "high" ? "Alto (1 frase)" : level === "low" ? "Bajo (80-90% detalle)" : "Medio (2-3 frases)";
      this.statusNotice = `Nivel TL;DR configurado en: ${levelLabel}`;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_api_hub") {
      this.statusNotice = undefined;
      this.currentScreen = "api_hub";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_shortcuts") {
      this.statusNotice = undefined;
      this.currentScreen = "shortcuts";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_subagents") {
      this.statusNotice = undefined;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_user_title") {
      this.statusNotice = undefined;
      this.currentScreen = "user_title";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_volume") {
      this.statusNotice = undefined;
      this.currentScreen = "volume";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_speed") {
      this.statusNotice = undefined;
      this.currentScreen = "speed";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_filter") {
      this.statusNotice = undefined;
      this.currentScreen = "filter";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_concurrency") {
      this.statusNotice = undefined;
      this.currentScreen = "concurrency";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("set_concurrency:")) {
      const mode = value.split(":")[1] as ConcurrencyMode;
      const updated = this.configManager.save({ concurrency: mode });
      this.player.setConcurrency(mode);
      this.onConfigChanged(updated);
      const labels: Record<ConcurrencyMode, string> = {
        queue: "Cola FIFO (espera ordenada)",
        interrupt: "Interrupción previa (takeover)",
        focus: "Modo Foco (solo terminal activa)",
        off: "Desactivada (sin coordinación)",
      };
      this.statusNotice = `Concurrencia inter-sesiones: ${labels[mode]}`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "toggle_announce_project") {
      const config = this.configManager.getConfig();
      const next = !config.announceProject;
      const updated = this.configManager.save({ announceProject: next });
      this.onConfigChanged(updated);
      this.statusNotice = next
        ? "Anuncio de nombre de proyecto ACTIVADO ('En <proyecto>:...')"
        : "Anuncio de nombre de proyecto DESACTIVADO";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    // Main actions
    if (value === "toggle_autoread") {
      const config = this.configManager.getConfig();
      const updated = this.configManager.save({ autoRead: !config.autoRead });
      if (!updated.autoRead) this.player.stop();
      this.statusNotice = updated.autoRead
        ? "Auto-lectura ACTIVADA tras cada respuesta"
        : "Auto-lectura DESACTIVADA (modo manual)";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "toggle_tldr") {
      const config = this.configManager.getConfig();
      const updated = this.configManager.save({ tldr: !config.tldr });
      this.statusNotice = updated.tldr
        ? "Modo Resumen TL;DR ACTIVADO (hablará en síntesis breve)"
        : "Modo Resumen TL;DR DESACTIVADO (hablará respuesta completa)";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "stop_audio") {
      this.player.stop();
      this.statusNotice = "Audio detenido";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "read_last") {
      if (!this.lastAssistantText) {
        this.statusNotice = "No hay ninguna respuesta previa para leer";
        this.renderScreen();
        this.tui.requestRender();
        return;
      }
      this.statusNotice = "Leyendo última respuesta...";
      this.renderScreen();
      this.tui.requestRender();
      this.playText(this.lastAssistantText);
      return;
    }

    // API Hub actions
    if (value === "api_tts_provider") {
      const config = this.configManager.getConfig();
      const order: SpeechProviderType[] = ["kokoro", "openai", "elevenlabs", "custom"];
      const currentIndex = order.indexOf(config.provider);
      const nextProvider = order[(currentIndex + 1) % order.length] || "kokoro";
      const updated = this.configManager.save({ provider: nextProvider });
      this.onConfigChanged(updated);
      this.statusNotice = `Proveedor TTS cambiado a: ${nextProvider}`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "api_tts_key") {
      if (this.ctx.ui.input) {
        this.onClose();
        const provider = this.configManager.getConfig().provider;
        const inputKey = await this.ctx.ui.input(
          `Ingresá API Key para TTS (${provider}):`
        );
        if (inputKey) {
          const cleanedKey = ConfigManager.cleanApiKey(inputKey);
          if (cleanedKey) {
            let updated: VoicePluginConfig;
            if (provider === "openai") {
              updated = this.configManager.updateNested("openai", { apiKey: cleanedKey });
            } else if (provider === "elevenlabs") {
              updated = this.configManager.updateNested("elevenlabs", { apiKey: cleanedKey });
            } else {
              updated = this.configManager.getConfig();
            }
            this.onConfigChanged(updated);
            this.ctx.ui.notify(`Clave TTS guardada correctamente`, "info");
          }
        }
      }
      return;
    }

    if (value === "api_tts_url") {
      if (this.ctx.ui.input) {
        this.onClose();
        const newUrl = await this.ctx.ui.input(
          "URL endpoint Custom TTS:",
          this.configManager.getConfig().custom.url
        );
        if (newUrl && newUrl.trim()) {
          const updated = this.configManager.updateNested("custom", {
            url: newUrl.trim(),
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`URL TTS actualizada: ${newUrl.trim()}`, "info");
        }
      }
      return;
    }

    if (value === "api_tts_method") {
      const currentMethod = this.configManager.getConfig().custom.method;
      const newMethod = currentMethod === "POST" ? "GET" : "POST";
      const updated = this.configManager.updateNested("custom", { method: newMethod });
      this.onConfigChanged(updated);
      this.statusNotice = `Método TTS cambiado a: ${newMethod}`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "api_stt_provider") {
      const config = this.configManager.getConfig();
      const current = config.stt?.provider || "openai";
      const next = current === "openai" ? "groq" : current === "groq" ? "custom" : "openai";
      const baseUrl =
        next === "groq"
          ? "https://api.groq.com/openai/v1"
          : next === "openai"
          ? "https://api.openai.com/v1"
          : config.stt?.baseUrl || "https://api.openai.com/v1";
      const model =
        next === "groq"
          ? "whisper-large-v3-turbo"
          : next === "openai"
          ? "whisper-1"
          : config.stt?.model || "whisper-1";

      const updated = this.configManager.updateNested("stt", {
        provider: next,
        baseUrl,
        model,
      });
      this.onConfigChanged(updated);
      this.statusNotice = `Proveedor Dictado (STT) cambiado a: ${next} (${model})`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "api_stt_key") {
      if (this.ctx.ui.input) {
        this.onClose();
        const prov = this.configManager.getConfig().stt?.provider || "openai";
        const inputKey = await this.ctx.ui.input(
          `Ingresá API Key para Dictado STT (${prov}):`
        );
        if (inputKey) {
          const cleanedKey = ConfigManager.cleanApiKey(inputKey);
          if (cleanedKey) {
            const updated = this.configManager.updateNested("stt", { apiKey: cleanedKey });
            this.onConfigChanged(updated);
            this.ctx.ui.notify(`Clave STT guardada correctamente`, "info");
          }
        }
      }
      return;
    }

    if (value === "api_stt_url") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentUrl =
          this.configManager.getConfig().stt?.baseUrl || "https://api.openai.com/v1";
        const newUrl = await this.ctx.ui.input("URL endpoint STT:", currentUrl);
        if (newUrl && newUrl.trim()) {
          const updated = this.configManager.updateNested("stt", { baseUrl: newUrl.trim() });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`URL STT actualizada`, "info");
        }
      }
      return;
    }

    if (value === "api_stt_model") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentModel = this.configManager.getConfig().stt?.model || "whisper-1";
        const newModel = await this.ctx.ui.input("Modelo Whisper STT:", currentModel);
        if (newModel && newModel.trim()) {
          const updated = this.configManager.updateNested("stt", { model: newModel.trim() });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Modelo STT actualizado a: ${newModel.trim()}`, "info");
        }
      }
      return;
    }

    if (value === "api_stt_lang") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentLang = this.configManager.getConfig().stt?.language || "es";
        const newLang = await this.ctx.ui.input("Código de idioma STT (ej: es, en):", currentLang);
        if (newLang && newLang.trim()) {
          const updated = this.configManager.updateNested("stt", { language: newLang.trim() });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Idioma STT actualizado a: ${newLang.trim()}`, "info");
        }
      }
      return;
    }

    // Voice selection and live preview
    if (value.startsWith("voice:")) {
      const voiceName = value.slice(6);
      const config = this.configManager.getConfig();

      let updated: VoicePluginConfig;
      if (config.provider === "openai") {
        updated = this.configManager.updateNested("openai", { voice: voiceName });
      } else if (config.provider === "kokoro") {
        updated = this.configManager.updateNested("kokoro", { voice: voiceName });
      } else {
        updated = this.configManager.updateNested("elevenlabs", { voiceId: voiceName });
      }

      this.onConfigChanged(updated);
      this.statusNotice = `Voz '${voiceName}' activada. Reproduciendo muestra...`;
      this.renderScreen();
      this.tui.requestRender();

      this.playVoiceSample(voiceName, config.provider);
      return;
    }

    if (value === "kokoro_custom_voice") {
      if (this.ctx.ui.input) {
        this.onClose();
        const inputVoice = await this.ctx.ui.input(
          "Voz Kokoro o fórmula blend (ej: dora_heart o ef_dora:0.7,af_bella:0.3):",
          this.configManager.getConfig().kokoro.voice
        );
        if (inputVoice && inputVoice.trim()) {
          const updated = this.configManager.updateNested("kokoro", {
            voice: inputVoice.trim(),
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Voz Kokoro configurada: ${inputVoice.trim()}`, "info");
          this.playVoiceSample(inputVoice.trim(), "kokoro");
        }
      }
      return;
    }

    if (value === "eleven_custom_id") {
      if (this.ctx.ui.input) {
        this.onClose();
        const customId = await this.ctx.ui.input(
          "Voice ID de ElevenLabs:",
          this.configManager.getConfig().elevenlabs.voiceId
        );
        if (customId && customId.trim()) {
          const updated = this.configManager.updateNested("elevenlabs", {
            voiceId: customId.trim(),
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Voice ID configurado: ${customId.trim()}`, "info");
        }
      }
      return;
    }

    if (value === "custom_test_voice") {
      this.statusNotice = "Enviando prueba al endpoint Custom...";
      this.renderScreen();
      this.tui.requestRender();
      this.playText("Probando síntesis con Custom API.");
      return;
    }

    // Speed setting
    if (value.startsWith("set_speed:")) {
      const speedNum = parseFloat(value.slice(10));
      const updated = this.configManager.updateNested("openai", { speed: speedNum });
      this.onConfigChanged(updated);
      this.statusNotice = `Velocidad establecida en: ${speedNum}x`;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    // Volume setting
    if (value.startsWith("set_vol:")) {
      const pct = parseInt(value.slice(8), 10);
      const volFraction = Math.max(0.0, Math.min(1.5, pct / 100));
      const updated = this.configManager.save({ volume: volFraction });
      this.player.setVolume(volFraction);
      this.onConfigChanged(updated);
      this.statusNotice = `Volumen ajustado al ${pct}%. Reproduciendo muestra...`;
      this.renderScreen();
      this.tui.requestRender();

      this.playText(`Volumen al ${pct} por ciento.`);
      return;
    }

    if (value === "volume_custom_input") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentPct = Math.round((this.configManager.getConfig().volume ?? 1.0) * 100);
        const inputVal = await this.ctx.ui.input(
          "Porcentaje de volumen (0 a 150):",
          String(currentPct)
        );
        const parsed = parseInt(inputVal?.trim() || "", 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 150) {
          const volFraction = parsed / 100;
          const updated = this.configManager.save({ volume: volFraction });
          this.player.setVolume(volFraction);
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Volumen configurado al ${parsed}%`, "info");
        }
      }
      return;
    }

    // Shortcuts setting
    if (value.startsWith("change_sc:")) {
      const actionKey = value.slice(10) as keyof VoiceShortcutsConfig;
      if (this.ctx.ui.input) {
        this.onClose();
        const currentKey = this.configManager.getConfig().shortcuts?.[actionKey] || "";
        const newKey = await this.ctx.ui.input(
          `Ingresá nuevo atajo para ${actionKey} (ej: alt+r, ctrl+r, f8):`,
          currentKey
        );
        if (newKey && newKey.trim()) {
          const cleanKey = newKey.trim().toLowerCase();
          const updated = this.configManager.updateNested("shortcuts", {
            [actionKey]: cleanKey,
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Atajo para ${actionKey} cambiado a: ${cleanKey}`, "info");
        }
      }
      return;
    }

    if (value === "reset_shortcuts") {
      const updated = this.configManager.save({
        shortcuts: {
          menu: "alt+v",
          stop: "alt+s",
          record: "alt+r",
          volumeUp: "alt+up",
          volumeDown: "alt+down",
        },
      });
      this.onConfigChanged(updated);
      this.statusNotice = "Atajos restaurados a los valores por defecto";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    // Subagent voices actions
    if (value === "sub_toggle_enabled") {
      const config = this.configManager.getConfig();
      const current = config.subagents?.enabled ?? true;
      const updated = this.configManager.updateNested("subagents", { enabled: !current });
      this.statusNotice = !current
        ? "Voces de Subagentes ACTIVADAS"
        : "Voces de Subagentes DESACTIVADAS";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "sub_toggle_start") {
      const config = this.configManager.getConfig();
      const current = config.subagents?.announceStart ?? true;
      const updated = this.configManager.updateNested("subagents", { announceStart: !current });
      this.statusNotice = !current ? "Avisos de inicio ACTIVADOS" : "Avisos de inicio DESACTIVADOS";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "sub_toggle_end") {
      const config = this.configManager.getConfig();
      const current = config.subagents?.announceEnd ?? true;
      const updated = this.configManager.updateNested("subagents", { announceEnd: !current });
      this.statusNotice = !current ? "Avisos de fin ACTIVADOS" : "Avisos de fin DESACTIVADOS";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "sub_toggle_orchestrator_phases") {
      const config = this.configManager.getConfig();
      const current = config.subagents?.announceOrchestratorPhases ?? true;
      const updated = this.configManager.updateNested("subagents", { announceOrchestratorPhases: !current });
      this.statusNotice = !current ? "Fases del orquestador ACTIVADAS" : "Fases del orquestador DESACTIVADAS";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "sub_toggle_tests") {
      const config = this.configManager.getConfig();
      const current = config.subagents?.announceTests ?? true;
      const updated = this.configManager.updateNested("subagents", { announceTests: !current });
      this.statusNotice = !current
        ? "Anuncio de pruebas de verificación ACTIVADO"
        : "Anuncio de pruebas de verificación DESACTIVADO";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("sub_voice:")) {
      const role = value.slice(10) as SubagentRoleKey;
      this.selectedSubagentRole = role;
      this.statusNotice = undefined;
      this.currentScreen = "subagent_voice";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("set_sub_voice:")) {
      const rest = value.slice("set_sub_voice:".length);
      const colonIndex = rest.indexOf(":");
      const role = rest.slice(0, colonIndex) as SubagentRoleKey;
      const voiceId = rest.slice(colonIndex + 1);

      const updated = this.configManager.updateNested("subagents", {
        [role]: voiceId,
      });
      this.onConfigChanged(updated);

      const roleName = ROLE_LABELS[role] || role;
      this.statusNotice = `Voz de ${roleName} asignada a '${voiceId}'. Reproduciendo muestra...`;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();

      const config = this.configManager.getConfig();
      this.playVoiceSample(voiceId, config.provider, role);
      return;
    }

    if (value.startsWith("custom_sub_voice:")) {
      const role = value.slice("custom_sub_voice:".length) as SubagentRoleKey;
      if (this.ctx.ui.input) {
        this.onClose();
        const currentVoice = (this.configManager.getConfig().subagents as any)?.[role] || "";
        const roleName = ROLE_LABELS[role] || role;
        const newVoice = await this.ctx.ui.input(
          `Voz personalizada para ${roleName} (ej: dora_heart o ef_dora:0.7,af_bella:0.3):`,
          currentVoice
        );
        if (newVoice && newVoice.trim()) {
          const cleanVoice = newVoice.trim();
          const updated = this.configManager.updateNested("subagents", {
            [role]: cleanVoice,
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Voz para ${roleName} configurada: ${cleanVoice}`, "info");
          this.playVoiceSample(cleanVoice, this.configManager.getConfig().provider, role);
        }
      }
      return;
    }

    if (value.startsWith("sub_name:")) {
      this.selectedSubagentRole = value.slice(9) as SubagentRoleKey;
      this.statusNotice = undefined;
      this.currentScreen = "subagent_name";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("set_sub_name:")) {
      const parts = value.split(":");
      const role = parts[1] as SubagentRoleKey;
      const name = parts.slice(2).join(":");
      const propKey =
        role === "scout"
          ? "scoutName"
          : role === "worker"
          ? "workerName"
          : role === "reviewer"
          ? "reviewerName"
          : "orchestratorName";

      const updated = this.configManager.updateNested("subagents", {
        [propKey]: name,
      });
      this.onConfigChanged(updated);
      this.statusNotice = `Nombre para ${ROLE_LABELS[role]}: "${name}"`;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("custom_sub_name:")) {
      const role = value.slice(16) as SubagentRoleKey;
      const propKey =
        role === "scout"
          ? "scoutName"
          : role === "worker"
          ? "workerName"
          : role === "reviewer"
          ? "reviewerName"
          : "orchestratorName";

      const currentSub = this.configManager.getConfig().subagents;
      const currentName =
        (currentSub as any)?.[propKey] ||
        (role === "scout"
          ? "Dora"
          : role === "worker"
          ? "Alex"
          : role === "reviewer"
          ? "Santa"
          : "el Gentleman");

      if (this.ctx.ui.input) {
        this.onClose();
        const newName = await this.ctx.ui.input(
          `Ingresá el nombre para ${ROLE_LABELS[role]}:`,
          currentName
        );
        if (newName && newName.trim()) {
          const cleanName = newName.trim();
          const updated = this.configManager.updateNested("subagents", {
            [propKey]: cleanName,
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(
            `Nombre para ${ROLE_LABELS[role]} configurado: "${cleanName}"`,
            "info"
          );
        }
      }
      return;
    }

    if (value === "sub_reset") {
      const updated = this.configManager.updateNested("subagents", {
        enabled: true,
        crewMode: true,
        announceStart: true,
        announceEnd: true,
        announceOrchestratorPhases: true,
        announceTests: true,
        orchestrator: "dora_heart",
        scout: "ef_dora",
        worker: "em_alex",
        reviewer: "em_santa",
        userTitle: "Jefe",
        scoutName: "Dora",
        workerName: "Alex",
        reviewerName: "Santa",
        orchestratorName: "el Gentleman",
      });
      this.onConfigChanged(updated);
      this.statusNotice = "Voces y nombres en español restaurados por defecto";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "back_to_subagents") {
      this.statusNotice = undefined;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value.startsWith("set_user_title:")) {
      const preset = value.slice(15);
      const updated = this.configManager.updateNested("subagents", {
        userTitle: preset,
      });
      this.onConfigChanged(updated);
      this.statusNotice = `Apelativo configurado: "${preset}"`;
      this.currentScreen = "subagents";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "set_user_title_custom") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentTitle = this.configManager.getConfig().subagents?.userTitle || "Jefe";
        const newTitle = await this.ctx.ui.input(
          "Ingresá el apelativo con el que te llamarán los agentes (ej: Jefe, Comandante, Alex):",
          currentTitle
        );
        if (newTitle && newTitle.trim()) {
          const cleanTitle = newTitle.trim();
          const updated = this.configManager.updateNested("subagents", {
            userTitle: cleanTitle,
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`Apelativo configurado: "${cleanTitle}"`, "info");
        }
      }
      return;
    }

    // Filter setting
    if (value.startsWith("set_filter:")) {
      const filterMode = value.slice(11) as CodeFilterMode;
      const updated = this.configManager.save({ filterCode: filterMode });
      this.onConfigChanged(updated);
      this.statusNotice = `Filtro cambiado a: ${filterMode}`;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }
  }

  private async playVoiceSample(
    voiceName: string,
    providerType: string,
    role?: SubagentRoleKey
  ): Promise<void> {
    if (this.isPreviewing) {
      this.player.stop();
    }
    this.isPreviewing = true;
    try {
      let sampleText = `Hola, soy la voz ${voiceName} en Pi CLI.`;
      if (role === "scout") {
        sampleText = `Hola, soy la voz del explorador Scout. Relevando el terreno en Pi CLI.`;
      } else if (role === "worker") {
        sampleText = `Hola, soy la voz del programador Worker. Listo para implementar código en Pi CLI.`;
      } else if (role === "reviewer") {
        sampleText = `Hola, soy la voz del auditor Reviewer. Verificando y testeando en Pi CLI.`;
      } else if (role === "orchestrator") {
        sampleText = `Hola, soy la voz del orquestador principal. Coordinando a la cuadrilla en Pi CLI.`;
      }

      const config = this.configManager.getConfig();
      const effectiveConfig: VoicePluginConfig = {
        ...config,
        openai: { ...config.openai, voice: voiceName },
        kokoro: { ...config.kokoro, voice: voiceName },
        elevenlabs: { ...config.elevenlabs, voiceId: voiceName },
      };
      const apiKey = this.configManager.getActiveApiKey();
      const provider = createTTSProvider(effectiveConfig, apiKey);
      const res = await provider.synthesize(sampleText);
      await this.player.play(res.audioBuffer, res.format);
    } catch (err: any) {
      this.statusNotice = `Error de muestra: ${err.message}`;
      this.renderScreen();
      this.tui.requestRender();
    } finally {
      this.isPreviewing = false;
    }
  }

  private async playText(text: string): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      const apiKey = this.configManager.getActiveApiKey();
      const provider = createTTSProvider(config, apiKey);
      const res = await provider.synthesize(text);
      await this.player.play(res.audioBuffer, res.format);
    } catch (err: any) {
      this.statusNotice = `Error: ${err.message}`;
      this.renderScreen();
      this.tui.requestRender();
    }
  }
}
