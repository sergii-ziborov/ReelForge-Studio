# Agents (MCP slice)

This repo is a **control surface**. The job runs in [ReelForge-Host](https://github.com/sergii-ziborov/ReelForge-Host).

You are not a finance agent. You redact video.

## Connect (preferred)

Host **is** the MCP. Do not invent tools.

```json
{
  "mcpServers": {
    "reelforge-host": {
      "command": "reelforge-host",
      "args": ["serve"]
    }
  }
}
```

If Host is already `serve --http` (human GUI up):

```json
{
  "mcpServers": {
    "reelforge-studio": {
      "command": "reelforge-studio-mcp",
      "env": { "REELFORGE_HOST": "http://127.0.0.1:8787" }
    }
  }
}
```

`reelforge-studio-mcp` is an [mcport](https://github.com/sergii-ziborov/mcport) stdio shim. Same tool names. No second catalog.

## Tools you should call

| Tool | When |
| --- | --- |
| `privacy_except` | Killer path: `video`, `photo`, `output`, optional `style` |
| `search_photo` | Only if you must inspect Accept/Reject before encode |
| `host_health` | Shim only — Host is down |

If photo search is not **Accept**, stop. Do not pick the top score.

## Do not

- Call Intelligence `compile_plan` / `approve` unless the human asked for a compiler session.
- Glob Capture `segments/` — pass a session dir or `project.json`.
- Guess a subject id.
- Treat gaussian blur as anonymity (`style=pixelate` unless asked).

## Hosted

Same JSON-RPC on HTTPS. Token required. No new methods. Upload is a Host feature, not an MCP rename.
