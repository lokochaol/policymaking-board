"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Participant, Stance } from "@/lib/types";
import { getRole } from "@/data/roles";
import { getCountry } from "@/data/countries";
import Avatar from "./Avatar";
import { THEMES, type PropKind, type ThemeDef } from "./themes";
import { timeOfDay, type TimeOfDay } from "./themes/common";
import { SEATS, assignSeats, type Seat } from "./seats";
import type { Expression, RoomProps } from "./types";
import { clamp, darken, hash, lighten, visualWidth } from "./util";
import styles from "./room.module.css";

const FONT = "var(--font-inter), var(--font-plex-jp), system-ui, sans-serif";

export function expressionFor(stance: Stance | undefined, id: string): Expression {
  switch (stance) {
    case "strong_support":
    case "support":
      return "smile";
    case "concern":
      return hash(id) % 2 === 0 ? "concern" : "thinking";
    case "oppose":
      return "frown";
    default:
      return "neutral";
  }
}

// ------------------------------------------------------------------ seat furniture

function Chair({ kind, color, trim, big }: { kind: ThemeDef["chair"]["kind"]; color: string; trim: string; big: boolean }) {
  const inner = lighten(color, 0.14);
  switch (kind) {
    case "leather":
      return (
        <g>
          <path d={`M-62,-6 L-62,-112 Q-62,${big ? -170 : -148} 0,${big ? -170 : -148} Q62,${big ? -170 : -148} 62,-112 L62,-6 Z`} fill={color} stroke={darken(color, 0.4)} strokeWidth="2" />
          <path d={`M-50,-16 L-50,-108 Q-50,${big ? -158 : -138} 0,${big ? -158 : -138} Q50,${big ? -158 : -138} 50,-108 L50,-16 Z`} fill={inner} />
          <g stroke={darken(color, 0.3)} strokeWidth="1.4" opacity="0.6">
            {[-30, -10, 10, 30].map((x) => (
              <path key={x} d={`M${x},-24 L${x + 20},-120 M${x},-24 L${x - 20},-120`} />
            ))}
          </g>
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={-56 + i * 14} cy={-112 + Math.abs(i - 4) * -2} r="2.2" fill={trim} />
          ))}
          <path d={`M-62,-112 Q-62,${big ? -170 : -148} 0,${big ? -170 : -148} Q62,${big ? -170 : -148} 62,-112`} fill="none" stroke={trim} strokeWidth="2.5" />
        </g>
      );
    case "folding":
      return (
        <g>
          <path d="M-32,-8 L-32,-84 M32,-8 L32,-84" stroke={trim} strokeWidth="4" strokeLinecap="round" />
          <rect x="-40" y="-92" width="80" height="26" rx="5" fill={color} stroke={darken(color, 0.3)} strokeWidth="1.5" />
          <rect x="-36" y="-88" width="72" height="6" rx="3" fill={lighten(color, 0.3)} opacity="0.6" />
        </g>
      );
    case "cushion":
      return (
        <g>
          <path d="M-48,-10 L-44,-100 Q0,-110 44,-100 L48,-10 Z" fill="#2c1c10" stroke={trim} strokeWidth="1.5" opacity="0.95" />
          <path d="M-40,-18 L-37,-94 Q0,-100 37,-94 L40,-18 Z" fill={darken(color, 0.1)} />
          <ellipse cx="0" cy="8" rx="64" ry="15" fill={darken(color, 0.3)} />
          <ellipse cx="0" cy="4" rx="60" ry="13" fill={color} />
          <ellipse cx="0" cy="3" rx="54" ry="10" fill="none" stroke={trim} strokeWidth="1.4" opacity="0.8" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="-56" y={big ? -168 : -140} width="112" height={big ? 162 : 134} rx="24" fill={color} stroke={darken(color, 0.4)} strokeWidth="2" />
          <rect x="-46" y={big ? -158 : -130} width="92" height={big ? 142 : 114} rx="16" fill={inner} />
          <path d={`M-40,${big ? -150 : -122} Q0,${big ? -162 : -134} 40,${big ? -150 : -122}`} fill="none" stroke={trim} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
          {big && (
            <g fill={trim}>
              <circle cx="-48" cy="-172" r="5" />
              <circle cx="48" cy="-172" r="5" />
            </g>
          )}
        </g>
      );
  }
}

