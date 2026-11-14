"use client";

import { useMeetingStore } from "@/store/meetingStore";

/** Shown when localStorage can no longer be written: progress would be lost on reload. */
export function StorageWarning() {
  const full = useMeetingStore((s) => s.storageFull);
  if (!full) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900" role="alert">
      <span>ブラウザの保存容量がいっぱいで、会議の記録を保存できません。このままページを閉じると失われます。</span>
      <button
        type="button"
        className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100"
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
