import type { ReactNode } from "react";

/** Tiny safe markdown renderer: headings, lists, bold, quotes, tables, hr, paragraphs. Output is React elements (no raw HTML). */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else out.push(<code key={`${keyBase}-${i++}`} className="rounded bg-paper-2 px-1 text-[0.9em]">{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "font-display mt-2 mb-3 border-b border-line pb-2 text-xl font-bold"
          : level === 2
            ? "font-display mt-6 mb-2 text-lg font-bold text-navy"
            : "mt-4 mb-1 text-base font-bold";
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
      blocks.push(<Tag key={k++} className={cls}>{inline(h[2], `h${k}`)}</Tag>);
      i++;
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={k++} className="my-4 border-line" />);
      i++;
      continue;
    }
    if (/^\s*[-*・]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*・]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*・]|\d+[.)])\s+/, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k++} className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-gold`}>
          {items.map((t, j) => (
            <li key={j}>{inline(t, `li${k}-${j}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={k++} className="my-2 border-l-4 border-gold/60 bg-gold-soft/40 px-3 py-1 text-ink-soft">
          {inline(q.join(" "), `q${k}`)}
        </blockquote>,
      );
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i]) || !lines[i].includes("-")) rows.push(splitRow(lines[i]));
        i++;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        blocks.push(
          <div key={k++} className="scroll-thin my-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j} className="border border-line bg-paper-2 px-2 py-1 text-left font-bold">
                      {inline(c, `th${j}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, j) => (
                      <td key={j} className="border border-line px-2 py-1 align-top">
                        {inline(c, `td${ri}-${j}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*・]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !lines[i].trim().startsWith("|")
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={k++} className="my-2">
        {para.map((t, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {inline(t, `p${k}-${j}`)}
          </span>
        ))}
      </p>,
    );
  }
  return <div className={`text-sm leading-7 text-ink ${className}`}>{blocks}</div>;
}