function Lip({ lip }: { lip: NonNullable<ThemeDef["lip"]> }) {
  const { w, h, top, body, edge } = lip;
  return (
    <g>
      <path d={`M${-w / 2},-4 Q${-w / 2},-16 ${-w / 2 + 12},-16 L${w / 2 - 12},-16 Q${w / 2},-16 ${w / 2},-4 L${w / 2},${h - 16} L${-w / 2},${h - 16} Z`} fill={body} />
      <path d={`M${-w / 2},-4 Q${-w / 2},-16 ${-w / 2 + 12},-16 L${w / 2 - 12},-16 Q${w / 2},-16 ${w / 2},-4 L${w / 2},6 L${-w / 2},6 Z`} fill={top} />
      <path d={`M${-w / 2 + 6},-15 L${w / 2 - 6},-15`} stroke={edge} strokeWidth="2" opacity="0.8" strokeLinecap="round" />
      <path d={`M${-w / 2},${h - 16} L${w / 2},${h - 16}`} stroke="#000" strokeOpacity="0.2" strokeWidth="3" />
    </g>
  );
}

function Props({ kind }: { kind: PropKind }) {
  const bottle = (
    <g transform="translate(34 6)">
      <path d="M-5,0 L-5,-26 Q-5,-32 -2,-34 L-2,-40 L2,-40 L2,-34 Q5,-32 5,-26 L5,0 Z" fill="#cfe9f7" fillOpacity="0.82" stroke="#8fb8d0" strokeWidth="1" />
      <rect x="-2.6" y="-44" width="5.2" height="5" fill="#2f78c4" />
      <rect x="-5" y="-20" width="10" height="9" fill="#2f78c4" opacity="0.7" />
    </g>
  );
  switch (kind) {
    case "mic_bottle":
      return (
        <g>
          {bottle}
          <g transform="translate(-34 8)">
            <ellipse cx="0" cy="2" rx="8" ry="3" fill="#15171b" />
            <path d="M0,0 C0,-14 6,-24 12,-30" stroke="#2b2f36" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="13" cy="-32" rx="5" ry="6" fill="#1b1e24" transform="rotate(25 13 -32)" />
            <ellipse cx="12" cy="-34" rx="2" ry="2.4" fill="#5a6270" />
          </g>
        </g>
      );
    case "bottle_note":
      return (
        <g>
          {bottle}
          <g transform="translate(-34 8) rotate(-6)">
            <rect x="-16" y="-12" width="32" height="14" rx="2" fill="#fff" stroke="#c9d1db" />
            <path d="M-11,-7 L11,-7 M-11,-3 L6,-3" stroke="#9aa8bc" strokeWidth="1.2" />
          </g>
        </g>
      );
    case "tea_pet":
      return (
        <g>
          <g transform="translate(34 8)">
            <path d="M-5,0 L-5,-26 Q-5,-32 -2,-34 L-2,-40 L2,-40 L2,-34 Q5,-32 5,-26 L5,0 Z" fill="#a47a3a" fillOpacity="0.8" stroke="#7a5a28" strokeWidth="1" />
            <rect x="-2.6" y="-44" width="5.2" height="5" fill="#2c7d56" />
            <rect x="-5" y="-20" width="10" height="9" fill="#2c7d56" opacity="0.8" />
          </g>
          <g transform="translate(-34 8)">
            <path d="M-9,-14 L9,-14 L7,2 L-7,2 Z" fill="#fff" stroke="#c9c0a8" />
            <ellipse cx="0" cy="-14" rx="9" ry="2.6" fill="#b88a4a" />
          </g>
        </g>
      );
    case "teacup":
      return (
        <g>
          <g transform="translate(36 10)">
            <ellipse cx="0" cy="2" rx="13" ry="4" fill="#f4efe0" />
            <path d="M-8,-10 L8,-10 L6,2 L-6,2 Z" fill="#3a6a8a" stroke="#264a64" />
            <ellipse cx="0" cy="-10" rx="8" ry="2.4" fill="#9ab86a" />
          </g>
        </g>
      );
    default:
      return (
        <g>
          <g transform="translate(34 8)">
            <path d="M-7,-18 L7,-18 L5,2 L-5,2 Z" fill="#dff0fb" fillOpacity="0.7" stroke="#9cc4dc" />
            <path d="M-6,-8 L6,-8 L5,2 L-5,2 Z" fill="#8fc4ea" opacity="0.6" />
          </g>
          <g transform="translate(-36 8) rotate(-5)">
            <rect x="-17" y="-14" width="34" height="16" rx="2" fill="#7a2330" stroke="#d4af37" strokeWidth="1.2" />
            <path d="M-11,-8 L11,-8" stroke="#d4af37" strokeWidth="1.2" />
          </g>
        </g>
      );
  }
}

