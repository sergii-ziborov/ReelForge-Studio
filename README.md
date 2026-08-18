# ReelForge Studio

Control surfaces for [ReelForge-Host](https://github.com/sergii-ziborov/ReelForge-Host). **Not** a vision engine, **not** a compiler, **not** Electron.

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
