import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HostClient } from "./api";
import { HelpRail } from "./HelpRail";
import {
  ERROR_COPY,
  MODES,
  STYLES,
  classifyError,
  type Mode,
  type Style,
} from "./help";

type HostStatus =
  | { state: "unknown" }
  | { state: "checking" }
  | { state: "up"; name?: string; protocolVersion?: string }
  | { state: "down"; reason: string };

const MODE_HINTS: Record<Mode, { video: string; photo: string; output: string }> = {
  operator: {
    video: "Absolute path on the Host machine.",
    photo: "One clear photo of the person who stays sharp.",
    output: "Written next to the Host's working directory unless absolute.",
  },
  capture: {
    video: "Session dir, project.json, or capture:ses_… — committed media only.",
    photo: "Keep one reference still per subject in the same folder.",
    output: "Name it by slate so you can find it in the edit.",
  },
  agent: {
    video: "Maps to arguments.video in the JSON-RPC call.",
    photo: "Maps to arguments.photo. Required — no default subject.",
    output: "Maps to arguments.output.",
  },
};

export default function App() {
  const [mode, setMode] = useState<Mode>("operator");
  const [host, setHost] = useState("http://127.0.0.1:8787");
  const [token, setToken] = useState("");
  const [video, setVideo] = useState("");
  const [photo, setPhoto] = useState("");
  const [output, setOutput] = useState("out.mp4");
  const [style, setStyle] = useState<Style>("pixelate");

  const [status, setStatus] = useState<HostStatus>({ state: "unknown" });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: string; detail?: string } | null>(null);
  const [touched, setTouched] = useState(false);

  const client = () => new HostClient(host, token);
  const hints = MODE_HINTS[mode];

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!host.trim()) e.host = "The Studio needs a Host address to talk to.";
    else if (!/^https?:\/\//i.test(host.trim())) e.host = "Start with http:// or https://.";
    if (!video.trim()) e.video = "Paste the video path as it exists on the Host machine.";
    if (!photo.trim())
      e.photo = "A reference photo is required. Without it the Host has no subject to keep sharp.";
    if (!output.trim()) e.output = "Give the output file a name.";
    return e;
  }, [host, video, photo, output]);

  const payload = useMemo(
    () =>
      JSON.stringify(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "privacy_except",
            arguments: {
              video: video || "…",
              photo: photo || "…",
              output: output || "out.mp4",
              style,
            },
          },
        },
        null,
        2,
      ),
    [video, photo, output, style],
  );

  async function onCheck() {
    setStatus({ state: "checking" });
    try {
      const h = await client().health();
      if (!h.ok) throw new Error("Host reported ok:false.");
      setStatus({ state: "up", name: h.name, protocolVersion: h.protocolVersion });
    } catch (err) {
      setStatus({ state: "down", reason: classifyError(String(err)) });
    }
  }

  useEffect(() => {
    void onCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRun() {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setRunning(true);
    setResult(null);
    setFailure(null);
    try {
      const out = await client().privacyExcept({
        video: video.trim(),
        photo: photo.trim(),
        output: output.trim(),
        style,
      });
      setResult(typeof out === "string" ? out : JSON.stringify(out, null, 2));
    } catch (err) {
      const detail = String(err);
      setFailure({ kind: classifyError(detail), detail });
    } finally {
      setRunning(false);
    }
  }

  const showError = (k: string) => touched && errors[k];

  return (
    <div className="min-h-screen bg-background">
      <div className="hairline-grid border-b border-border">
        <header className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 bg-primary" />
              <span className="font-mono text-xs tracking-[0.24em] uppercase">ReelForge Studio</span>
            </div>
            <HostChip status={status} onCheck={() => void onCheck()} />
          </div>

          <div className="max-w-3xl">
            <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              Keep one face sharp.
              <br />
              <span className="text-primary">Redact everyone else.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              A control panel for ReelForge-Host. You give it a video path and one reference photo.
              It confirms that person, then pixelates, blurs or blacks out every other face in the
              frame. No uploads, no cloud, no guessing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`border px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors ${
                  mode === m.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.name}
              </button>
            ))}
            <span className="self-center pl-2 text-sm text-muted-foreground">
              {MODES.find((m) => m.id === mode)!.tagline}
            </span>
          </div>
        </header>
      </div>

      <main className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14 lg:px-10">
        <div className="space-y-12">
          <Step num="01" title="Connect the Host" kicker="Where the work happens">
            <Field
              label="Host address"
              hint="The Studio only talks to this address. Loopback by default."
              error={showError("host") ? errors.host : undefined}
            >
              <input
                className="field-input"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                aria-invalid={Boolean(showError("host"))}
                placeholder="http://127.0.0.1:8787"
                spellCheck={false}
              />
            </Field>
            <Field label="Token" hint="Optional on loopback. Required if the Host was started with one.">
              <input
                className="field-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="empty for local use"
                type="password"
                spellCheck={false}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void onCheck()}
                className="border border-border-strong px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors hover:border-primary hover:text-primary"
              >
                {status.state === "checking" ? "Checking…" : "Check host"}
              </button>
              {status.state === "up" && (
                <span className="font-mono text-xs text-success">
                  {status.name ?? "reelforge-host"}
                  {status.protocolVersion ? ` · protocol ${status.protocolVersion}` : ""}
                </span>
              )}
            </div>
            {status.state === "down" && <ErrorPanel kind={status.reason} />}
            {status.state === "unknown" && (
              <EmptyLine text="Host not checked yet. Nothing has been sent." />
            )}
          </Step>

          <Step num="02" title="Point at the footage" kicker="Paths live on the Host machine">
            <Field
              label="Video path"
              hint={hints.video}
              error={showError("video") ? errors.video : undefined}
            >
              <input
                className="field-input"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                aria-invalid={Boolean(showError("video"))}
                placeholder={
                  mode === "capture" ? "session dir · project.json · capture:ses_…" : "D:\\shoot\\reel_a.mp4"
                }
                spellCheck={false}
              />
            </Field>
            <Field
              label="Reference photo — the one person to keep sharp"
              hint={hints.photo}
              error={showError("photo") ? errors.photo : undefined}
            >
              <input
                className="field-input"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                aria-invalid={Boolean(showError("photo"))}
                placeholder="D:\\shoot\\subject.jpg"
                spellCheck={false}
              />
            </Field>
            <Field
              label="Output file"
              hint={hints.output}
              error={showError("output") ? errors.output : undefined}
            >
              <input
                className="field-input"
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                aria-invalid={Boolean(showError("output"))}
                placeholder="out.mp4"
                spellCheck={false}
              />
            </Field>
            <p className="border-l-2 border-primary pl-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
              There is no file picker. Browser uploads would copy your footage into a web page and
              throw away the path the Host actually needs.
            </p>
          </Step>

          <Step num="03" title="Choose the redaction" kicker="Then fire the job">
            <div className="grid gap-3 sm:grid-cols-3">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`border p-4 text-left transition-colors ${
                    style === s.id
                      ? "border-primary bg-card"
                      : "border-border bg-paper hover:border-border-strong"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    {s.id === "pixelate" && <span className="label-mono">default</span>}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                    {s.blurb}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => void onRun()}
                disabled={running}
                className="bg-primary px-6 py-3 text-sm font-semibold tracking-tight text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {running ? "Running on Host…" : "Privacy except"}
              </button>
              <span className="text-xs text-muted-foreground">
                The Host must Accept the photo match. If it does not, the job fails instead of
                guessing.
              </span>
            </div>

            {failure && <ErrorPanel kind={failure.kind} detail={failure.detail} />}
            {result && (
              <div className="border border-success/40 bg-card p-5">
                <p className="label-mono !text-success">Accepted</p>
                <pre className="mt-2 overflow-x-auto font-mono text-[0.75rem] leading-relaxed">
                  {result}
                </pre>
                <p className="mt-3 font-mono text-xs text-muted-foreground">→ {output}</p>
              </div>
            )}
            {!failure && !result && !running && (
              <EmptyLine text="No job run yet. Output appears here with the Host's own message." />
            )}
          </Step>

          <section className="border border-border bg-paper">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="label-mono">Request preview · POST {host || "…"}/mcp</h3>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(payload)}
                className="label-mono transition-colors hover:text-primary"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.75rem] leading-relaxed text-muted-foreground">
              {payload}
            </pre>
          </section>
        </div>

        <HelpRail mode={mode} />
      </main>

      <footer className="border-t border-border px-6 py-8 lg:px-10">
        <p className="mx-auto max-w-[1240px] font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-muted-foreground">
          ReelForge Studio · control panel only · nothing leaves your machine
        </p>
      </footer>
    </div>
  );
}

