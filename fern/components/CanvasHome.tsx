// Canvas home page: hero code explorer with a product list on the left and
// the matching config snippet on the right.
declare const React: any;
const { Children, useState } = React;

type ExplorerItem = { label: string; hint: string; href: string };

export function CodeExplorer({ items, children }: { items: ExplorerItem[]; children?: any }) {
  const [active, setActive] = useState(0);
  const panels = Children.toArray(children).filter((c: any) => c && typeof c === "object");
  const current = items[active];

  return (
    <div className="cv-explorer">
      <div className="cv-explorer-nav" role="tablist" aria-orientation="vertical" aria-label="Fern products">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            id={`cv-explorer-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`cv-explorer-panel-${i}`}
            className="cv-explorer-tab"
            onClick={() => setActive(i)}
          >
            <span className="cv-explorer-label">{item.label}</span>
            <span className="cv-explorer-hint">{item.hint}</span>
          </button>
        ))}
      </div>
      <div className="cv-explorer-body">
        {panels.map((panel: any, i: number) => (
          <div
            key={i}
            role="tabpanel"
            id={`cv-explorer-panel-${i}`}
            aria-labelledby={`cv-explorer-tab-${i}`}
            className="cv-explorer-panel"
            hidden={i !== active}
          >
            {panel}
          </div>
        ))}
        {current ? (
          <a className="cv-explorer-link" href={current.href}>
            Get started with {current.label} <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
