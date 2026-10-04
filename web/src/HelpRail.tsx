import { useState } from "react";
import { type Mode } from "./help";

type Topic = {
  id: string;
  title: string;
  body: (mode: Mode) => string[];
};

const MODE_NOTE: Record<Mode, string> = {
  operator: "One job, done carefully. Read each step before you fire it.",
  capture:
    "On set: keep paths short, keep a single reference photo per subject in the same folder as the footage.",
  agent:
    "Automating: every field here maps 1:1 to a JSON-RPC argument. Copy the request payload and drive the Host directly.",
};

const TOPICS: Topic[] = [
  {
    id: "host",
    title: "Host",
    body: (mode) => [
      "ReelForge Studio never touches video. It sends instructions to ReelForge-Host, a small server running on the machine that holds your footage.",
      "Default address is http://127.0.0.1:8787. GET /health should answer {\"ok\":true}. Jobs go to POST /mcp as JSON-RPC tools/call privacy_except.",
      mode === "agent"
        ? "A token is optional on loopback. Expose the Host beyond localhost and you must set one, sent as Authorization: Bearer."
        : "On your own machine you can leave the token empty.",
    ],
  },
  {
    id: "video",
    title: "Video path",
    body: (mode) => [
      "Type or paste an absolute path as the Host machine sees it, e.g. D:\\shoot\\reel_a.mp4.",
      "There is no file picker on purpose. A browser upload would copy gigabytes of footage through the page and lose the original path the Host needs.",
      mode === "capture"
        ? "Capture: a session directory, a CaptureProject JSON, or capture:ses_id — committed segments only. Host will not glob the unfinished tail."
        : "Relative paths resolve against the Host's working directory — absolute is safer.",
    ],
  },
  {
    id: "photo",
    title: "Reference photo",
    body: () => [
      "One photo of the one person who stays sharp. Everyone else in the frame gets redacted.",
      "Best results: single face, front-facing, eyes visible, even light, no heavy sunglasses or motion blur.",
      "The photo is a reference, not a crop source. It never appears in the output.",
    ],
  },
  {
    id: "style",
    title: "Redaction style",
    body: () => [
      "Pixelate — default. Mosaic large enough to destroy identity. Use this when the output leaves your control.",
      "Gaussian — softer and prettier, but a blur can be partially reversed. Treat it as a preview look, not a privacy guarantee.",
      "Solid black — an opaque plate. Most defensible for legal or compliance deliverables.",
    ],
  },
  {
    id: "accept",
    title: "Why Accept matters",
    body: () => [
      "The Host only proceeds when the photo search returns an accepted match. If confidence is short, the job fails instead of guessing.",
      "Never pick the nearest face. Nearest-face logic inverts the whole job: your subject gets blurred and a stranger gets published sharp.",
      "If you see \"not accepted\", change the photo — not the threshold.",
    ],
  },
  {
    id: "errors",
    title: "When it fails",
    body: () => [
      "Host down — nothing is listening. Start: reelforge-host serve --http",
      "Not accepted — the reference photo did not confirm. Swap the photo.",
      "Missing ONNX — yolov8n.onnx + person_reid.onnx in SightLoom/.sightloom-models.",
      "Unauthorized — the Host was started with a token; paste the same one.",
    ],
  },
];

export function HelpRail({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState<string>("host");

  return (
    <aside className="lg:sticky lg:top-8">
      <div className="border border-border bg-paper">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
          <h2 className="label-mono !text-foreground">Help rail</h2>
          <span className="label-mono">{mode}</span>
        </div>
        <p className="border-b border-border px-5 py-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {MODE_NOTE[mode]}
        </p>
        <ul>
          {TOPICS.map((t) => {
            const isOpen = open === t.id;
            return (
              <li key={t.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? "" : t.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium transition-colors hover:bg-secondary/60"
                >
                  <span className={isOpen ? "text-primary" : "text-foreground"}>{t.title}</span>
                  <span className="label-mono">{isOpen ? "—" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 px-5 pb-5 pt-0">
                    {t.body(mode).map((p) => (
                      <p key={p} className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
        Studio sends instructions only. No detection, no encoding, no uploads — all of that happens
        inside ReelForge-Host, on your machine.
      </p>
    </aside>
  );
}
