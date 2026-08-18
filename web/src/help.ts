export type HelpId =
  | "overview"
  | "host"
  | "video"
  | "photo"
  | "output"
  | "style"
  | "accept"
  | "capture"
  | "agent"
  | "errors";

export type Mode = "operator" | "capture" | "agent";

export const HELP: Record<
  HelpId,
  { title: string; body: string[] }
> = {
  overview: {
    title: "What this is",
    body: [
      "Studio is a control panel. It does not detect faces or encode video. ReelForge-Host does that.",
      "Killer path: a video + a photo of the person to keep sharp → everyone else is redacted → an mp4.",
      "Start Host first: reelforge-host serve --http   then keep this page on http://127.0.0.1:5173",
    ],
  },
  host: {
    title: "Host URL and token",
    body: [
      "Default http://127.0.0.1:8787 is loopback. No token needed.",
      "If Host is bound to 0.0.0.0 it refuses to start without --token / REELFORGE_HOST_TOKEN.",
      "Chip “Host up” is GET /health. If it is down, Privacy except cannot run.",
    ],
  },
  video: {
    title: "Video path",
    body: [
      "This is a path on the Host machine, not a file inside the browser. Upload is not built yet.",
      "Operator: a normal video file (mp4/mkv).",
      "Capture: a session directory, a CaptureProject JSON, or capture:ses_id — committed segments only. Host will not glob the unfinished tail.",
    ],
  },
  photo: {
    title: "Reference photo",
    body: [
      "A JPEG/PNG of the one person who must stay sharp.",
      "Host enrolls the photo, searches the video gallery, and requires an Accept hit.",
      "If search is Review/Reject, the job stops. It will not pick the nearest face.",
    ],
  },
  output: {
    title: "Output",
    body: [
      "Where Host writes the redacted mp4 (again: Host disk).",
      "Source audio is muxed when present. Silent sources stay silent. Dropped audio is an error.",
    ],
  },
  style: {
    title: "Redaction style",
    body: [
      "pixelate — Host default. Preferred for anonymity.",
      "gaussian — recoverable with enough bitrate. Fine for preview, not privacy.",
      "solid — black fill.",
    ],
  },
  accept: {
    title: "Accept (fail-closed)",
    body: [
      "This is the product. No Accept → no output file.",
      "Bad photo, wrong person, missing ONNX (exit 2), or an empty freeze all fail loudly so an agent cannot “guess”.",
    ],
  },
  capture: {
    title: "Capture sessions",
    body: [
      "Capture grabs the screen. Studio/Host only ingest committed media URIs.",
      "Pass the session folder, project.json, or capture:ses_… in Video.",
    ],
  },
  agent: {
    title: "AI agents (MCP)",
    body: [
      "Agents should call Host MCP, not this page. Same tool: privacy_except.",
      "Local: reelforge-host serve   (stdio). GUI already up: reelforge-studio-mcp with REELFORGE_HOST.",
      "Do not stand up a second tool catalog or an LSP. See AGENTS.md.",
    ],
  },
  errors: {
    title: "Common errors",
    body: [
      "Failed to fetch / Host down — start serve --http.",
      "photo search did not Accept — different person or a weak still.",
      "weights not ready — put yolov8n.onnx + person_reid.onnx in SightLoom/.sightloom-models.",
      "video not found — path is on the Host box; Capture tails are ignored.",
    ],
  },
};
