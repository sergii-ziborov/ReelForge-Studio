import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HostClient } from "./api";
import { HELP, type HelpId, type Mode } from "./help";

function explainError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("failed to fetch") || s.includes("networkerror")) {
    return "Host is not reachable. Run: reelforge-host serve --http";
  }
  if (s.includes("accept")) {
    return "Photo search did not Accept. Same person, clearer still. Host will not guess.";
  }
  if (s.includes("weight") || s.includes("onnx")) {
    return "ONNX missing: yolov8n.onnx + person_reid.onnx in SightLoom/.sightloom-models";
  }
  if (s.includes("unauthorized")) {
    return "Off-loopback Host needs a bearer token.";
  }
  return raw;
}

export default function App() {
  const [host, setHost] = useState("http://127.0.0.1:8787");
  const [token, setToken] = useState("");
  const [video, setVideo] = useState("");
  const [photo, setPhoto] = useState("");
  const [output, setOutput] = useState("out.mp4");
  const [style, setStyle] = useState("pixelate");
  const [mode, setMode] = useState<Mode>("operator");
  const [topic, setTopic] = useState<HelpId>("overview");
  const [log, setLog] = useState("checking Host…");
  const [hint, setHint] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const client = () => new HostClient(host, token);

  async function ping() {
    try {
      const h = await client().health();
      setOk(h.ok);
      setHint(null);
      setLog(JSON.stringify(h, null, 2));
    } catch (e) {
      setOk(false);
      const raw = String(e);
      setHint(explainError(raw));
      setLog(raw);
      setTopic("host");
    }
  }

  useEffect(() => {
    void ping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "capture") setTopic("capture");
    else if (mode === "agent") setTopic("agent");
    else setTopic("overview");
  }, [mode]);

  async function run() {
    if (!video.trim() || !photo.trim()) {
      setOk(false);
      setHint("Video and photo are paths on the Host machine — not browser uploads.");
      setTopic("video");
      setLog("missing video or photo");
      return;
    }
    setBusy(true);
    setLog("running privacy_except…");
    setHint("Host extracts, detects, searches, encodes. This can take minutes.");
    try {
      const out = await client().privacyExcept({
        video: video.trim(),
        photo: photo.trim(),
        output: output.trim(),
        style,
      });
      setOk(true);
      setHint("Done. The file is on the Host disk.");
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      const raw = String(e);
      setOk(false);
      setHint(explainError(raw));
      setLog(raw);
      setTopic("errors");
    } finally {
      setBusy(false);
    }
  }

  const facts = useMemo(() => {
    try {
      const v = JSON.parse(log) as {
        subject_id?: number;
        output?: string;
        audio?: string;
      };
      if (v.subject_id == null && !v.output) return null;
      return v;
    } catch {
      return null;
    }
  }, [log]);

  const videoPh =
    mode === "capture"
      ? "session dir · project.json · capture:ses_…"
      : "C:\\media\\scene.mp4";

  return (
    <div className="min-h-screen">
      <header className="flex items-start justify-between gap-4 px-6 py-5 md:px-10">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-flare uppercase">
            ReelForge
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Studio</h1>
          <p className="mt-1 max-w-xl text-sm text-mute">
            One person stays sharp. Everyone else is redacted. This page only
            talks to Host.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              ok === true
                ? "border-flare/40 text-flare"
                : ok === false
                  ? "border-red-400/40 text-red-300"
                  : "border-line text-mute"
            }`}
          >
            {ok === true ? "Host live" : ok === false ? "Host down" : "…"}
          </span>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-xs text-mute hover:text-white"
            onClick={() => setTopic("overview")}
          >
            Help
          </button>
        </div>
      </header>

      <div className="grid gap-4 px-6 pb-10 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:px-10">
        <section className="rounded-2xl border border-line bg-panel/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["operator", "Operator"],
                ["capture", "Capture"],
                ["agent", "Agent"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-full px-3 py-1 text-sm ${
                  mode === id
                    ? "bg-flare text-ink"
                    : "border border-line text-mute hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <ol className="mb-5 space-y-1 font-mono text-[12px] text-mute">
            <li>01  reelforge-host serve --http</li>
            <li>02  video + photo of the person to keep</li>
            <li>03  privacy except — no Accept, no file</li>
          </ol>

          <Field label="Host" id="host" topic={topic} onHelp={setTopic}>
            <input
              className="field-input"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </Field>
          <Field label="Token" id="host" topic={topic} onHelp={setTopic}>
            <input
              className="field-input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="empty on loopback"
            />
          </Field>
          <Field label="Video" id="video" topic={topic} onHelp={setTopic}>
            <input
              className="field-input"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder={videoPh}
            />
          </Field>
          <Field label="Photo" id="photo" topic={topic} onHelp={setTopic}>
            <input
              className="field-input"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="C:\\media\\alice.jpg"
            />
          </Field>
          <Field label="Output" id="output" topic={topic} onHelp={setTopic}>
            <input
              className="field-input"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
          </Field>
          <Field label="Style" id="style" topic={topic} onHelp={setTopic}>
            <select
              className="field-input"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              <option value="pixelate">pixelate — anonymity</option>
              <option value="gaussian">gaussian — recoverable</option>
              <option value="solid">solid — black</option>
            </select>
          </Field>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void ping()}
              className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-white disabled:opacity-40"
            >
              Ping Host
            </button>
            <button
              type="button"
              disabled={busy || ok === false}
              onClick={() => void run()}
              className="rounded-lg bg-flare px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
            >
              {busy ? "Running…" : "Privacy except"}
            </button>
          </div>

          {hint && (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                ok === false
                  ? "border-red-400/30 bg-red-400/5 text-red-200"
                  : "border-line bg-black/20 text-mute"
              }`}
            >
              {hint}
            </p>
          )}

          {facts && (
            <dl className="mt-4 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
              {facts.subject_id != null && (
                <>
                  <dt className="text-mute">subject</dt>
                  <dd className="font-mono">{facts.subject_id}</dd>
                </>
              )}
              {facts.output && (
                <>
                  <dt className="text-mute">file</dt>
                  <dd className="break-all font-mono text-xs">{facts.output}</dd>
                </>
              )}
              {facts.audio && (
                <>
                  <dt className="text-mute">audio</dt>
                  <dd className="font-mono">{facts.audio}</dd>
                </>
              )}
            </dl>
          )}

          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-line bg-ink p-3 font-mono text-[11px] text-mute">
            {log}
          </pre>
        </section>

        <aside className="sticky top-4 rounded-2xl border border-line bg-panel/80 p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(Object.keys(HELP) as HelpId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTopic(id)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  topic === id
                    ? "bg-white/10 text-white"
                    : "text-mute hover:text-white"
                }`}
              >
                {HELP[id].title}
              </button>
            ))}
          </div>
          <h2 className="text-lg font-medium tracking-tight">{HELP[topic].title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-mute">
            {HELP[topic].body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  topic,
  onHelp,
  children,
}: {
  label: string;
  id: HelpId;
  topic: HelpId;
  onHelp: (id: HelpId) => void;
  children: ReactNode;
}) {
  return (
    <label className="mt-3 block text-xs text-mute">
      <span className="mb-1 flex items-center justify-between">
        {label}
        <button
          type="button"
          className={`h-5 w-5 rounded-full border text-[11px] ${
            topic === id ? "border-flare text-flare" : "border-line"
          }`}
          onClick={() => onHelp(id)}
        >
          ?
        </button>
      </span>
      <span className="block [&_.field-input]:w-full [&_.field-input]:rounded-lg [&_.field-input]:border [&_.field-input]:border-line [&_.field-input]:bg-ink [&_.field-input]:px-3 [&_.field-input]:py-2 [&_.field-input]:text-sm [&_.field-input]:text-white">
        {children}
      </span>
    </label>
  );
}
