"use client";

import { useMeetingStore } from "@/store/meetingStore";
import { Icon } from "./icons";

/** Shown when localStorage can no longer be written: progress would be lost on reload. */
export function StorageWarning() {
  const full = useMeetingStore((s) => s.storageFull);
  if (!full) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-yellow bg-yellow-tint px-4 py-2.5 text-sm text-ink" role="alert">
      <Icon name="alert" size={16} className="text-yellow-strong" />
      <span>ブラウザの保存容量がいっぱいで、会議の記録を保存できません。このままページを閉じると失われます。</span>
      <button
        type="button"
        className="rounded-md border border-line bg-white px-3 py-1 text-xs font-medium hover:border-ink-3"
        onClick={() => {
          if (confirm("終了済みの古い会議を削除して容量を空けます（新しい3件は残します）。よろしいですか？")) {
            const n = useMeetingStore.getState().pruneOld(3);
            if (n === 0) alert("削除できる終了済みの会議がありません。ホームから不要な会議を削除してください。");
          }
        }}
      >
        古い会議を削除
      </button>
    </div>
  );
}
