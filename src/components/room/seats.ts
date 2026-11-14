import type { Participant, RoomTheme } from "@/lib/types";

/** A physical seat in the room (viewBox 1600x900). (x, y) is the bottom-centre of the avatar torso. */
export interface Seat {
  x: number;
  y: number;
  /** avatar scale */
  s: number;
  /** back = drawn before the table (table hides the lower body), front = after. */
  layer: "back" | "front";
}

export const SEAT_COUNT = 16;
const rad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const depthScale = (y: number) => lerp(0.76, 1.0, Math.max(0, Math.min(1, (y - 440) / 420)));

function ellipseSeats(cx: number, cy: number, rx: number, ry: number): Seat[] {
  const seats: Seat[] = [];
  for (let i = 0; i < SEAT_COUNT; i++) {
    const th = rad(-90 + (i * 360) / SEAT_COUNT);
    const sin = Math.sin(th);
    const back = sin < -0.35;
    const x = cx + rx * Math.cos(th);
    const y = cy + ry * sin + (back ? 34 : 26);
    seats.push({ x, y, s: depthScale(y), layer: back ? "back" : "front" });
  }
  return seats;
}

// ---- council chamber: U shaped table ------------------------------------
/** Table-top outline for the U table (also used by the theme to draw it). */
export const COUNCIL_U =
  "M392,425 L1208,425 L1342,846 L1172,846 L1106,548 L494,548 L428,846 L258,846 Z";
const rightArmInner = (y: number) => 1106 + ((y - 548) * 66) / 298;

function councilSeats(): Seat[] {
  const mk = (x: number, y: number, layer: Seat["layer"]): Seat => ({ x, y, s: depthScale(y), layer });
  const armY = [598, 664, 730, 796, 862];
  const right = armY.map((y) => mk(rightArmInner(y) - 66, y, "front"));
  const left = armY.map((y) => mk(1600 - (rightArmInner(y) - 66), y, "front")).reverse();
  const bar = (k: number) => mk(800 + k * 120, 466, "back");
  return [bar(0), bar(1), bar(2), ...right, mk(800, 872, "front"), ...left, bar(-2), bar(-1)];
}

// ---- townhall: semicircle of folding tables ------------------------------
export const TOWN_ARC = { cx: 800, cy: 730, rx: 600, ry: 340 };
function townSeats(): Seat[] {
  const { cx, cy, rx, ry } = TOWN_ARC;
  const seats: Seat[] = new Array(SEAT_COUNT);
  const at = (deg: number): Seat => {
    const th = rad(deg);
    const sin = Math.sin(th);
    const x = cx + (rx + 44) * Math.cos(th);
    const y = cy + (ry + 30) * sin + 44;
    return { x, y, s: depthScale(y), layer: sin < -0.7 ? "back" : "front" };
  };
  seats[0] = at(-90);
  for (let k = 1; k <= 7; k++) {
    seats[k] = at(-90 + k * 11.6);
    seats[SEAT_COUNT - k] = at(-90 - k * 11.6);
  }
  seats[8] = { x: 800, y: 850, s: 1, layer: "front" };
  return seats;
}

// ---- backroom: low table, floor cushions ---------------------------------
export const ZA_TABLE = "M440,516 L1160,516 L1262,730 L338,730 Z";
function backroomSeats(): Seat[] {
  const back = (k: number): Seat => ({ x: 800 + k * 108, y: 552, s: 0.84, layer: "back" });
  const front = (k: number): Seat => ({ x: 800 + k * 108, y: 788, s: 1.0, layer: "front" });
  const endSeat = (sign: number): Seat => ({ x: 800 + sign * 540, y: 676, s: 0.92, layer: "front" });
  return [
    back(0), back(1), back(2), back(3),
    endSeat(1),
    front(3), front(2), front(1), front(0), front(-1), front(-2), front(-3),
    endSeat(-1),
    back(-3), back(-2), back(-1),
  ];
}

export const ROUND_TABLE = { cx: 800, cy: 612, rx: 500, ry: 138 };
export const CABINET_TABLE = { cx: 800, cy: 612, rx: 470, ry: 134 };

export const SEATS: Record<RoomTheme, Seat[]> = {
  council_chamber: councilSeats(),
  roundtable_hall: ellipseSeats(ROUND_TABLE.cx, ROUND_TABLE.cy, ROUND_TABLE.rx + 50, ROUND_TABLE.ry + 20),
  townhall: townSeats(),
  backroom: backroomSeats(),
  cabinet_room: ellipseSeats(CABINET_TABLE.cx, CABINET_TABLE.cy, CABINET_TABLE.rx + 48, CABINET_TABLE.ry + 20),
};

/**
 * Map participants to physical seats. Ranks by seatIndex, spreads them evenly over the 16 seats
 * and makes sure the facilitator ends up in the chair seat (0).
 */
export function assignSeats(participants: Participant[]): Map<string, number> {
  const sorted = [...participants].sort((a, b) => a.seatIndex - b.seatIndex).slice(0, SEAT_COUNT);
  const n = sorted.length;
  const phys = sorted.map((_, i) => Math.floor((i * SEAT_COUNT) / n));
  const fac = sorted.findIndex((p) => p.isFacilitator);
  if (fac > 0) {
    const t = phys[fac];
    phys[fac] = phys[0];
    phys[0] = t;
  }
  const map = new Map<string, number>();
  sorted.forEach((p, i) => map.set(p.id, phys[i]));
  return map;
}
