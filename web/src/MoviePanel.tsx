import { useEffect, useState } from "react";
import { HostClient } from "./api";

type Inspection = {
  producer_active: boolean;
  interrupted: boolean;
  requires_rebuild: boolean;
  external_changed_nodes: string[];
  external_invalidated_nodes: string[];
  output_url?: string | null;
  graph?: { nodes: unknown[]; edges: unknown[] };
  project: {
    request: { id: string; prompt: string; max_images: number };
    revision: number;
    status: string;
    stage: string;
    error?: string | null;
    images_used: number;
    invalidated_nodes: string[];
    changed_nodes: string[];
    plan?: { title: string; synopsis: string } | null;
    qc?: { frames: number; duration: number; status: string } | null;
  };
};

const stages: Record<string, string> = {
  plan: "Готовим сценарий и постановку",
  assets: "Создаём материалы",
  motion: "Строим движение объектов",
  encode: "Собираем видео",
  quality: "Проверяем готовый файл",
  complete: "Видео готово",
};

export function MoviePanel({ host, token }: { host: string; token: string }) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(10);
  const [budget, setBudget] = useState(10);
  const [id, setId] = useState(() => localStorage.getItem("reelforge-movie-id") ?? "");
  const [openId, setOpenId] = useState(id);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [change, setChange] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const client = () => new HostClient(host, token);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = (await new HostClient(host, token).call("movie_inspect", { id })) as Inspection;
        if (!alive) return;
        setInspection(result);
        if (result.producer_active) timer = setTimeout(() => void poll(), 1800);
      } catch (e) {
        if (alive) setError(String(e));
      }
    }
    void poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [id, host, token, busy]);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    setPreview("");
    if (!inspection?.output_url || inspection.project.status !== "completed") return;
    const path = `${host.replace(/\/$/, "")}${inspection.output_url}`;
    void fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async r => { if (!r.ok) throw new Error(`Видео недоступно (${r.status})`); return r.blob(); })
      .then(blob => { if (!alive) return; objectUrl = URL.createObjectURL(blob); setPreview(objectUrl); })
      .catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [inspection?.output_url, inspection?.project.status, inspection?.project.revision, host, token]);

  async function create() {
    if (!prompt.trim()) { setError("Опишите, что должно происходить в видео."); return; }
    setBusy(true); setError("");
    const movieId = `movie-${crypto.randomUUID()}`;
    try {
      const result = (await client().call("movie_create", {
        id: movieId, prompt: prompt.trim(), duration, width: 1280, height: 720, fps: 24, max_images: budget,
      })) as Inspection;
      localStorage.setItem("reelforge-movie-id", movieId); setId(movieId); setInspection(result);
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }

  async function command(name: string, args: unknown) {
    setBusy(true); setError("");
    try { setInspection((await client().call(name, args)) as Inspection); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }

  const running = inspection?.producer_active ?? false;
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-10 lg:px-10" aria-labelledby="movie-heading">
      <h2 id="movie-heading" className="text-3xl font-semibold">Видео по описанию</h2>
      <p className="mt-3 text-muted-foreground">Опишите сцену и действие. Проект сохранит материалы, движение и историю ваших изменений.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label htmlFor="open-movie">Сохранённый проект<input id="open-movie" className="ml-3 rounded border bg-background p-2" value={openId} onChange={e => setOpenId(e.target.value)} placeholder="Идентификатор проекта" /></label>
        <button disabled={busy || !openId.trim()} className="underline" onClick={() => { localStorage.setItem("reelforge-movie-id", openId.trim()); setInspection(null); setError(""); setId(openId.trim()); void command("movie_inspect", { id: openId.trim() }); }}>Открыть проект</button>
      </div>
      <label className="mt-6 block font-medium" htmlFor="movie-prompt">Что должно происходить?</label>
      <textarea id="movie-prompt" className="mt-2 min-h-32 w-full rounded border border-border bg-background p-4" value={prompt}
        onChange={e => setPrompt(e.target.value)} placeholder="Например: реклама ECHO — герой собирает искры, его эхо повторяет прежний путь, открывается портал…" />
      <div className="mt-4 flex flex-wrap items-end gap-5">
        <label>Длительность, сек.<input aria-label="Длительность" type="number" min={1} max={30} value={duration} onChange={e => setDuration(Number(e.target.value))} className="ml-2 w-20 rounded border bg-background p-2" /></label>
        <label>Лимит изображений на видео<input aria-label="Лимит изображений" type="number" min={1} max={100} value={budget} onChange={e => setBudget(Number(e.target.value))} className="ml-2 w-20 rounded border bg-background p-2" /></label>
        <button type="button" disabled={busy || running} onClick={() => void create()} className="rounded bg-primary px-6 py-3 text-primary-foreground disabled:opacity-50">Создать видео</button>
      </div>
      {error && <p role="alert" className="mt-4 text-red-400">{error}</p>}
      {inspection && <div className="mt-6 rounded border border-border p-5" aria-live="polite">
        <p className="font-medium">{inspection.requires_rebuild ? "Сохранённая сцена требует пересборки" : inspection.interrupted ? "Сборка была прервана — можно продолжить" : inspection.project.status === "failed" ? "Сборка остановлена" : inspection.project.status === "cancelled" ? "Сборка отменена" : stages[inspection.project.stage] ?? "Создаём материал сцены"}</p>
        <p className="mt-2 text-sm text-muted-foreground">Изображения: {inspection.project.images_used} из {inspection.project.request.max_images}. Версия проекта: {inspection.project.revision}.</p>
        {inspection.project.error && <p className="mt-3 text-red-400">{inspection.project.error}</p>}
        {inspection.project.plan && <details className="mt-3"><summary>{inspection.project.plan.title}</summary><p className="mt-2 whitespace-pre-wrap">{inspection.project.plan.synopsis}</p></details>}
        {running && <button className="mt-4 underline" onClick={() => void command("movie_cancel", { id })}>Остановить сборку</button>}
        {!running && inspection.project.status !== "completed" && <button disabled={busy} className="mt-4 underline" onClick={() => void command("movie_resume", { id })}>Продолжить сохранённый проект</button>}
        {!running && inspection.project.plan && <button disabled={busy} className="ml-4 mt-4 underline" onClick={() => void command("movie_rebuild", { id, base_revision: inspection.project.revision })}>Пересобрать сохранённую сцену</button>}
        <details className="mt-4 text-sm"><summary>Связи и изменения</summary>
          <p className="mt-2">Связанных элементов: {inspection.graph?.nodes.length ?? 0}. Связей: {inspection.graph?.edges.length ?? 0}.</p>
          <p>Изменено: {inspection.project.changed_nodes.join(", ") || "нет"}.</p>
          <p>Пересобирается: {inspection.project.invalidated_nodes.join(", ") || "нет"}.</p>
          {inspection.external_changed_nodes?.length > 0 && <p>Изменились сохранённые ресурсы: {inspection.external_changed_nodes.join(", ")}.</p>}
        </details>
        {preview && <><video className="mt-5 w-full rounded" src={preview} controls preload="metadata" onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(0.2, event.currentTarget.duration / 2); }} /><a className="mt-3 inline-block underline" href={preview} download="movie.mp4">Скачать видео</a></>}
        {!running && inspection.project.status === "completed" && <div className="mt-5">
          <label htmlFor="movie-change">Что изменить в сохранённом проекте?</label>
          <input id="movie-change" className="mt-2 w-full rounded border bg-background p-3" value={change} onChange={e => setChange(e.target.value)} />
          <button disabled={busy || !change.trim()} className="mt-3 rounded bg-primary px-5 py-3 text-primary-foreground" onClick={() => void command("movie_revise", { id, base_revision: inspection.project.revision, prompt: `${inspection.project.request.prompt}\nИзменение: ${change}` })}>Применить изменение</button>
        </div>}
      </div>}
    </section>
  );
}
