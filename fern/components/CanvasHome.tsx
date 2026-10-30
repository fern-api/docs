// Canvas home page: a grouped product list beside a code card, and the
// "Connect your agent" card with per-agent install commands.
declare const React: any;
const { Children, isValidElement, useRef, useState } = React;

function elements(children: any): any[] {
  return Children.toArray(children).filter((c: any) => isValidElement(c));
}

// Fern wraps custom components used as MDX children; descend to the element that carries `prop`.
function unwrap(el: any, prop: string): any {
  let node = el;
  while (node?.props && node.props[prop] === undefined) {
    const inner = elements(node.props.children);
    if (inner.length !== 1) return null;
    node = inner[0];
  }
  return node;
}

function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) resolve();
    else reject(new Error("copy failed"));
  });
}

// Tracks the key of the last copied snippet, so the check mark only shows next to that snippet.
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null as string | null);
  const timer = useRef(0);
  const copy = (text: string, key: string) => {
    writeClipboard(text)
      .then(() => {
        window.clearTimeout(timer.current);
        setCopiedKey(key);
        timer.current = window.setTimeout(() => setCopiedKey(null), 1200);
      })
      .catch(() => {});
  };
  return { copiedKey, copy };
}

function CopyButton({ copied, onClick, label }: { copied: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="cv-copy" aria-label={copied ? "Copied" : label} onClick={onClick}>
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" />
        </svg>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

// Native <select> with an up/down chevron, or a plain label when there's only one option.
function OptionSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: number;
  onChange: (i: number) => void;
  label: string;
}) {
  if (options.length < 2) {
    return <span className="cv-select-static">{options[0]}</span>;
  }
  return (
    <span className="cv-select">
      <select aria-label={label} value={value} onChange={(e: any) => onChange(Number(e.target.value))}>
        {options.map((o, i) => (
          <option key={o} value={i}>
            {o}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <path d="M5 6.5L8 3.5l3 3M5 9.5l3 3 3-3" />
      </svg>
    </span>
  );
}

/**
 * One product in the explorer. Children are code blocks, one per entry in `options`.
 * `hrefs` optionally gives each option its own link; otherwise `href` is used.
 */
export function ExplorerItem(_props: {
  label: string;
  group: string;
  href: string;
  hrefs?: string[];
  options: string[];
  children?: any;
}) {
  return null;
}

export function CodeExplorer({ linkText = "Get started", children }: { linkText?: string; children?: any }) {
  const items = elements(children)
    .map((c: any) => unwrap(c, "label"))
    .filter(Boolean)
    .map((c: any) => ({ ...c.props, blocks: elements(c.props.children) }));
  const [active, setActive] = useState(0);
  const [variants, setVariants] = useState({} as Record<number, number>);
  const codeRef = useRef(null);
  const { copiedKey, copy } = useCopy();

  const current = items[active];
  const variant = variants[active] ?? 0;
  const groups: string[] = [];
  items.forEach((item: any) => {
    if (!groups.includes(item.group)) groups.push(item.group);
  });

  const copyKey = `${active}-${variant}`;
  const copyCode = () => {
    const code = codeRef.current?.querySelector("[data-cv-visible] pre")?.innerText.replace(/\n$/, "");
    if (code) copy(code, copyKey);
  };

  return (
    <div className="cv-explorer">
      <div className="cv-explorer-nav">
        {groups.map((group, g) => (
          <div key={group} className="cv-explorer-group" role="group" aria-labelledby={`cv-explorer-group-${g}`}>
            <p id={`cv-explorer-group-${g}`} className="cv-explorer-group-label">
              {group}
            </p>
            {items.map((item: any, i: number) =>
              item.group === group ? (
                <button
                  key={item.label}
                  type="button"
                  className="cv-explorer-tab"
                  aria-pressed={i === active}
                  aria-controls="cv-explorer-code"
                  onClick={() => setActive(i)}
                >
                  {item.label}
                </button>
              ) : null,
            )}
          </div>
        ))}
        {current ? (
          <a className="cv-explorer-link" href={current.hrefs?.[variant] ?? current.href}>
            {linkText} <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
      <div className="cv-explorer-code" id="cv-explorer-code" ref={codeRef}>
        <div className="cv-explorer-code-header">
          {current ? (
            <OptionSelect
              options={current.options}
              value={variant}
              label={`${current.label} example`}
              onChange={(v) => setVariants({ ...variants, [active]: v })}
            />
          ) : null}
          <CopyButton copied={copiedKey === copyKey} onClick={copyCode} label="Copy code" />
        </div>
        {items.map((item: any, i: number) =>
          item.blocks.map((block: any, v: number) => {
            const visible = i === active && v === (variants[i] ?? 0);
            return (
              <div
                key={`${i}-${v}`}
                className="cv-explorer-panel"
                hidden={!visible}
                data-cv-visible={visible ? "" : undefined}
              >
                {block}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

type AgentOption = { label: string; command: string; file?: string };
type AgentTab = {
  label: string;
  description: string;
  href: string;
  optionsLabel?: string;
  options: AgentOption[];
};

export function AgentConnect({ tabs, linkText = "Read the docs" }: { tabs: AgentTab[]; linkText?: string }) {
  const [active, setActive] = useState(0);
  const [options, setOptions] = useState({} as Record<number, number>);
  const tabRefs = useRef([] as any[]);
  const { copiedKey, copy } = useCopy();

  const tab = tabs[active];
  const optionIndex = Math.min(options[active] ?? 0, tab.options.length - 1);
  const copyKey = `${active}-${optionIndex}`;
  const option = tab.options[optionIndex];
  const multiline = option.command.includes("\n");
  const [program, ...rest] = option.command.split(" ");

  const onKeyDown = (e: any) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="cv-agent-wrap">
      <div className="cv-agent-card">
        <div className="cv-agent-top">
          <div className="cv-pills" role="tablist" aria-label="Agent integrations" onKeyDown={onKeyDown}>
            {tabs.map((t, i) => (
              <button
                key={t.label}
                ref={(el: any) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`cv-agent-tab-${i}`}
                aria-selected={i === active}
                aria-controls="cv-agent-panel"
                tabIndex={i === active ? 0 : -1}
                className="cv-pill"
                onClick={() => setActive(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="cv-agent-desc">{tab.description}</p>
        </div>
        <div className="cv-agent-cmd" role="tabpanel" id="cv-agent-panel" aria-labelledby={`cv-agent-tab-${active}`}>
          <div className="cv-agent-select">
            <OptionSelect
              options={tab.options.map((o) => o.label)}
              value={optionIndex}
              label={tab.optionsLabel ?? "Agent"}
              onChange={(v) => setOptions({ ...options, [active]: v })}
            />
          </div>
          <div className="cv-agent-line">
            {option.file ? <span className="cv-agent-file">{option.file}</span> : null}
            {multiline ? (
              <pre className="cv-agent-code">{option.command}</pre>
            ) : (
              <code className="cv-agent-code">
                <span className="cv-agent-prompt" aria-hidden="true">
                  $
                </span>
                <span className="cv-agent-program">{program}</span> {rest.join(" ")}
              </code>
            )}
          </div>
          <CopyButton copied={copiedKey === copyKey} onClick={() => copy(option.command, copyKey)} label="Copy command" />
        </div>
      </div>
      <a className="cv-agent-link" href={tab.href}>
        {linkText} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
