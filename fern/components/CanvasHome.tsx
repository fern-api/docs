// Canvas home page: the "Connect your agent" card with per-agent install commands.
declare const React: any;
const { useEffect, useRef, useState } = React;

// Agent logos from fern-marketing-site (public/docs/ai-*.svg); Codex and Cursor marks follow the text color.
const AGENT_LOGOS: Record<string, string> = {
  claude: "<svg aria-hidden=\"true\" viewBox=\"0 0 33 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6.28208 21.2313L12.5804 17.7089L12.6857 17.4019L12.5804 17.2323H12.2723L11.2186 17.1676L7.61955 17.0707L4.49878 16.9414L1.47528 16.7799L0.71332 16.6183L0 15.6811L0.0729532 15.2126L0.71332 14.7844L1.62929 14.8652L3.65577 15.0025L6.69548 15.2126L8.90029 15.3418L12.167 15.6811H12.6857L12.7587 15.4711L12.5804 15.3418L12.4426 15.2126L9.29748 13.0878L5.893 10.8419L4.1097 9.54925L3.14509 8.89486L2.65874 8.28086L2.44798 6.93977L3.32342 5.97838L4.49878 6.05917L4.7987 6.13996L5.99027 7.05287L8.53552 9.01604L11.8589 11.4559L12.3453 11.8598L12.5398 11.7225L12.5642 11.6255L12.3453 11.262L10.5377 8.00618L8.60848 4.69384L7.74925 3.32042L7.52228 2.49638C7.44122 2.15706 7.38448 1.8743 7.38448 1.52691L8.38151 0.177736L8.93271 0L10.2621 0.177736L10.8214 0.662469L11.6482 2.54485L12.9857 5.5098L15.0608 9.54117L15.6687 10.7368L15.993 11.8437L16.1145 12.183H16.3253V11.9891L16.4955 9.71891L16.8117 6.93169L17.1197 3.34466L17.2251 2.3348L17.7276 1.12297L18.7247 0.468576L19.5028 0.840205L20.1432 1.75312L20.054 2.34288L19.673 4.80694L18.9273 8.66865L18.4409 11.2539H18.7247L19.0489 10.9307L20.362 9.19378L22.5669 6.44695L23.5396 5.3563L24.6744 4.15255L25.4039 3.57895H26.7819L27.7952 5.08162L27.3412 6.63277L25.9227 8.42628L24.7473 9.94511L23.0613 12.2072L22.0075 14.0169L22.1048 14.1623L22.3561 14.1381L26.1659 13.3302L28.2248 12.9585L30.6809 12.5384L31.7914 13.0555L31.913 13.5806L31.4752 14.6551L28.8489 15.3014L25.7687 15.9154L21.1807 16.998L21.124 17.0384L21.1888 17.1192L23.2559 17.3131L24.1394 17.3615H26.3037L30.3323 17.6605L31.3861 18.3552L32.0183 19.2035L31.913 19.8498L30.2918 20.6739L28.1032 20.1568L22.9965 18.945L21.2456 18.5087H21.0024V18.6542L22.4615 20.076L25.1364 22.4836L28.4842 25.5858L28.6544 26.3533L28.2248 26.9593L27.7708 26.8946L24.8284 24.6891L23.6936 23.6954L21.124 21.5383H20.9538V21.7645L21.5455 22.629L24.6744 27.3147L24.8365 28.7528L24.6095 29.2213L23.799 29.5041L22.9073 29.3425L21.0754 26.7815L19.1867 23.8974L17.6628 21.3121L17.4763 21.4171L16.5766 31.0714L16.1551 31.5642L15.1824 31.9359L14.3718 31.3219L13.9422 30.3282L14.3718 28.365L14.8906 25.804L15.3121 23.7681L15.693 21.2394L15.92 20.3992L15.9038 20.3426L15.7174 20.3669L13.8044 22.9844L10.8943 26.9027L8.59226 29.3587L8.04106 29.5768L7.08456 29.084L7.17373 28.2034L7.70872 27.4198L10.8943 23.3803L12.8154 20.8759L14.0556 19.4297L14.0475 19.2197H13.9746L5.51202 24.6972L4.00432 24.8911L3.35585 24.2851L3.43691 23.2914L3.74493 22.9683L6.29019 21.2232L6.28208 21.2313Z\" fill=\"#D97757\"/></svg>",
  codex: "<svg aria-hidden=\"true\" viewBox=\"0 0 33 33\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12.5607 11.8142V8.73078C12.5607 8.47109 12.6582 8.27628 12.8853 8.1466L19.0847 4.57637C19.9285 4.08954 20.9347 3.86246 21.9732 3.86246C25.8679 3.86246 28.3348 6.88099 28.3348 10.0941C28.3348 10.3212 28.3348 10.5809 28.3023 10.8406L21.8758 7.07553C21.4864 6.84845 21.0967 6.84845 20.7073 7.07553L12.5607 11.8142ZM27.0364 23.8232V16.4554C27.0364 16.0009 26.8415 15.6764 26.4521 15.4492L18.3055 10.7106L20.967 9.185C21.1941 9.05533 21.3889 9.05533 21.6161 9.185L27.8154 12.7552C29.6007 13.794 30.8014 16.0009 30.8014 18.1429C30.8014 20.6096 29.341 22.8816 27.0364 23.823V23.8232ZM10.6458 17.3319L7.98433 15.7741C7.75725 15.6444 7.65977 15.4496 7.65977 15.1899V8.04947C7.65977 4.57671 10.3212 1.94753 13.924 1.94753C15.2873 1.94753 16.5529 2.40203 17.6242 3.21341L11.2303 6.91359C10.8409 7.14067 10.6461 7.46523 10.6461 7.9198V17.3322L10.6458 17.3319ZM16.3745 20.6424L12.5607 18.5004V13.9566L16.3745 11.8145L20.1879 13.9566V18.5004L16.3745 20.6424ZM18.8249 30.5094C17.4616 30.5094 16.1961 30.0549 15.1247 29.2436L21.5186 25.5434C21.908 25.3163 22.1029 24.9917 22.1029 24.5372V15.1247L24.7969 16.6826C25.024 16.8122 25.1215 17.0071 25.1215 17.2668V24.4072C25.1215 27.88 22.4274 30.5091 18.8249 30.5091V30.5094ZM11.1326 23.2716L4.93319 19.7014C3.14794 18.6626 1.94719 16.4558 1.94719 14.3137C1.94719 11.8145 3.44022 9.57504 5.74451 8.63371V16.0338C5.74451 16.4883 5.93939 16.8128 6.32875 17.04L14.4431 21.746L11.7816 23.2716C11.5546 23.4013 11.3597 23.4013 11.1326 23.2716ZM10.7758 28.5945C7.10814 28.5945 4.41416 25.8356 4.41416 22.4277C4.41416 22.168 4.4467 21.9083 4.47896 21.6486L10.8729 25.3488C11.2623 25.576 11.652 25.576 12.0413 25.3488L20.1879 20.6428V23.7262C20.1879 23.9859 20.0905 24.1807 19.8634 24.3103L13.664 27.8806C12.8201 28.3674 11.8139 28.5945 10.7754 28.5945H10.7758ZM18.8249 32.4567C22.7522 32.4567 26.0302 29.6655 26.777 25.9653C30.4121 25.024 32.749 21.616 32.749 18.1433C32.749 15.8712 31.7754 13.6643 30.0227 12.0739C30.1849 11.3922 30.2823 10.7106 30.2823 10.0293C30.2823 5.38803 26.5173 1.91493 22.168 1.91493C21.2919 1.91493 20.448 2.0446 19.604 2.33689C18.1433 0.908726 16.1309 0 13.924 0C9.99673 0 6.71878 2.79112 5.97199 6.49129C2.33689 7.43263 0 10.8406 0 14.3133C0 16.5854 0.973596 18.7923 2.72631 20.3827C2.56404 21.0644 2.46663 21.746 2.46663 22.4274C2.46663 27.0687 6.23168 30.5417 10.5809 30.5417C11.4571 30.5417 12.301 30.412 13.1449 30.1197C14.6054 31.5479 16.6177 32.4567 18.8249 32.4567Z\" fill=\"currentColor\"/></svg>",
  cursor: "<svg aria-hidden=\"true\" viewBox=\"0 0 29 33\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M27.9025 7.6823L14.9092 0.180708C14.492 -0.060236 13.9772 -0.060236 13.56 0.180708L0.567286 7.6823C0.216545 7.88481 0 8.25935 0 8.66499V23.792C0 24.1976 0.216545 24.5722 0.567286 24.7747L13.5606 32.2763C13.9778 32.5172 14.4926 32.5172 14.9099 32.2763L27.9031 24.7747C28.2539 24.5722 28.4704 24.1976 28.4704 23.792V8.66499C28.4704 8.25935 28.2539 7.88481 27.9031 7.6823H27.9025ZM27.0864 9.27131L14.5433 30.9965C14.4585 31.1429 14.2346 31.0831 14.2346 30.9136V16.6881C14.2346 16.4039 14.0827 16.141 13.8363 15.9982L1.51703 8.8858C1.37064 8.80101 1.43041 8.57715 1.59999 8.57715H26.6862C27.0425 8.57715 27.2651 8.96327 27.087 9.27192H27.0864V9.27131Z\" fill=\"currentColor\"/></svg>",
  copilot: "<svg aria-hidden=\"true\" viewBox=\"0 0 30 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M21.7335 2.24831C21.3421 0.915461 20.1191 0 18.7299 0H17.8161C16.3051 0 15.0097 1.07926 14.737 2.56542L13.1719 11.0942L13.5603 9.76533C13.9504 8.43055 15.1743 7.51311 16.565 7.51311H21.8756L24.1028 8.38072L26.2498 7.51311H25.6231C24.2339 7.51311 23.011 6.59763 22.6195 5.26481L21.7335 2.24831Z\" fill=\"url(#paint0_radial_5319_55967)\"/><path d=\"M8.33179 24.7862C8.7189 26.1254 9.94502 27.0473 11.3392 27.0473H13.28C14.9776 27.0473 16.3658 25.6943 16.4094 23.9973L16.6208 15.7734L16.1787 17.2834C15.788 18.6175 14.5644 19.5342 13.1743 19.5342H7.81958L5.91052 18.4986L3.84375 19.5342H4.45992C5.854 19.5342 7.08011 20.4561 7.46723 21.7954L8.33179 24.7862Z\" fill=\"url(#paint1_radial_5319_55967)\"/><path d=\"M18.5945 0H7.74903C4.65031 0 2.79108 4.09536 1.5516 8.19071C0.083142 13.0426 -1.83838 19.5316 3.7207 19.5316H8.40371C9.80313 19.5316 11.0317 18.6063 11.4163 17.2608C12.2305 14.4123 13.6574 9.4432 14.7782 5.66044C15.3477 3.73814 15.8222 2.08719 16.5503 1.05909C16.9585 0.482692 17.6388 0 18.5945 0Z\" fill=\"url(#paint2_linear_5319_55967)\"/><path d=\"M18.5945 0H7.74903C4.65031 0 2.79108 4.09536 1.5516 8.19071C0.083142 13.0426 -1.83838 19.5316 3.7207 19.5316H8.40371C9.80313 19.5316 11.0317 18.6063 11.4163 17.2608C12.2305 14.4123 13.6574 9.4432 14.7782 5.66044C15.3477 3.73814 15.8222 2.08719 16.5503 1.05909C16.9585 0.482692 17.6388 0 18.5945 0Z\" fill=\"url(#paint3_linear_5319_55967)\"/><path d=\"M11.1562 27.0467H22.0018C25.1004 27.0467 26.9597 22.9507 28.1992 18.8547C29.6676 14.0019 31.5891 7.51172 26.0301 7.51172H21.3472C19.9477 7.51172 18.7191 8.43714 18.3346 9.78274C17.5203 12.6317 16.0935 17.6018 14.9726 21.3853C14.403 23.308 13.9286 24.9591 13.2005 25.9875C12.7923 26.5639 12.1119 27.0467 11.1562 27.0467Z\" fill=\"url(#paint4_radial_5319_55967)\"/><path d=\"M11.1562 27.0467H22.0018C25.1004 27.0467 26.9597 22.9507 28.1992 18.8547C29.6676 14.0019 31.5891 7.51172 26.0301 7.51172H21.3472C19.9477 7.51172 18.7191 8.43714 18.3346 9.78274C17.5203 12.6317 16.0935 17.6018 14.9726 21.3853C14.403 23.308 13.9286 24.9591 13.2005 25.9875C12.7923 26.5639 12.1119 27.0467 11.1562 27.0467Z\" fill=\"url(#paint5_linear_5319_55967)\"/><defs><radialGradient id=\"paint0_radial_5319_55967\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"translate(24.3454 11.1667) rotate(-129.304) scale(11.7002 11.0019)\"><stop offset=\"0.0955758\" stop-color=\"#00AEFF\"/><stop offset=\"0.773185\" stop-color=\"#2253CE\"/><stop offset=\"1\" stop-color=\"#0736C4\"/></radialGradient><radialGradient id=\"paint1_radial_5319_55967\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"translate(6.16179 19.4857) rotate(51.84) scale(10.8129 10.4888)\"><stop stop-color=\"#FFB657\"/><stop offset=\"0.633728\" stop-color=\"#FF5F3D\"/><stop offset=\"0.923392\" stop-color=\"#C02B3C\"/></radialGradient><linearGradient id=\"paint2_linear_5319_55967\" x1=\"7.0999\" y1=\"2.36663\" x2=\"8.64727\" y2=\"20.2686\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0.156162\" stop-color=\"#0D91E1\"/><stop offset=\"0.487484\" stop-color=\"#52B471\"/><stop offset=\"0.652394\" stop-color=\"#98BD42\"/><stop offset=\"0.937361\" stop-color=\"#FFC800\"/></linearGradient><linearGradient id=\"paint3_linear_5319_55967\" x1=\"8.45226\" y1=\"-1.90817e-08\" x2=\"9.29721\" y2=\"19.5316\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#3DCBFF\"/><stop offset=\"0.246674\" stop-color=\"#0588F7\" stop-opacity=\"0\"/></linearGradient><radialGradient id=\"paint4_radial_5319_55967\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"translate(26.5872 5.59914) rotate(109.274) scale(25.9568 31.0953)\"><stop offset=\"0.0661714\" stop-color=\"#8C48FF\"/><stop offset=\"0.5\" stop-color=\"#F2598A\"/><stop offset=\"0.895833\" stop-color=\"#FFB152\"/></radialGradient><linearGradient id=\"paint5_linear_5319_55967\" x1=\"27.444\" y1=\"6.31907\" x2=\"27.4329\" y2=\"11.6397\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0.0581535\" stop-color=\"#F8ADFA\"/><stop offset=\"0.708063\" stop-color=\"#A86EDD\" stop-opacity=\"0\"/></linearGradient></defs></svg>",
  terminal: "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.75 4.5L6.25 8L2.75 11.5M8.25 11.5H13.25\"/></svg>",
};

