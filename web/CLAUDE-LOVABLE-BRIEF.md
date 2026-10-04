# Brief for Claude Code

Redesign `web/` so it looks like a **Lovable-quality** product UI, not an engineer form.

Official Lovable MCP is configured on this machine (`lovable` → https://mcp.lovable.dev).

Live project (created 2026-08-18, 4.5 credits):
- editor: https://lovable.dev/projects/2205c188-a11f-4c4e-b466-242b09565a59
- preview: https://id-preview--2205c188-a11f-4c4e-b466-242b09565a59.lovable.app
- workspace: KKJdFYlaQ3i2DWWu5Qcb (Sergii's Lovable, pro)

Port generated UI into `web/` and keep the HostClient contract. Do not deploy. Do not enable Lovable Cloud.

## Product

ReelForge Studio is a **control panel** for ReelForge-Host.

Killer path: video + photo of the one person to keep sharp → Host `privacy_except` → mp4. Photo search must **Accept** or the job stops.

Host: `GET {base}/health`, `POST {base}/mcp` JSON-RPC `tools/call` name `privacy_except`.

Keep `src/api.ts` HostClient contract (or improve it without breaking those endpoints).

## Must keep

- Paths are on the **Host machine**, not browser File uploads.
- Modes: Operator / Capture / Agent (help text differs).
- Styles: pixelate (default, anonymity) / gaussian (recoverable) / solid.
- Help must be first-class (drawer or column), not a one-line hint.
- No Electron. No new backend. No ONNX in the frontend.

## Visual bar

Lovable / linear.app / dark editorial. Not a stack of unlabeled inputs.
Two-column desktop. Sticky help. Real empty states. Human error copy.

## Files

Edit only under `web/`. Install tailwind if needed. Do not commit. Do not push.
When done, list the files you changed.
