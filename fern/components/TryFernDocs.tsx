declare const React: any;
const { useEffect, useRef, useState } = React;

// Ported from fern-api/marketing-site src/components/try-fern-docs.tsx. Custom docs components can't import packages, so icons and styles are inline.

// The dashboard runs the guest build.
const API_ORIGIN = "https://dashboard.buildwithfern.com";
const POLL_MS = 3000;
// Matches the dashboard's spec size cap.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
// The server never hands out a running job's ID, so this browser keeps its own to resume after a reload.
const JOB_STORAGE_KEY = "try-fern-docs-job";
const SAMPLE_SPEC_NAME = "Plant Store sample API";
const SPEC_ACCEPT = ".json,.yaml,.yml,application/json,application/yaml,text/yaml";
const MARKDOWN_FALLBACK =
  "_The web version of this page has an interactive card here that publishes a docs site and generates a TypeScript SDK from your OpenAPI spec or the Plant Store sample API._";

type Product = "docs" | "sdk";
type Mode = "sample" | "upload";
type Step = "fetching-spec" | "building" | "starting-site" | "live" | "failed";

interface JobStatus {
  jobId: string;
  step: Step;
  product?: Product;
  docsUrl?: string;
  sdkBuildUrl?: string;
  claimUrl?: string;
  expiresAt?: string;
  log?: string[];
  error?: string;
}

const PRODUCTS: Product[] = ["docs", "sdk"];

const STEP_LABELS: Record<Product, Record<Step, string>> = {
  docs: {
    "fetching-spec": "Reading the spec",
    building: "Building your docs site",
    "starting-site": "Starting the site",
    live: "Your docs site is live",
    failed: "The build failed",
  },
  sdk: {
    "fetching-spec": "Reading the spec",
    building: "Generating a TypeScript SDK",
    "starting-site": "Generating a TypeScript SDK",
    live: "Your TypeScript SDK is ready",
    failed: "The build failed",
  },
};

const INTRO =
  "Drop your OpenAPI spec or add the Plant Store sample API, then publish a docs site, generate a TypeScript SDK, or both. Fern builds each one as a guest and gives you a link and a claim link.";

/* ─── Inline icons (lucide paths) ─── */

function Icon({ size = 16, className = "", children }: { size?: number; className?: string; children?: any }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const CloudUploadIcon = (p: any) => (
  <Icon {...p}>
    <path d="M12 13v8" />
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="m8 17 4-4 4 4" />
  </Icon>
);
const FileCodeIcon = (p: any) => (
  <Icon {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="m10 12-2 2 2 2" />
    <path d="m14 16 2-2-2-2" />
  </Icon>
);
const XIcon = (p: any) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);
const CheckIcon = (p: any) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);
const BookOpenIcon = (p: any) => (
  <Icon {...p}>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </Icon>
);
const PackageIcon = (p: any) => (
  <Icon {...p}>
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
    <path d="M12 22V12" />
    <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
    <path d="m7.5 4.27 9 5.15" />
  </Icon>
);
const ArrowRightIcon = (p: any) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);
const ArrowUpRightIcon = (p: any) => (
  <Icon {...p}>
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </Icon>
);
const LoaderIcon = (p: any) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </Icon>
);

const BUILD_OPTIONS: Record<Product, { icon: any; title: string; description: string }> = {
  docs: { icon: BookOpenIcon, title: "Publish docs site", description: "Hosted docs for your API" },
  sdk: { icon: PackageIcon, title: "Generate TypeScript SDK", description: "A client library to download" },
};

