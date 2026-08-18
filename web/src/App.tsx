import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HostClient } from "./api";
import { HELP, type HelpId, type Mode } from "./help";

function explainError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("failed to fetch") || s.includes("networkerror")) {
    return "Host is not reachable. In another terminal: reelforge-host serve --http";
  }
  if (s.includes("accept")) {
    return "Photo search did not Accept. Use a still of the same person; Host will not guess.";
  }
  if (s.includes("weight") || s.includes("onnx")) {
    return "ONNX missing. Place yolov8n.onnx and person_reid.onnx in SightLoom/.sightloom-models (exit 2).";
  }
  if (s.includes("not found") || s.includes("video")) {
    return "Path is on the Host machine. Capture: use a session/project, not a glob of segments/.";
  }
  if (s.includes("unauthorized")) {
    return "Host requires a bearer token off-loopback.";
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
  const help = HELP[topic];

  const videoPh =
    mode === "capture"
      ? "C:\\sessions\\ses_abc   or   project.json   or   capture:ses_abc"
      : "C:\\media\\scene.mp4";

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
    if (mode === "agent") setTopic("agent");
    if (mode === "operator") setTopic("overview");
  }, [mode]);

  async function run() {
    if (!video.trim() || !photo.trim()) {
      setOk(false);
      setHint("Video and photo are paths on the Host machine.");
      setTopic("video");
      setLog("missing video or photo");
      return;
    }
    setBusy(true);
    setLog("running privacy_except…");
    setHint("This can take minutes. Host extracts frames, detects, searches, encodes.");
    try {
      const out = await client().privacyExcept({
        video: video.trim(),
        photo: photo.trim(),
        output: output.trim(),
        style,
      });
      setOk(true);
      setHint("Done. Output is on the Host disk.");
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

  const resultBits = useMemo(() => {
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

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>ReelForge Studio</h1>
          <p className="muted">Keep one person sharp. Redact everyone else. Host does the work.</p>
        </div>
        <div className="top-right">
          <span className={ok === true ? "chip ok" : ok === false ? "chip err" : "chip"}>
            {ok === true ? "Host up" : ok === false ? "Host down" : "checking…"}
          </span>
          <button type="button" className="ghost" onClick={() => setTopic("overview")}>
            Help
          </button>
        </div>
      </header>

      <div className="layout">
        <section className="panel job">
          <div className="modes">
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
                className={mode === id ? "tab on" : "tab"}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <ol className="steps">
            <li>Start Host: <code>reelforge-host serve --http</code></li>
            <li>Video + photo of the person to keep</li>
            <li>Privacy except — stops if photo is not Accept</li>
          </ol>

          <Field
            label="Host"
            helpId="host"
            topic={topic}
            onHelp={setTopic}
          >
            <input value={host} onChange={(e) => setHost(e.target.value)} />
          </Field>
          <Field label="Token" helpId="host" topic={topic} onHelp={setTopic}>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="empty on loopback"
            />
          </Field>
          <Field label="Video" helpId="video" topic={topic} onHelp={setTopic}>
            <input
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder={videoPh}
            />
          </Field>
          <Field label="Photo" helpId="photo" topic={topic} onHelp={setTopic}>
            <input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="C:\\media\\alice.jpg"
            />
          </Field>
          <Field label="Output" helpId="output" topic={topic} onHelp={setTopic}>
            <input value={output} onChange={(e) => setOutput(e.target.value)} />
          </Field>
          <Field label="Style" helpId="style" topic={topic} onHelp={setTopic}>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="pixelate">pixelate — anonymity default</option>
              <option value="gaussian">gaussian — recoverable preview</option>
              <option value="solid">solid — black fill</option>
            </select>
          </Field>

          <div className="row">
            <button type="button" onClick={() => void ping()} disabled={busy}>
              Ping Host
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => void run()}
              disabled={busy || ok === false}
            >
              {busy ? "Running…" : "Privacy except"}
            </button>
          </div>

          {hint && <p className={ok === false ? "banner err" : "banner"}>{hint}</p>}

          {resultBits && (
            <dl className="facts">
              {resultBits.subject_id != null && (
                <>
                  <dt>subject</dt>
                  <dd>{resultBits.subject_id}</dd>
                </>
              )}
              {resultBits.output && (
                <>
                  <dt>file</dt>
                  <dd>{resultBits.output}</dd>
                </>
              )}
              {resultBits.audio && (
                <>
                  <dt>audio</dt>
                  <dd>{resultBits.audio}</dd>
                </>
              )}
            </dl>
          )}

          <pre>{log}</pre>
        </section>

        <aside className="panel help">
          <nav className="toc">
            {(Object.keys(HELP) as HelpId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={topic === id ? "toc-item on" : "toc-item"}
                onClick={() => setTopic(id)}
              >
                {HELP[id].title}
              </button>
            ))}
          </nav>
          <article>
            <h2>{help.title}</h2>
            {help.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </article>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  helpId,
  topic,
  onHelp,
  children,
}: {
  label: string;
  helpId: HelpId;
  topic: HelpId;
  onHelp: (id: HelpId) => void;
  children: ReactNode;
}) {
  return (
    <label className={topic === helpId ? "field focus" : "field"}>
      <span className="field-head">
        {label}
        <button type="button" className="q" onClick={() => onHelp(helpId)} title="Help">
          ?
        </button>
      </span>
      {children}
    </label>
  );
}
