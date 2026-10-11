# ReelForge Studio

Control surfaces for [ReelForge-Host](https://github.com/sergii-ziborov/ReelForge-Host).

The browser opens on **Видео по описанию**. Enter a prompt, duration and
per-video image limit; Host plans, requests missing images through Codex CLI,
animates separate objects, adds sound and checks the exported movie. Studio
shows progress and plays/downloads the qualified result.

Open a saved project by its id to recover it after restarting the browser.
Revise it with another prompt or rebuild the saved scene using accepted files.
The revision shown in Studio is passed back to Host, which rejects stale edits.
The dependency details show the actual saved graph and affected nodes.

The mcport MCP surface imports the running Host's tool names, descriptions and
schemas. Reconnect it after changing the Host catalog. Host errors remain tool
errors. All production state, provider calls and execution belong to Host.

The existing-media privacy flow remains available under **Обработать существующее**.
The movie view is currently implemented in the browser; egui retains its
existing-media controls. See Host's README for the implemented motion profile,
CLI receipt support and dependencies.

```text
  human / browser / agent
            │
            ▼
 ┌─────────────────────┐
 │ ReelForge-Studio    │  this repo
 │  egui  ·  Vite  ·   │
 │  mcport MCP shim    │
 └──────────┬──────────┘
            │  HTTP JSON-RPC  POST /mcp
            ▼
 ┌─────────────────────┐
 │ ReelForge-Host      │  sibling process
 │  serve --http       │
 └─────────────────────┘
```

Host already speaks MCP. Studio only drives it.

| Surface | For | Stack |
| --- | --- | --- |
| `reelforge-studio` | Local desktop | **egui / eframe** — Rust widgets, no Chromium |
| `web/` | Browser / future SaaS | **React + Vite** — same Host URL |
| `reelforge-studio-mcp` | Coding agents | **[mcport](https://github.com/sergii-ziborov/mcport)** stdio tools that proxy Host |

One client crate (`reelforge-studio-client`) is the contract. Both GUIs and the mcport shim call it.

**Public on purpose.** No weights, no customer video, no secret API. Hide this repo only if billing/tenants land here.

Agents: talk to **Host MCP**, not a new catalog. See [AGENTS.md](AGENTS.md) and Host [docs/USE-CASES.md](https://github.com/sergii-ziborov/ReelForge-Host/blob/main/docs/USE-CASES.md). There is no ReelForge LSP — MCP is the agent protocol.

## Why not Electron / why not put UI in Host

- Host owns ffmpeg + ONNX. A webview would drag that into the renderer.
- Electron is a second Chromium. Desktop here is immediate-mode Rust.
- SaaS later is the Vite app talking to a hosted Host, not a rewrite.

The web MVP is a **control panel**. Paths (`video`, `photo`, `output`) are files on the **Host machine**. Browser `<input type=file>` cannot feed Host until an upload API exists.

## Run

```bash
# 1. Host (sibling)
cd ../ReelForge-Host
cargo run --release -- serve --http          # http://127.0.0.1:8787/mcp

# 2a. Rust desktop (egui — first build pulls wgpu)
cd ../ReelForge-Studio
cargo run --manifest-path crates/reelforge-studio/Cargo.toml

# 2b. Web
cd web
npm install
npm run dev                                  # http://127.0.0.1:5173

# 2c. Agent MCP (mcport, no Tokio)
cargo run -p reelforge-studio-mcp
```

Env:

| Variable | Default |
| --- | --- |
| `REELFORGE_HOST` | `http://127.0.0.1:8787` |
| `REELFORGE_HOST_TOKEN` | empty (loopback Host needs none) |

## Killer path in the UI

Video + photo → Host `privacy_except` → JSON (`subject_id`, `output`, `audio`).

## Layout

```text
crates/reelforge-studio-client   HTTP JSON-RPC client (no ONNX)
crates/reelforge-studio          egui desktop
crates/reelforge-studio-mcp      mcport stdio → same client
web/                             React + Vite
```

## License

MIT © Sergii Ziborov