function NamePlate({
  participant,
  theme,
  chair,
}: {
  participant: Participant;
  theme: ThemeDef;
  chair: boolean;
}) {
  const role = getRole(participant.roleId);
  const country = getCountry(participant.countryCode);
  const title = role?.shortTitle ?? "";
  const flag = country?.flag ?? "";
  const { bg, bg2, ink, edge } = theme.plate;
  const facil = participant.isFacilitator;
  const W = 116;
  const availT = W - 30;
  const tSize = Math.min(15, availT / Math.max(visualWidth(title), 1));
  const nameSize = Math.min(12.5, (W - 14) / Math.max(visualWidth(participant.name), 1));
  void chair;
  return (
    <g>
      <rect x={-W / 2 + 2} y="-14" width={W} height="40" rx="4" fill="#000" opacity="0.22" />
      <path d={`M${-W / 2},24 L${-W / 2},-4 Q${-W / 2},-12 ${-W / 2 + 8},-12 L${W / 2 - 8},-12 Q${W / 2},-12 ${W / 2},-4 L${W / 2},24 Z`} fill={facil ? "#f6e3a1" : bg} stroke={facil ? "#b08a2c" : edge} strokeWidth="1.5" />
      <path d={`M${-W / 2},-4 Q${-W / 2},-12 ${-W / 2 + 8},-12 L${W / 2 - 8},-12 Q${W / 2},-12 ${W / 2},-4 L${W / 2},2 L${-W / 2},2 Z`} fill={bg2} opacity="0.9" />
      <text x={-W / 2 + 8} y="11" fontSize="14" textAnchor="start">
        {flag}
      </text>
      <text
        x={-W / 2 + 28}
        y="10"
        fontSize={tSize}
        fontWeight="700"
        fill={ink}
        textLength={visualWidth(title) * tSize > availT ? availT : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {title}
      </text>
      <text x="0" y="22" fontSize={nameSize} fill={ink} textAnchor="middle" opacity="0.88" textLength={visualWidth(participant.name) * nameSize > W - 14 ? W - 14 : undefined} lengthAdjust="spacingAndGlyphs">
        {participant.name}
      </text>
    </g>
  );
}

function ChairSign({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} -30)`}>
      <path d="M-20,0 L-20,-6 L20,-6 L20,0" fill="none" stroke="#7a5a1c" strokeWidth="2" />
      <rect x="-22" y="-8" width="44" height="22" rx="4" fill="#b4202f" stroke="#e5bd45" strokeWidth="2" />
      <text x="0" y="8" fontSize="14" fontWeight="800" fill="#fff6d6" textAnchor="middle">
        議長
      </text>
    </g>
  );
}

function Gavel() {
  return (
    <g transform="translate(0 4)">
      <ellipse cx="0" cy="8" rx="16" ry="4" fill="#000" opacity="0.25" />
      <rect x="-12" y="0" width="24" height="8" rx="2" fill="#5a3a1c" stroke="#3a220e" />
      <g transform="rotate(-24 0 -2)">
        <rect x="-3" y="-26" width="6" height="26" rx="2" fill="#8a5a2c" />
        <rect x="-11" y="-34" width="22" height="12" rx="3" fill="#a06a34" stroke="#5a3a1c" />
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ bubbles

function SpeechBubble({ x, headTop, text }: { x: number; headTop: number; text: string }) {
  const W = 450;
  const H = 176;
  const bb = headTop - 16;
  const bx = clamp(x - W / 2, 14, 1600 - 14 - W);
  const tx = clamp(x, bx + 34, bx + W - 34);
  const top = Math.max(6, bb - H);
  const fh = bb - top;
  return (
    <g className={styles.bubbleIn} style={{ pointerEvents: "none" }}>
      <foreignObject x={bx} y={top} width={W} height={fh} style={{ overflow: "visible" }}>
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              background: "#ffffff",
              border: "3px solid #2f3a4d",
              borderRadius: 22,
              padding: "12px 18px",
              fontSize: 23,
              lineHeight: 1.42,
              color: "#1d2433",
              fontWeight: 500,
              boxShadow: "0 6px 14px rgba(0,0,0,0.28)",
            }}
          >
            <div className={styles.bubbleText}>{text}</div>
          </div>
        </div>
      </foreignObject>
      <path d={`M${tx - 15},${bb - 3} L${tx + 2},${bb + 16} L${tx + 15},${bb - 3}`} fill="#fff" stroke="#2f3a4d" strokeWidth="3" strokeLinejoin="round" />
      <rect x={tx - 13} y={bb - 6} width="26" height="5" fill="#fff" />
    </g>
  );
}

function ThoughtCloud({ x, y, text, side }: { x: number; y: number; text: string; side?: "left" | "right" }) {
  const W = 210;
  const H = 84;
  let cx = x - W / 2;
  let bottom = y;
  if (side === "right") {
    cx = x + 30;
    bottom = y + 30;
  } else if (side === "left") {
    cx = x - 30 - W;
    bottom = y + 30;
  }
  cx = clamp(cx, 8, 1600 - 8 - W);
  const top = Math.max(4, bottom - H);
  const fh = bottom - top;
  return (
    <g className={styles.cloud} style={{ pointerEvents: "none" }}>
      <foreignObject x={cx} y={top} width={W} height={fh} style={{ overflow: "visible" }}>
        <div style={{ height: "100%", display: "flex", alignItems: "flex-end", fontFamily: FONT }}>
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              background: "rgba(255,255,255,0.94)",
              border: "2.5px solid #7b88a0",
              borderRadius: 30,
              padding: "9px 16px",
              fontSize: 15,
              lineHeight: 1.35,
              color: "#3c455a",
              fontStyle: "italic",
              boxShadow: "0 4px 10px rgba(0,0,0,0.22)",
            }}
          >
            <div className={styles.thoughtText}>{text}</div>
          </div>
        </div>
      </foreignObject>
      {side ? (
        <g fill="#fff" stroke="#7b88a0" strokeWidth="2">
          <circle cx={side === "right" ? x + 22 : x - 22} cy={bottom - 6} r="5" />
          <circle cx={side === "right" ? x + 12 : x - 12} cy={bottom + 4} r="3.4" />
        </g>
      ) : (
        <g fill="#fff" stroke="#7b88a0" strokeWidth="2">
          <circle cx={clamp(x, cx + 20, cx + W - 20)} cy={bottom + 8} r="5.5" />
          <circle cx={clamp(x, cx + 20, cx + W - 20)} cy={bottom + 20} r="3.6" />
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------------ room

interface Placed {
  p: Participant;
  seat: Seat;
  index: number;
  phys: number;
}

export interface RoomExtraProps {
  /** Override the sky (defaults to the viewer's local time). */
  timeOfDay?: TimeOfDay;
}

export default function Room({
  theme,
  participants,
  speakingId,
  bubbleText,
  stances,
  thoughts,
  showThoughts,
  boardTitle,
  boardSubtitle,
  selectedId,
  onSeatClick,
  className,
  timeOfDay: todOverride,
}: RoomProps & RoomExtraProps) {
  const rawId = useId();
  const uid = "rm" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const [tod, setTod] = useState<TimeOfDay>("day");
  useEffect(() => {
    const update = () => setTod(timeOfDay(new Date()));
    update();
    const t = window.setInterval(update, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  const activeTod = todOverride ?? tod;

  const def = THEMES[theme];
  const seats = SEATS[theme];

  const placed: Placed[] = useMemo(() => {
    const map = assignSeats(participants);
    return participants
      .filter((p) => map.has(p.id))
      .map((p, index) => {
        const phys = map.get(p.id) ?? 0;
        return { p, seat: seats[phys], index, phys };
      });
  }, [participants, seats]);

  const speaker = speakingId ? placed.find((pl) => pl.p.id === speakingId) : undefined;
  const back = placed.filter((pl) => pl.seat.layer === "back").sort((a, b) => a.seat.y - b.seat.y);
  const front = placed.filter((pl) => pl.seat.layer === "front").sort((a, b) => a.seat.y - b.seat.y);

  const renderSeat = (pl: Placed, withLip: boolean): ReactNode => {
    const { p, seat, phys } = pl;
    const isChair = phys === 0;
    const isSpeaker = speakingId === p.id;
    const dim = !!speaker && !isSpeaker;
    const expr = expressionFor(stances?.[p.id], p.id);
    const selected = selectedId === p.id;
    const s = seat.s;
    return (
      <g
        key={p.id}
        className={`${styles.seat} ${dim ? styles.dim : styles.lit}`}
        role={onSeatClick ? "button" : undefined}
        tabIndex={onSeatClick ? 0 : undefined}
        aria-label={`${p.name}`}
        onClick={onSeatClick ? () => onSeatClick(p.id) : undefined}
        onKeyDown={
          onSeatClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeatClick(p.id);
                }
              }
            : undefined
        }
      >
        <g transform={`translate(${seat.x} ${seat.y})`}>
          <g className={styles.seatIn} style={{ animationDelay: `${pl.index * 60}ms` }}>
            {/* floor / hover glow */}
            <ellipse className={styles.hoverGlow} cx="0" cy="-60" rx={78 * s} ry={96 * s} fill="#ffe28a" opacity="0.28" />
            {isSpeaker && <ellipse cx="0" cy="-10" rx={92 * s} ry={22 * s} fill={def.spot} opacity="0.55" />}
            <g transform={`scale(${s})`}>
              <Chair kind={def.chair.kind} color={def.chair.color} trim={def.chair.trim} big={isChair} />
            </g>
            <g className={isSpeaker ? styles.speaking : styles.nod} style={{ animationDelay: isSpeaker ? undefined : `${-(hash(p.id) % 9000) / 1000}s` }}>
              <g transform={`translate(${-60 * s} ${-150 * s}) scale(${s})`}>
                <Avatar participant={p} expression={expr} speaking={isSpeaker} standalone={false} />
              </g>
            </g>
            {selected && (
              <g className={styles.selected}>
                <rect x={-66 * s} y={-156 * s} width={132 * s} height={168 * s} rx={18 * s} fill="none" stroke="#ffd23c" strokeWidth="4" strokeDasharray="10 6" />
                <rect x={-66 * s} y={-156 * s} width={132 * s} height={168 * s} rx={18 * s} fill="#ffd23c" opacity="0.12" />
              </g>
            )}
            {withLip && def.lip && (
              <g transform={`scale(${s})`}>
                <Lip lip={def.lip} />
              </g>
            )}
          </g>
        </g>
        {/* hit area */}
        {onSeatClick && <rect x={seat.x - 66 * s} y={seat.y - 156 * s} width={132 * s} height={216 * s} fill="transparent" />}
      </g>
    );
  };

  const speakerHeadTop = speaker ? speaker.seat.y - 138 * speaker.seat.s - (speaker.p.avatar.hairStyle === 6 ? 14 * speaker.seat.s : 0) : 0;
  const Backdrop = def.Backdrop;
  const Table = def.Table;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", display: "block", fontFamily: FONT }}
      role="img"
      aria-label="会議室"
    >
      <defs>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8dc" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff8dc" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <Backdrop uid={uid} tod={activeTod} boardTitle={boardTitle} boardSubtitle={boardSubtitle} />

      {speaker && (
        <path
          className={styles.beam}
          d={`M${speaker.seat.x - 34},0 L${speaker.seat.x + 34},0 L${speaker.seat.x + 150},${speaker.seat.y + 10} L${speaker.seat.x - 150},${speaker.seat.y + 10} Z`}
          fill={`url(#${uid}-beam)`}
          style={{ mixBlendMode: "screen", pointerEvents: "none" }}
        />
      )}

      {back.map((pl) => renderSeat(pl, false))}
      <Table uid={uid} tod={activeTod} />
      {front.map((pl) => renderSeat(pl, true))}

      {/* name plates, props, chair signs (above all avatars so they stay readable) */}
      {[...back, ...front].map((pl) => (
        <g key={`pl-${pl.p.id}`} style={{ pointerEvents: "none" }}>
          <g transform={`translate(${pl.seat.x + (pl.seat.plate?.dx ?? 0)} ${pl.seat.y + 20 + (pl.seat.plate?.dy ?? 0)}) scale(${Math.max(pl.seat.s * 0.92, 0.95)})`}>
            <g transform="scale(0.95)">
              <Props kind={def.props} />
            </g>
            {pl.p.isFacilitator && <ChairSign x={-46} />}
            <NamePlate participant={pl.p} theme={def} chair={pl.phys === 0} />
            {pl.p.isFacilitator && (
              <g transform="translate(74 4)">
                <Gavel />
              </g>
            )}
          </g>
        </g>
      ))}

      {/* thoughts */}
      {showThoughts &&
        placed.map((pl) => {
          const t = thoughts?.[pl.p.id];
          if (!t) return null;
          const isSpeaker = speakingId === pl.p.id && !!bubbleText;
          const headTop = pl.seat.y - 138 * pl.seat.s;
          return isSpeaker ? (
            <ThoughtCloud key={`th-${pl.p.id}`} x={pl.seat.x} y={headTop + 40} text={t} side={pl.seat.x < 800 ? "right" : "left"} />
          ) : (
            <ThoughtCloud key={`th-${pl.p.id}`} x={pl.seat.x} y={headTop - 24} text={t} />
          );
        })}

      {speaker && bubbleText && <SpeechBubble key={`${speaker.p.id}-bubble`} x={speaker.seat.x} headTop={speakerHeadTop} text={bubbleText} />}
    </svg>
  );
}
