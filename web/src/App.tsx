import { useState } from "react";
import { HostClient } from "./api";

export default function App() {
  const [host, setHost] = useState("http://127.0.0.1:8787");
  const [token, setToken] = useState("");
  const [video, setVideo] = useState("");
  const [photo, setPhoto] = useState("");
  const [output, setOutput] = useState("out.mp4");
  const [style, setStyle] = useState("pixelate");
  const [log, setLog] = useState(
    "Host must already be running: reelforge-host serve --http\nPaths are on the Host machine, not the browser.",
  );
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

  async function run() {
    if (!video.trim() || !photo.trim()) {
      setOk(false);
      setLog("video and photo paths required");
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

  return (
    <main>
      <h1>ReelForge Studio</h1>
      <p className="muted">
        React + Vite · no Electron · same Host HTTP as the egui desktop
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
        />
      </label>
      <label>
        Video
        <input
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="C:\\media\\scene.mp4"
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
          <option value="pixelate">pixelate</option>
          <option value="gaussian">gaussian</option>
          <option value="solid">solid</option>
        </select>
      </label>
      <div className="row">
        <button type="button" onClick={() => void ping()}>
          Ping Host
        </button>
        <button type="button" onClick={() => void run()}>
          Privacy except
        </button>
        {ok !== null && <span className={ok ? "ok" : "err"}>{ok ? "ok" : "error"}</span>}
      </div>
      <pre>{log}</pre>
    </main>
  );
}