function AgentLogo({ icon }: { icon?: string }) {
  return <span className="cv-agent-logo" dangerouslySetInnerHTML={{ __html: AGENT_LOGOS[icon ?? ""] ?? AGENT_LOGOS.terminal }} />;
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

type AgentOption = { label: string; command: string; file?: string; icon?: string };
type AgentTab = {
  label: string;
  description: string;
  href: string;
  optionsLabel?: string;
  options: AgentOption[];
};

// Dropdown of agents with their logos; a single option renders as a plain label.
function AgentPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: AgentOption[];
  value: number;
  onChange: (i: number) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const itemRefs = useRef([] as any[]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[value]?.focus();
    const onPointer = (e: any) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const current = options[value];
  if (options.length < 2) {
    return (
      <span className="cv-picker-static">
        <AgentLogo icon={current.icon} />
        {current.label}
      </span>
    );
  }

  const onMenuKeyDown = (e: any) => {
    const index = itemRefs.current.indexOf(document.activeElement);
    if (e.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector(".cv-picker-trigger")?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      itemRefs.current[(index + delta + options.length) % options.length]?.focus();
    }
  };

  return (
    <div className="cv-picker" ref={rootRef}>
      <button
        type="button"
        className="cv-picker-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen(!open)}
      >
        <AgentLogo icon={current.icon} />
        <span>{current.label}</span>
        <svg className="cv-picker-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <path d="M5 6.5L8 3.5l3 3M5 9.5l3 3 3-3" />
        </svg>
      </button>
      {open ? (
        <div className="cv-picker-menu" role="menu" aria-label={label} onKeyDown={onMenuKeyDown}>
          {options.map((o, i) => (
            <button
              key={o.label}
              ref={(el: any) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={i === value}
              className="cv-picker-item"
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
            >
              <AgentLogo icon={o.icon} />
              <span>{o.label}</span>
              {i === value ? (
                <svg className="cv-picker-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="cv-agent-card">
      <div className="cv-agent-tabs" role="tablist" aria-orientation="vertical" aria-label="Agent integrations" onKeyDown={onKeyDown}>
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
            className="cv-agent-tab"
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="cv-agent-panel" role="tabpanel" id="cv-agent-panel" aria-labelledby={`cv-agent-tab-${active}`}>
        <div className="cv-agent-info">
          <p className="cv-agent-title">{tab.label}</p>
          <p className="cv-agent-desc">{tab.description}</p>
          <a className="cv-agent-link" href={tab.href}>
            {linkText} <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="cv-agent-cmd">
          <div className="cv-agent-select">
            <AgentPicker
              options={tab.options}
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
    </div>
  );
}
