import type { ComponentType } from "react";
import type { RoomTheme } from "@/lib/types";
import type { BackdropProps, TimeOfDay } from "./common";
import { BackroomBackdrop, BackroomTable } from "./backroom";
import { CabinetBackdrop, CabinetTable } from "./cabinet";
import { CouncilBackdrop, CouncilTable } from "./council";
import { RoundtableBackdrop, RoundtableTable } from "./roundtable";
import { TownhallBackdrop, TownhallTable } from "./townhall";

export type PropKind = "mic_bottle" | "bottle_note" | "tea_pet" | "teacup" | "glass_folder";

export interface ThemeDef {
  Backdrop: ComponentType<BackdropProps>;
  Table: ComponentType<{ uid: string; tod: TimeOfDay }>;
  /** Desk front lip drawn in front of front-layer avatars. */
  lip: { top: string; body: string; edge: string; h: number; w: number } | null;
  chair: { color: string; trim: string; kind: "high" | "folding" | "cushion" | "leather" };
  props: PropKind;
  plate: { bg: string; bg2: string; ink: string; edge: string };
  /** floor shadow tint */
  spot: string;
}

export const THEMES: Record<RoomTheme, ThemeDef> = {
  council_chamber: {
    Backdrop: CouncilBackdrop,
    Table: CouncilTable,
    lip: { top: "#8a5a36", body: "#5e3a20", edge: "#c99660", h: 40, w: 136 },
    chair: { color: "#223a2e", trim: "#c99660", kind: "high" },
    props: "mic_bottle",
    plate: { bg: "#fffdf6", bg2: "#e9e1cc", ink: "#2a1d12", edge: "#b58f56" },
    spot: "#fff4d0",
  },
  roundtable_hall: {
    Backdrop: RoundtableBackdrop,
    Table: RoundtableTable,
    lip: { top: "#efe9dd", body: "#bfb4a0", edge: "#fff", h: 38, w: 140 },
    chair: { color: "#3a4a63", trim: "#aeb8c6", kind: "high" },
    props: "bottle_note",
    plate: { bg: "#ffffff", bg2: "#e4e9f0", ink: "#1e2a3c", edge: "#9aa8bc" },
    spot: "#ffffff",
  },
  townhall: {
    Backdrop: TownhallBackdrop,
    Table: TownhallTable,
    lip: { top: "#e7dcc2", body: "#b3a07a", edge: "#fff6dc", h: 34, w: 132 },
    chair: { color: "#6f7782", trim: "#9aa3ae", kind: "folding" },
    props: "tea_pet",
    plate: { bg: "#fffdf4", bg2: "#efe4c8", ink: "#2d2616", edge: "#c8b27a" },
    spot: "#fffbe0",
  },
  backroom: {
    Backdrop: BackroomBackdrop,
    Table: BackroomTable,
    lip: { top: "#4e2f1a", body: "#2e1a0c", edge: "#8a5f38", h: 22, w: 116 },
    chair: { color: "#5a2a3a", trim: "#d6b25a", kind: "cushion" },
    props: "teacup",
    plate: { bg: "#f6ecd6", bg2: "#e0cfa6", ink: "#2a1a0e", edge: "#9a7a46" },
    spot: "#ffd9a0",
  },
  cabinet_room: {
    Backdrop: CabinetBackdrop,
    Table: CabinetTable,
    lip: { top: "#7a3d24", body: "#3a1a10", edge: "#e5bd45", h: 40, w: 138 },
    chair: { color: "#5a1219", trim: "#e5bd45", kind: "leather" },
    props: "glass_folder",
    plate: { bg: "#fffaf0", bg2: "#ecdcb4", ink: "#2b1a10", edge: "#d4af37" },
    spot: "#ffe6b0",
  },
};
