import type { CustomProviderConfig } from "../config.ts";
import type { TTSProvider, SynthesisResult } from "./base.ts";

export class CustomHttpProvider implements TTSProvider {
  public readonly id = "custom";
  public readonly name = "Custom HTTP Provider";
  private config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    this.config = config;
  }

  public async synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult> {
    if (!this.config.url) {
      throw new Error("No hay URL configurada para el proveedor Custom HTTP.");
    }

    let url = this.config.url;
    const method = (this.config.method || "POST").toUpperCase();
    const headers: Record<string, string> = {
      ...(this.config.headers || {}),
    };

    let body: string | undefined;

    if (method === "POST" || method === "PUT") {
      if (this.config.bodyTemplate) {
        body = this.config.bodyTemplate.replace(/\{\{text\}\}/g, JSON.stringify(text).slice(1, -1));
      } else {
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
        body = JSON.stringify({ text });
      }
    } else if (method === "GET") {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}text=${encodeURIComponent(text)}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Error del proveedor Custom HTTP (${res.status} ${res.statusText}): ${errText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer,
      format: this.config.format || "wav",
    };
  }
}