const STYLES = `
.tfd { margin: 2rem 0; padding: 1.25rem; border: 1px solid var(--border, var(--grayscale-a5)); border-radius: 0.75rem; background: var(--grayscale-a2, transparent); font-size: 0.875rem; line-height: 1.5; }
.tfd p { margin: 0; }
.tfd-eyebrow { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; color: var(--grayscale-a11); margin-bottom: 0.25rem !important; }
.tfd-intro { margin-bottom: 1rem !important; }
.tfd-form { display: flex; flex-direction: column; gap: 0.75rem; }
.tfd-muted { color: var(--grayscale-a11); }
.tfd-small { font-size: 0.75rem; }
.tfd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border: 1px solid var(--border, var(--grayscale-a5)); border-radius: 0.5rem; background: transparent; color: inherit; font: inherit; cursor: pointer; transition: border-color 0.15s, background-color 0.15s, color 0.15s; }
.tfd-btn:hover:not(:disabled) { border-color: var(--grayscale-a8); background: var(--grayscale-a3); }
.tfd-btn:focus-visible { outline: 2px solid var(--accent, var(--accent-9)); outline-offset: 2px; }
.tfd-btn:disabled { cursor: not-allowed; opacity: 0.5; }
.tfd-drop { width: 100%; min-height: 9rem; flex-direction: column; gap: 0.25rem; padding: 1.5rem; border-style: dashed; color: var(--grayscale-a11); }
.tfd-drop:hover:not(:disabled), .tfd-drop.is-dragging { color: var(--grayscale-12); }
.tfd-drop.is-dragging { border-color: var(--grayscale-12); background: var(--grayscale-a3); }
.tfd-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.tfd-file { display: flex; min-width: 0; align-items: center; gap: 0.75rem; }
.tfd-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tfd-actions { display: flex; flex-shrink: 0; align-items: center; gap: 0.25rem; }
.tfd-icon-btn { width: 1.5rem; height: 1.5rem; border-color: transparent; }
.tfd-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.5rem; border-radius: 9999px; background: var(--grayscale-a3); color: var(--green-11, #16a34a); font-size: 0.75rem; }
.tfd-sample { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.25rem 0 0.25rem 0.75rem; border-left: 1px solid var(--border, var(--grayscale-a5)); }
.tfd-add { padding: 0.125rem 0.625rem; font-size: 0.75rem; }
.tfd-choose { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.tfd-options { display: grid; gap: 0.5rem; }
@media (min-width: 640px) { .tfd-options { grid-template-columns: 1fr 1fr; } }
.tfd-option { width: 100%; justify-content: flex-start; gap: 0.75rem; padding: 0.75rem; text-align: left; }
.tfd-option.is-busy:disabled { border-color: var(--grayscale-12); opacity: 1; }
.tfd-option-icon { display: flex; width: 2.25rem; height: 2.25rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.375rem; background: var(--grayscale-a3); }
.tfd-option-text { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.tfd-option-title { font-weight: 500; }
.tfd-results { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.tfd-results:empty, .tfd-turnstile:empty { display: none; }
.tfd-result { display: flex; flex-direction: column; gap: 0.75rem; }
.tfd-error { color: var(--red-11, #dc2626); }
.tfd-log { overflow: hidden; border: 1px solid var(--border, var(--grayscale-a5)); border-radius: 0.5rem; }
.tfd-log-head { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border, var(--grayscale-a5)); background: var(--grayscale-a3); font-size: 0.75rem; color: var(--grayscale-a11); }
.tfd-log-head .tfd-mono { font-family: var(--font-mono, ui-monospace, monospace); }
.tfd-running { display: inline-flex; align-items: center; gap: 0.5rem; }
.tfd-dot { width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--green-9, #22c55e); animation: tfd-pulse 2s ease-in-out infinite; }
.tfd-log-body { max-height: 14rem; overflow: auto; padding: 0.5rem 0.75rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1.625; }
.tfd-log-line { overflow-wrap: anywhere; white-space: pre-wrap; }
.tfd-tone-error { color: var(--red-11, #dc2626); }
.tfd-tone-ok { color: var(--green-11, #16a34a); }
.tfd-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; border: 1px solid var(--border, var(--grayscale-a5)); border-radius: 0.5rem; }
.tfd a.tfd-link { display: inline-flex; align-items: center; gap: 0.25rem; color: inherit; text-decoration: underline; text-underline-offset: 4px; }
.tfd-url { font-family: var(--font-mono, ui-monospace, monospace); word-break: break-all; }
.tfd-spin { animation: tfd-spin 1s linear infinite; }
.tfd-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@keyframes tfd-spin { to { transform: rotate(360deg); } }
@keyframes tfd-pulse { 50% { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) { .tfd-spin, .tfd-dot { animation: none; } }
`;

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

