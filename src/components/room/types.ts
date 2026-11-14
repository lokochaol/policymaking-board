import type { Participant, RoomTheme, Stance } from "@/lib/types";

export type Expression = "neutral" | "smile" | "concern" | "frown" | "thinking" | "surprised";

/** Props contract for <Room/> (owned by the visual agent, consumed by the UI agent). */
export interface RoomProps {
  theme: RoomTheme;
  participants: Participant[];
  /** Participant currently speaking (mouth animation + spotlight). */
  speakingId?: string;
  /** Text currently shown in the speaker's bubble (already type-written by caller). */
  bubbleText?: string;
  /** Stance per participant -> drives expression. */
  stances?: Record<string, Stance>;
  /** Inner thoughts per participant, shown as thought clouds when showThoughts. */
  thoughts?: Record<string, string>;
  showThoughts?: boolean;
  /** Text on the board/screen at the front of the room (phase name, proposal). */
  boardTitle?: string;
  boardSubtitle?: string;
  selectedId?: string;
  onSeatClick?: (participantId: string) => void;
  className?: string;
}

/** Props contract for <Avatar/>, also used standalone in lists (size via scale). */
export interface AvatarProps {
  participant: Participant;
  expression?: Expression;
  speaking?: boolean;
  scale?: number;
  /** Render as standalone <svg> (true) or as <g> inside the room svg (false). */
  standalone?: boolean;
}
