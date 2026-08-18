import { useEffect, useState } from "react";
import { HostClient } from "./api";

type Mode = "operator" | "capture" | "agent";

export default function App() {
  const [host, setHost] = useState("http://127.0.0.1:8787");
  const [token, setToken] = useState("");
  const [video, setVideo] = useState("");
  const [photo, setPhoto] = useState("");
  const [output, setOutput] = useState("out.mp4");
  const [style, setStyle] = useState("pixelate");
  const [mode, setMode] = useState<Mode>("operator");
  const [log, setLog] = useState("checking Host…");
  const [ok, setOk] = useState<boolean | null>(null);

  const client = () => new HostClient(host, token);

  async function ping() {
    try {
      const h = await client().health();
      setOk(h.ok);
      setLog(JSON.stringify(h, null, 2));
    } catch (e) {
      setOk(false);
      setLog(String(e));
    }
  }

  useEffect(() => {
    void ping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!video.trim() || !photo.trim()) {
      setOk(false);
      setLog("video and photo paths required (on the Host machine)");
      return;
    }
    setLog("running privacy_except…");
    try {
      const out = await client().privacyExcept({
        video: video.trim(),
        photo: photo.trim(),
        output: output.trim(),
        style,
      });
      setOk(true);
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      setOk(false);
      setLog(String(e));
    }
  }

  const videoHint =
    mode === "capture"
      ? "session dir, project.json, or capture:ses_…"
      : "C:\\media\\scene.mp4";

  return (
    <main>
      <header>
        <div>
          <h1>ReelForge Studio</h1>
          <p className="muted">
            Control panel for Host. Not a detector. Not Electron.
          </p>
        </div>
        <span className={ok === true ? "chip ok" : ok === false ? "chip err" : "chip"}>
          {ok === true ? "Host up" : ok === false ? "Host down" : "…"}
        </span>
      </header>

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
      <p className="hint">
        {mode === "operator" &&
          "Video + photo of the person to keep sharp. Photo search must Accept or Host stops."}
        {mode === "capture" &&
          "Pass a Capture session or project — Host will not glob the unfinished tail."}
        {mode === "agent" &&
          "Agents should call Host MCP (serve / serve --http), not this page. Same tools: privacy_except."}
      </p>

      <label>
        Host
        <input value={host} onChange={(e) => setHost(e.target.value)} />
      </label>
      <label>
        Token
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="empty on loopback"
        />
      </label>
      <label>
        Video
        <input
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder={videoHint}
        />
      </label>
      <label>
        Photo
        <input
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
          placeholder="C:\\media\\alice.jpg"
        />
      </label>
      <label>
        Output
        <input value={output} onChange={(e) => setOutput(e.target.value)} />
      </label>
      <label>
        Style
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="pixelate">pixelate (anonymity default)</option>
          <option value="gaussian">gaussian (recoverable)</option>
          <option value="solid">solid</option>
        </select>
      </label>
      <div className="row">
        <button type="button" onClick={() => void ping()}>
          Ping Host
        </button>
        <button type="button" className="primary" onClick={() => void run()}>
          Privacy except
        </button>
      </div>
      <pre>{log}</pre>
    </main>
  );
}