// "[api]: sdk-config TypeScript SDK " and similar task prefixes are dimmed so the message stands out.
const LOG_PREFIX = /^(\[[^\]]+\]:\s*(?:sdk-config\s+)?(?:TypeScript SDK\s+)?)(.*)$/;
// Stops at spaces, closing parens and zero-width characters, which the CLI prints next to URLs.
const LOG_URL = /(https:\/\/[^\s)\u200b-\u200d\ufeff]+)/;

function logTone(text: string): string | undefined {
  if (/\b(error|failed)\b|✗|✖/i.test(text)) return "tfd-tone-error";
  if (/✓|\b(finished|completed|published|downloaded|is kept for|all checks passed)\b/i.test(text))
    return "tfd-tone-ok";
  return undefined;
}

function LogLine({ line }: { line: string; key?: any }) {
  const match = LOG_PREFIX.exec(line);
  const prefix = match?.[1] ?? "";
  const text = match?.[2] ?? line;
  return (
    <div className="tfd-log-line">
      {prefix && <span className="tfd-muted">{prefix}</span>}
      <span className={logTone(text)}>
        {text.split(LOG_URL).map((part: string, index: number) =>
          index % 2 === 1 ? (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="tfd-link">
              {part}
            </a>
          ) : (
            part
          ),
        )}
      </span>
    </div>
  );
}

function AddedBadge({ children }: { children?: any }) {
  return (
    <span className="tfd-badge">
      <CheckIcon size={12} />
      {children}
    </span>
  );
}

function RemoveButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" className="tfd-btn tfd-icon-btn" aria-label={label} onClick={onClick} disabled={disabled}>
      <XIcon size={14} />
    </button>
  );
}

function readStoredJob(): { jobId: string; product?: Product } | null {
  try {
    const raw = window.localStorage.getItem(JOB_STORAGE_KEY);
    if (raw == null) return null;
    // Older entries are a bare job ID.
    if (!raw.startsWith("{")) return { jobId: raw };
    const parsed = JSON.parse(raw) as { jobId?: unknown; product?: unknown };
    if (typeof parsed.jobId !== "string") return null;
    return {
      jobId: parsed.jobId,
      product: parsed.product === "sdk" || parsed.product === "docs" ? parsed.product : undefined,
    };
  } catch {
    return null;
  }
}

function storeJob(jobId: string, product: Product): void {
  try {
    window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify({ jobId, product }));
  } catch {
    // Without storage the build still runs; only resuming after a reload is lost.
  }
}

