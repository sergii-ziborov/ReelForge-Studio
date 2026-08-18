export type Health = {
  ok: boolean;
  name?: string;
  protocolVersion?: string;
};

export type PrivacyExceptArgs = {
  video: string;
  photo: string;
  output: string;
  style?: string;
};

export class HostClient {
  constructor(
    public base: string,
    public token = "",
  ) {}

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token.trim()) h.Authorization = `Bearer ${this.token.trim()}`;
    return h;
  }

  async health(): Promise<Health> {
    const r = await fetch(`${this.base.replace(/\/$/, "")}/health`, {
      headers: this.headers(),
    });
    if (!r.ok) throw new Error(`health HTTP ${r.status}`);
    return r.json();
  }

  async rpc(method: string, params: unknown = {}): Promise<unknown> {
    const r = await fetch(`${this.base.replace(/\/$/, "")}/mcp`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`http ${r.status}`);
    if (body.error) throw new Error(body.error.message ?? "rpc error");
    return body.result;
  }

  async privacyExcept(args: PrivacyExceptArgs): Promise<unknown> {
    const result = (await this.rpc("tools/call", {
      name: "privacy_except",
      arguments: args,
    })) as { structuredContent?: unknown };
    return result.structuredContent ?? result;
  }
}