function HostChip({ status, onCheck }: { status: HostStatus; onCheck: () => void }) {
  const map: Record<HostStatus["state"], { label: string; cls: string }> = {
    unknown: { label: "Host unchecked", cls: "text-muted-foreground" },
    checking: { label: "Checking host", cls: "text-primary" },
    up: { label: "Host online", cls: "text-success" },
    down: { label: "Host unreachable", cls: "text-destructive" },
  };
  const s = map[status.state];
  return (
    <button
      type="button"
      onClick={onCheck}
      className="flex items-center gap-2 border border-border-strong px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors hover:border-primary"
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${s.cls}`} />
      <span className={s.cls}>{s.label}</span>
    </button>
  );
}

function Step({
  num,
  title,
  kicker,
  children,
}: {
  num: string;
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-4 border-b border-border pb-4">
        <span className="step-num">{num}</span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{kicker}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="label-mono block">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}

function ErrorPanel({ kind, detail }: { kind: string; detail?: string }) {
  const copy = ERROR_COPY[kind] ?? ERROR_COPY.host_error;
  return (
    <div className="border border-destructive/50 bg-card p-5">
      <p className="label-mono !text-destructive">Blocked</p>
      <h4 className="mt-2 text-sm font-semibold">{copy.title}</h4>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{copy.body}</p>
      <p className="mt-3 text-[0.8125rem] leading-relaxed">
        <span className="label-mono !text-primary">Fix · </span>
        {copy.fix}
      </p>
      {detail && (
        <pre className="mt-4 overflow-x-auto border-t border-border pt-3 font-mono text-[0.7rem] text-muted-foreground">
          {detail}
        </pre>
      )}
    </div>
  );
}