/** Polls one build until it is live or failed. A null job ID clears the status. */
function useJobStatus(jobId: string | null): JobStatus | null {
  const [status, setStatus] = useState(null as { jobId: string; value: JobStatus } | null);

  useEffect(() => {
    if (jobId == null) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch(`${API_ORIGIN}/api/try-fern/docs/${jobId}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as JobStatus;
        if (stopped) return;
        setStatus({ jobId, value: next });
        if (next.step === "live" || next.step === "failed") return;
      } catch {
        // A dropped poll is retried on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  return status != null && status.jobId === jobId ? status.value : null;
}

function isRunning(status: JobStatus | null): boolean {
  return status != null && status.step !== "live" && status.step !== "failed";
}

function BuildLog({ log, running }: { log: string[]; running: boolean }) {
  const box = useRef(null);
  useEffect(() => {
    if (box.current != null) box.current.scrollTop = box.current.scrollHeight;
  }, [log]);
  return (
    <div className="tfd-log">
      <div className="tfd-log-head">
        <span className="tfd-mono">Build log</span>
        {running && (
          <span className="tfd-running">
            <span className="tfd-dot" aria-hidden />
            Running
          </span>
        )}
      </div>
      <div ref={box} role="log" aria-label="Build log" tabIndex={0} className="tfd-log-body">
        {log.map((line, index) => (
          <LogLine key={index} line={line} />
        ))}
      </div>
    </div>
  );
}

function BuildResult({ product, status }: { product: Product; status: JobStatus; key?: any }) {
  const card = useRef(null);
  // A resumed build can be the other product's, so its labels follow the job.
  const labels = STEP_LABELS[status.product ?? product];
  const running = isRunning(status);
  const resultUrl = status.docsUrl ?? status.sdkBuildUrl;
  useEffect(() => {
    // Centered, so the page's floating header doesn't cover the claim link.
    if (resultUrl != null) card.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [resultUrl]);

  return (
    <div className="tfd-result">
      {running && <p className="tfd-muted">{labels[status.step]}. This usually takes a minute or two.</p>}
      {status.step === "failed" && <p className="tfd-error">{status.error ?? labels.failed}</p>}
      {status.log != null && status.log.length > 0 && <BuildLog log={status.log} running={running} />}
      {status.sdkBuildUrl != null && (
        <div ref={card} className="tfd-card">
          <p>{labels.live}</p>
          <a href={status.sdkBuildUrl} target="_blank" rel="noopener noreferrer" className="tfd-link">
            Download or claim the SDK
            <ArrowUpRightIcon size={16} />
          </a>
          <p className="tfd-small tfd-muted">
            Fern keeps this build for 7 days. Claim it to keep the SDK in your organization.
          </p>
        </div>
      )}
      {status.docsUrl != null && (
        <div ref={card} className="tfd-card">
          <p>{status.step === "live" ? labels.live : "Your docs site is published and starting up."}</p>
          <a href={status.docsUrl} target="_blank" rel="noopener noreferrer" className="tfd-link tfd-url">
            {status.docsUrl.replace(/^https:\/\//, "")}
            <ArrowUpRightIcon size={16} />
          </a>
          {status.claimUrl != null && (
            <p className="tfd-small tfd-muted">
              <a href={status.claimUrl} target="_blank" rel="noopener noreferrer" className="tfd-link">
                Claim this site
              </a>{" "}
              to keep it
              {status.expiresAt != null && <> before it expires on {new Date(status.expiresAt).toLocaleString()}</>}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TryFernDocs() {
  // Nothing is picked until the visitor drops a spec or adds the sample, like onboarding in the Dashboard.
  const [picked, setPicked] = useState(null as Mode | null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null as File | null);
  const [jobIds, setJobIds] = useState({ docs: null, sdk: null } as Record<Product, string | null>);
  const [error, setError] = useState(null as string | null);
  const [submitting, setSubmitting] = useState(null as Product | null);
  const fileInput = useRef(null);
  const statuses: Record<Product, JobStatus | null> = {
    docs: useJobStatus(jobIds.docs),
    sdk: useJobStatus(jobIds.sdk),
  };
  // The dashboard runs one build per network at a time, so both buttons wait for the running one.
  const runningProduct = submitting ?? PRODUCTS.find((product) => isRunning(statuses[product])) ?? null;
  const running = runningProduct != null;

  // Changing the input clears the last error, including one from a failed build.
  function clearFeedback() {
    setError(null);
    setJobIds((current: Record<Product, string | null>) => {
      const next = { ...current };
      for (const product of PRODUCTS) {
        if (statuses[product]?.step === "failed") next[product] = null;
      }
      return next;
    });
  }

  function pickFile(next: File | undefined) {
    if (next == null) return;
    clearFeedback();
    if (!/\.(json|ya?ml)$/i.test(next.name)) {
      setError("Choose a JSON or YAML OpenAPI spec.");
      return;
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setError("The spec is larger than 2 MB.");
      return;
    }
    setFile(next);
    setPicked("upload");
  }

  function onFileChange(event: any) {
    pickFile(event.target.files?.[0]);
    // Lets the same file be picked again after it's removed.
    event.target.value = "";
  }

  function removeFile() {
    setFile(null);
    setPicked(null);
    clearFeedback();
  }

  function addSample() {
    setFile(null);
    setPicked("sample");
    clearFeedback();
  }

  function removeSample() {
    setPicked(null);
    clearFeedback();
  }

  async function start(product: Product) {
    setError(null);
    let source: { type: "sample" } | { type: "upload"; content: string };
    if (picked === "upload" && file != null) {
      source = { type: "upload", content: await file.text() };
    } else if (picked === "sample") {
      source = { type: "sample" };
    } else {
      setError("Upload an OpenAPI spec or add the sample.");
      return;
    }
    setJobIds((current: Record<Product, string | null>) => ({ ...current, [product]: null }));
    setSubmitting(product);
    try {
      const response = await fetch(`${API_ORIGIN}/api/try-fern/docs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, source }),
      });
      const body = (await response.json().catch(() => ({}))) as { jobId?: string; error?: string };
      // The 409 is per network, not per product, so resume whichever build this browser started.
      const stored = readStoredJob();
      if (response.status === 409 && stored != null) {
        const resumed = stored.product ?? product;
        setJobIds((current: Record<Product, string | null>) => ({ ...current, [resumed]: stored.jobId }));
      } else if (!response.ok || body.jobId == null) {
        setError(body.error ?? "Fern could not start the build. Try again in a minute.");
      } else {
        const jobId = body.jobId;
        storeJob(jobId, product);
        setJobIds((current: Record<Product, string | null>) => ({ ...current, [product]: jobId }));
      }
    } catch {
      setError("Fern could not start the build. Try again in a minute.");
    } finally {
      setSubmitting(null);
    }
  }

  function onSubmit(event: any) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    void start(submitter?.getAttribute("value") === "sdk" ? "sdk" : "docs");
  }

  return (
    <div className="tfd not-prose">
      <style>{STYLES}</style>
      <p className="tfd-eyebrow">Try it</p>
      <p className="tfd-intro">{INTRO}</p>

      <form onSubmit={onSubmit} className="tfd-form">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(event: any) => {
            event.preventDefault();
            if (!running) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: any) => {
            event.preventDefault();
            setDragging(false);
            if (!running) pickFile(event.dataTransfer.files[0]);
          }}
          disabled={running}
          className={cx("tfd-btn tfd-drop", dragging && "is-dragging")}
        >
          <CloudUploadIcon size={24} />
          <span>Drop or click to upload your OpenAPI spec</span>
          <span className="tfd-small">yaml, yml, or json, up to 2 MB</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={SPEC_ACCEPT}
          className="tfd-sr-only"
          tabIndex={-1}
          aria-label="OpenAPI spec file"
          onChange={onFileChange}
        />

        {picked === "upload" && file != null && (
          <div className="tfd-row">
            <div className="tfd-file">
              <FileCodeIcon size={20} className="tfd-muted" />
              <span className="tfd-file-name">{file.name}</span>
              <span className="tfd-small tfd-muted">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <div className="tfd-actions">
              <RemoveButton label="Remove file" onClick={removeFile} disabled={running} />
              <AddedBadge>Uploaded</AddedBadge>
            </div>
          </div>
        )}

        <div className="tfd-sample">
          <p className="tfd-small tfd-muted">Don&apos;t have a spec? Add an example.</p>
          <div className="tfd-row">
            <p>{SAMPLE_SPEC_NAME}</p>
            {picked === "sample" ? (
              <div className="tfd-actions">
                <RemoveButton label="Remove sample" onClick={removeSample} disabled={running} />
                <AddedBadge>Added</AddedBadge>
              </div>
            ) : (
              <button type="button" className="tfd-btn tfd-add" onClick={addSample} disabled={running}>
                Add
              </button>
            )}
          </div>
        </div>

        <div className="tfd-choose">
          <p className="tfd-small tfd-muted">
            {picked == null ? "Add a spec to choose what to build." : "Choose what to build."}
          </p>
          <div className="tfd-options">
            {PRODUCTS.map((product) => {
              const option = BUILD_OPTIONS[product];
              const OptionIcon = option.icon;
              const busy = runningProduct === product;
              return (
                <button
                  key={product}
                  type="submit"
                  value={product}
                  disabled={running || picked == null}
                  className={cx("tfd-btn tfd-option", busy && "is-busy")}
                >
                  <span className="tfd-option-icon">
                    <OptionIcon size={16} />
                  </span>
                  <span className="tfd-option-text">
                    <span className="tfd-option-title">{option.title}</span>
                    <span className="tfd-small tfd-muted">{busy ? "Building…" : option.description}</span>
                  </span>
                  {busy ? (
                    <LoaderIcon size={16} className="tfd-muted tfd-spin" />
                  ) : (
                    <ArrowRightIcon size={16} className="tfd-muted" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      <div aria-live="polite" className="tfd-results">
        {error != null && <p className="tfd-error">{error}</p>}
        {PRODUCTS.map((product) => {
          const status = statuses[product];
          return status != null && <BuildResult key={product} product={product} status={status} />;
        })}
      </div>
    </div>
  );
}

TryFernDocs.toMarkdown = (): string => MARKDOWN_FALLBACK;
