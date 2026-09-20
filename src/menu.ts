import {
  Container,
  Text,
  SelectList,
  Spacer,
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
} from "./config.ts";
import { AudioPlayer } from "./player.ts";
import { createTTSProvider } from "./providers/factory.ts";

export type MenuScreen =
  | "main"
  | "voices"
  | "providers"
  | "custom_api"
  | "speed"
  | "filter";

export interface VoiceMenuOptions {
  configManager: ConfigManager;
  player: AudioPlayer;
  theme: Theme;
  tui: TUI;
  ctx: ExtensionContext;
  lastAssistantText?: string;
  onClose: () => void;
  onConfigChanged: (newConfig: VoicePluginConfig) => void;
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

  private currentScreen: MenuScreen = "main";
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

    this.renderScreen();
  }

  public handleInput(keyData: string): void {
    if (keyData === "\x1b" || keyData === "escape") {
      if (this.currentScreen !== "main") {
        this.statusNotice = undefined;
        this.currentScreen = "main";
        this.renderScreen();
        this.tui.requestRender();
        return;
      }
      this.onClose();
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

    // Header title
    let titleText = "🎙️ Menú de Voz de Pi CLI";
    if (this.currentScreen === "voices") titleText = "🎙️ Voces y Muestras de Audio";
    else if (this.currentScreen === "providers") titleText = "🌐 Seleccionar Proveedor de IA";
    else if (this.currentScreen === "custom_api") titleText = "⚙️ Integrar API Custom (HTTP)";
    else if (this.currentScreen === "speed") titleText = "⚡ Velocidad de Locución";
    else if (this.currentScreen === "filter") titleText = "🧹 Filtro de Código y Markdown";

    this.addChild(
      new Text(this.theme.fg("accent", this.theme.bold(` ${titleText} `)), 0, 0)
    );

    // Status notice or subtitle
    if (this.statusNotice) {
      this.addChild(new Text(this.theme.fg("warning", ` ℹ️  ${this.statusNotice}`), 0, 0));
    } else {
      const activeVoice =
        config.provider === "openai"
          ? config.openai.voice
          : config.provider === "kokoro"
          ? config.kokoro.voice
          : config.provider === "elevenlabs"
          ? config.elevenlabs.voiceId
          : "custom";
      const statusLine = ` [Proveedor: ${config.provider} | Voz: ${activeVoice} | Auto: ${
        config.autoRead ? "ON" : "OFF"
      }]`;
      this.addChild(new Text(this.theme.fg("dim", statusLine), 0, 0));
    }

    this.addChild(new Spacer(1));

    // Build items for current screen
    const items = this.getItemsForScreen(config);
    const maxVisible = Math.min(items.length, 10);

    const list = new SelectList(items, maxVisible, selectTheme);
    list.onSelect = (selectedItem: SelectItem) => {
      this.handleItemSelection(selectedItem.value);
    };

    this.activeSelectList = list;
    this.addChild(list);

    // Footer hints
    this.addChild(new Spacer(1));
    this.addChild(
      new Text(
        this.theme.fg(
          "dim",
          "  ↑/↓ o Clic para elegir • Enter para confirmar • Esc para volver/cerrar"
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

        return [
          {
            value: "toggle_autoread",
            label: `🔊 Auto-lectura: ${config.autoRead ? "ACTIVADA" : "DESACTIVADA"}`,
            description: "Lee automáticamente cada respuesta generada",
          },
          {
            value: "goto_voices",
            label: `🎙️ Seleccionar Voz y Escuchar Muestra...`,
            description: `Voz actual: ${activeVoice}. Probá las voces en vivo`,
          },
          {
            value: "goto_providers",
            label: `🌐 Proveedor de IA (${config.provider})...`,
            description: "Alternar entre OpenAI, ElevenLabs o Custom API",
          },
          {
            value: "goto_custom_api",
            label: `🔌 Integrar API Custom...`,
            description: "Conectar un endpoint REST propio o servidor local",
          },
          {
            value: "goto_speed",
            label: `⚡ Velocidad de habla (${config.openai.speed}x)...`,
            description: "Ajustar rapidez de locución",
          },
          {
            value: "goto_filter",
            label: `🧹 Filtro de código (${config.filterCode})...`,
            description: "Omitir código, mencionar bloques o leer todo",
          },
          {
            value: "set_key",
            label: `🔑 Configurar Clave de API`,
            description: "Ingresar o actualizar API Key del proveedor activo",
          },
          {
            value: "read_last",
            label: `▶️ Leer última respuesta del asistente`,
            description: "Reproducir la última respuesta por audio",
          },
          {
            value: "stop_audio",
            label: `⏹️ Detener reproducción de audio`,
            description: "Cortar el audio en curso inmediatamente",
          },
          {
            value: "close",
            label: `❌ Cerrar Menú`,
            description: "Salir a la terminal de Pi CLI",
          },
        ];
      }

      case "voices": {
        if (config.provider === "openai") {
          const openaiVoices = [
            { name: "nova", desc: "Femenina, enérgica y natural" },
            { name: "alloy", desc: "Neutra, clara y balanceada" },
            { name: "echo", desc: "Masculina, cálida y cercana" },
            { name: "fable", desc: "Expresiva, acento británico" },
            { name: "onyx", desc: "Masculina, profunda y autoritaria" },
            { name: "shimmer", desc: "Femenina, brillante y nítida" },
            { name: "ash", desc: "Masculina suave y cotidiana" },
            { name: "sage", desc: "Neutra, serena y reposada" },
            { name: "coral", desc: "Femenina, cálida y amigable" },
          ];

          const items: SelectItem[] = openaiVoices.map((v) => {
            const isCurrent = config.openai.voice === v.name;
            return {
              value: `voice:${v.name}`,
              label: `${isCurrent ? "✓ " : "  "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar muestra y activar]`,
            };
          });

          items.push({
            value: "back",
            label: "⬅️ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else if (config.provider === "kokoro") {
          const kokoroVoices = [
            { id: "ef_dora", name: "Dora (Español)", desc: "Femenina, natural y fluida" },
            { id: "em_alex", name: "Alex (Español)", desc: "Masculina, clara y cercana" },
            { id: "em_santa", name: "Santa (Español)", desc: "Masculina, tono narrador" },
            { id: "af_heart", name: "Heart (Inglés)", desc: "Femenina, máxima calidad y realismo" },
            { id: "af_nova", name: "Nova (Inglés)", desc: "Femenina, expresiva y enérgica" },
            { id: "af_alloy", name: "Alloy (Inglés)", desc: "Neutra, balanceada" },
            { id: "am_echo", name: "Echo (Inglés)", desc: "Masculina, cálida y conversacional" },
            { id: "am_fenrir", name: "Fenrir (Inglés)", desc: "Masculina, profunda y seria" },
            { id: "bf_emma", name: "Emma (Británico)", desc: "Femenina británica elegante" },
            { id: "bm_george", name: "George (Británico)", desc: "Masculina británica culta" },
          ];

          const items: SelectItem[] = kokoroVoices.map((v) => {
            const isCurrent = config.kokoro.voice === v.id;
            return {
              value: `voice:${v.id}`,
              label: `${isCurrent ? "✓ " : "  "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar y activar]`,
            };
          });

          items.push({
            value: "back",
            label: "⬅️ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else if (config.provider === "elevenlabs") {
          const elevenVoices = [
            { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Calma y natural" },
            { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Enérgica y segura" },
            { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Suave y expresiva" },
            { id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Masculina modulada" },
            { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", desc: "Masculina joven" },
            { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Masculina profunda" },
            { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Narrador profesional" },
          ];

          const items: SelectItem[] = elevenVoices.map((v) => {
            const isCurrent = config.elevenlabs.voiceId === v.id;
            return {
              value: `voice:${v.id}`,
              label: `${isCurrent ? "✓ " : "  "}${v.name}`,
              description: `${v.desc} • [Clic: escuchar y activar]`,
            };
          });

          items.push({
            value: "eleven_custom_id",
            label: "✏️ Ingresar otro Voice ID de ElevenLabs...",
            description: "Ingresar el ID de una voz clonada o diseñada",
          });
          items.push({
            value: "back",
            label: "⬅️ Volver al menú principal",
            description: "Regresar a las opciones principales",
          });
          return items;
        } else {
          return [
            {
              value: "custom_test_voice",
              label: "🔊 Probar síntesis con Custom API",
              description: "Envía una muestra al endpoint configurado",
            },
            {
              value: "back",
              label: "⬅️ Volver al menú principal",
              description: "Regresar a las opciones principales",
            },
          ];
        }
      }

      case "providers": {
        return [
          {
            value: "set_prov:kokoro",
            label: `${config.provider === "kokoro" ? "✓ " : "  "}Kokoro TTS Local (100% Offline, Gratis)`,
            description: "Servidor local ONNX en http://127.0.0.1:8880 (sin límites ni costo)",
          },
          {
            value: "set_prov:openai",
            label: `${config.provider === "openai" ? "✓ " : "  "}OpenAI / Compatible`,
            description: "Endpoint estándar /v1/audio/speech (tts-1, Groq, Kokoro)",
          },
          {
            value: "set_prov:elevenlabs",
            label: `${config.provider === "elevenlabs" ? "✓ " : "  "}ElevenLabs`,
            description: "Voces clonadas y de ultra alta fidelidad",
          },
          {
            value: "set_prov:custom",
            label: `${config.provider === "custom" ? "✓ " : "  "}Custom HTTP API`,
            description: "Endpoint propio o servidor local configurable",
          },
          {
            value: "back",
            label: "⬅️ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }

      case "custom_api": {
        const isCustomActive = config.provider === "custom";
        const hasHeaders =
          config.custom.headers && Object.keys(config.custom.headers).length > 0;

        return [
          {
            value: "custom:activate",
            label: `${isCustomActive ? "✓ Activo: " : "  "}Usar Custom API como Proveedor`,
            description: isCustomActive
              ? "Custom API ya está seleccionada"
              : "Activar Custom API para todas las locuciones",
          },
          {
            value: "custom:url",
            label: `🌐 URL: ${config.custom.url}`,
            description: "Editar la dirección del endpoint HTTP/REST",
          },
          {
            value: "custom:method",
            label: `🔄 Método HTTP: ${config.custom.method}`,
            description: "Alternar entre POST y GET",
          },
          {
            value: "custom:format",
            label: `🎵 Formato de audio: ${config.custom.format}`,
            description: "Alternar entre wav y mp3",
          },
          {
            value: "custom:headers",
            label: `📋 Headers (${hasHeaders ? "Configurados" : "Vacíos"})`,
            description: "Configurar Authorization, Tokens o Content-Type",
          },
          {
            value: "custom:test",
            label: `▶ Probar Endpoint Custom Ahora`,
            description: "Envía una frase de prueba para verificar conectividad y audio",
          },
          {
            value: "back",
            label: "⬅️ Volver al menú principal",
            description: "Regresar a las opciones principales",
          },
        ];
      }

      case "speed": {
        const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
        const items: SelectItem[] = speeds.map((s) => ({
          value: `set_speed:${s}`,
          label: `${config.openai.speed === s ? "✓ " : "  "}${s}x`,
          description: s === 1.0 ? "Velocidad normal" : s < 1 ? "Pausada" : "Rápida",
        }));
        items.push({
          value: "back",
          label: "⬅️ Volver al menú principal",
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
          label: `${config.filterCode === m.mode ? "✓ " : "  "}${m.title}`,
          description: m.desc,
        }));
        items.push({
          value: "back",
          label: "⬅️ Volver al menú principal",
          description: "Regresar a las opciones principales",
        });
        return items;
      }
    }
  }

  private async handleItemSelection(value: string): Promise<void> {
    if (value === "close") {
      this.onClose();
      return;
    }

    if (value === "back") {
      this.statusNotice = undefined;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    // Submenu navigations
    if (value === "goto_voices") {
      this.statusNotice = undefined;
      this.currentScreen = "voices";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_providers") {
      this.statusNotice = undefined;
      this.currentScreen = "providers";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "goto_custom_api") {
      this.statusNotice = undefined;
      this.currentScreen = "custom_api";
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

    // Main actions
    if (value === "toggle_autoread") {
      const config = this.configManager.getConfig();
      const updated = this.configManager.save({ autoRead: !config.autoRead });
      if (!updated.autoRead) this.player.stop();
      this.statusNotice = updated.autoRead
        ? "🔊 Auto-lectura ACTIVADA tras cada respuesta"
        : "🔇 Auto-lectura DESACTIVADA (modo manual)";
      this.onConfigChanged(updated);
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "stop_audio") {
      this.player.stop();
      this.statusNotice = "⏹️ Audio detenido";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "read_last") {
      if (!this.lastAssistantText) {
        this.statusNotice = "⚠️ No hay ninguna respuesta previa para leer";
        this.renderScreen();
        this.tui.requestRender();
        return;
      }
      this.statusNotice = "🔊 Leyendo última respuesta...";
      this.renderScreen();
      this.tui.requestRender();
      this.playText(this.lastAssistantText);
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
      this.statusNotice = `🔊 Voz '${voiceName}' activada. Reproduciendo muestra...`;
      this.renderScreen();
      this.tui.requestRender();

      // Play audio sample in background
      this.playVoiceSample(voiceName, config.provider);
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
      this.statusNotice = "🔊 Enviando prueba al endpoint Custom...";
      this.renderScreen();
      this.tui.requestRender();
      this.playText("Probando síntesis con Custom API.");
      return;
    }

    // Provider switching
    if (value.startsWith("set_prov:")) {
      const prov = value.slice(9) as SpeechProviderType;
      const updated = this.configManager.save({ provider: prov });
      this.onConfigChanged(updated);
      this.statusNotice = `✓ Proveedor cambiado a: ${prov}`;
      this.currentScreen = "main";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    // Custom API actions
    if (value === "custom:activate") {
      const updated = this.configManager.save({ provider: "custom" });
      this.onConfigChanged(updated);
      this.statusNotice = "✓ Custom API seleccionada como proveedor activo";
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "custom:url") {
      if (this.ctx.ui.input) {
        this.onClose();
        const newUrl = await this.ctx.ui.input(
          "URL del endpoint Custom HTTP:",
          this.configManager.getConfig().custom.url
        );
        if (newUrl && newUrl.trim()) {
          const updated = this.configManager.updateNested("custom", {
            url: newUrl.trim(),
          });
          this.onConfigChanged(updated);
          this.ctx.ui.notify(`URL Custom actualizada: ${newUrl.trim()}`, "info");
        }
      }
      return;
    }

    if (value === "custom:method") {
      const currentMethod = this.configManager.getConfig().custom.method;
      const newMethod = currentMethod === "POST" ? "GET" : "POST";
      const updated = this.configManager.updateNested("custom", { method: newMethod });
      this.onConfigChanged(updated);
      this.statusNotice = `Método HTTP cambiado a: ${newMethod}`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "custom:format") {
      const currentFormat = this.configManager.getConfig().custom.format;
      const newFormat = currentFormat === "wav" ? "mp3" : "wav";
      const updated = this.configManager.updateNested("custom", { format: newFormat });
      this.onConfigChanged(updated);
      this.statusNotice = `Formato cambiado a: ${newFormat}`;
      this.renderScreen();
      this.tui.requestRender();
      return;
    }

    if (value === "custom:headers") {
      if (this.ctx.ui.input) {
        this.onClose();
        const currentHeaders = JSON.stringify(
          this.configManager.getConfig().custom.headers || {}
        );
        const inputHeaders = await this.ctx.ui.input(
          "Headers JSON (ej: {\"Authorization\": \"Bearer token\"}):",
          currentHeaders
        );
        if (inputHeaders && inputHeaders.trim()) {
          try {
            const parsed = JSON.parse(inputHeaders.trim());
            const updated = this.configManager.updateNested("custom", { headers: parsed });
            this.onConfigChanged(updated);
            this.ctx.ui.notify("Headers actualizados correctamente", "info");
          } catch {
            this.ctx.ui.notify("Error: el formato ingresado no es un JSON válido", "error");
          }
        }
      }
      return;
    }

    if (value === "custom:test") {
      this.statusNotice = "🔊 Probando síntesis en endpoint Custom...";
      this.renderScreen();
      this.tui.requestRender();
      this.playText("Probando conexión y sonido del endpoint custom.");
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

    // API Key input
    if (value === "set_key") {
      if (this.ctx.ui.input) {
        this.onClose();
        const provider = this.configManager.getConfig().provider;
        const inputKey = await this.ctx.ui.input(
          `Ingresá tu API Key para ${provider}:`
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
            this.ctx.ui.notify(`Clave para ${provider} guardada correctamente`, "info");
          }
        }
      }
      return;
    }
  }

  private async playVoiceSample(voiceName: string, providerType: string): Promise<void> {
    if (this.isPreviewing) {
      this.player.stop();
    }
    this.isPreviewing = true;
    try {
      const sampleText = `¡Hola! Soy la voz ${voiceName} en Pi CLI.`;
      const config = this.configManager.getConfig();
      const apiKey = this.configManager.getActiveApiKey();
      const provider = createTTSProvider(config, apiKey);
      const res = await provider.synthesize(sampleText);
      await this.player.play(res.audioBuffer, res.format);
    } catch (err: any) {
      this.statusNotice = `❌ Error de muestra: ${err.message}`;
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
      this.statusNotice = `❌ Error: ${err.message}`;
      this.renderScreen();
      this.tui.requestRender();
    }
  }
}
