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
export type Style = "pixelate" | "gaussian" | "solid";

export const STYLES: { id: Style; name: string; blurb: string }[] = [
  {
    id: "pixelate",
    name: "Pixelate",
    blurb: "Default. Destroys identity. Nothing recoverable from the mosaic.",
  },
  {
    id: "gaussian",
    name: "Gaussian",
    blurb: "Soft blur. Looks nicer, but a strong blur is partly recoverable. Preview only.",
  },
  {
    id: "solid",
    name: "Solid black",
    blurb: "Hard black plate. Most defensible, least cinematic.",
  },
];

export const MODES: { id: Mode; name: string; tagline: string }[] = [
  { id: "operator", name: "Operator", tagline: "You are running one job by hand." },
  { id: "capture", name: "Capture", tagline: "You are on set, cutting fast, footage still warm." },
  { id: "agent", name: "Agent", tagline: "A script or agent calls the Host. You are wiring it." },
];

export const ERROR_COPY: Record<string, { title: string; body: string; fix: string }> = {
  host_down: {
    title: "ReelForge-Host is not answering",
    body: "Nothing is listening at that address. The Studio is only a control panel — the Host does the work, and it has to be running on the same machine as your footage.",
    fix: "Start ReelForge-Host with serve --http, then hit Check host. If you changed its port, update the host field.",
  },
  unauthorized: {
    title: "The Host refused your token",
    body: "The Host is up but rejected this request. On loopback the token is usually optional; if the Host was started with one, the Studio has to send the same value.",
    fix: "Paste the token the Host printed at startup, or restart the Host without a token for local use.",
  },
  not_accepted: {
    title: "The photo search was not accepted",
    body: "The Host found candidate faces but no confirmed match for your reference photo. It refuses to guess — the nearest face is often the wrong person, and picking wrong means you sharpen a stranger and redact your subject.",
    fix: "Use a clear, front-facing photo of the person to keep sharp, one face only, decent light. Then run it again.",
  },
  missing_onnx: {
    title: "The Host is missing its face model",
    body: "The recognition model (an ONNX file) was not found on the Host machine, so it cannot compare your photo to the footage.",
    fix: "Put yolov8n.onnx + person_reid.onnx in SightLoom/.sightloom-models and restart the Host. The Studio cannot fix this.",
  },
  path_missing: {
    title: "The Host cannot find that path",
    body: "Paths are resolved on the Host machine, not in your browser. A path that exists on your laptop means nothing if the Host runs elsewhere.",
    fix: "Copy the absolute path exactly as the Host machine sees it, including extension.",
  },
  host_error: {
    title: "The Host returned an error",
    body: "The request reached the Host but the job did not complete.",
    fix: "Read the Host message below, then retry. Host logs carry the full trace.",
  },
};

export function classifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("health http"))
    return "host_down";
  if (m.includes("accept")) return "not_accepted";
  if (m.includes("onnx") || m.includes("model") || m.includes("weight")) return "missing_onnx";
  if (m.includes("unauthor") || m.includes("token")) return "unauthorized";
  if (m.includes("no such file") || m.includes("not found") || m.includes("enoent"))
    return "path_missing";
  return "host_error";
}

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
