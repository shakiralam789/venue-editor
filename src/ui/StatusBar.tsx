"use client";
import React from "react";
import { useEditorStore } from "@/state/store";
import { Icon } from "@/ui/icons";
import { PIXELS_PER_METER } from "@/model/units";

const STATUS_META: Record<string, { label: string; color: string }> = {
  idle: { label: "Saved", color: "#8b93a7" },
  saving: { label: "Saving…", color: "#ffb454" },
  saved: { label: "All changes saved", color: "#46d18a" },
  error: { label: "Save failed — retry", color: "#ff5d5d" }
};

export const StatusBar: React.FC<{ measure: string | null }> = ({ measure }) => {
  const sync = useEditorStore((s) => s.sync);
  const syncMessage = useEditorStore((s) => s.syncMessage);
  const selection = useEditorStore((s) => s.selection);
  const tool = useEditorStore((s) => s.tool);
  const camera = useEditorStore((s) => s.camera);
  const meta = STATUS_META[sync] ?? STATUS_META.idle;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-editor-panel/90 backdrop-blur border border-editor-border rounded-lg px-3 py-1.5 text-xs no-select shadow-lg">
      <span className="text-editor-muted capitalize">{tool} tool</span>
      <span className="text-editor-muted">·</span>
      <span className="text-editor-text">{selection.length} selected</span>
      <span className="text-editor-muted">·</span>
      <span className="text-editor-muted">{Math.round((camera.scale / PIXELS_PER_METER) * 100)}%</span>
      {measure && (
        <>
          <span className="text-editor-muted">·</span>
          <span className="text-editor-ok font-medium">{measure}</span>
        </>
      )}
      <span className="text-editor-muted">·</span>
      <span className="flex items-center gap-1.5" style={{ color: meta.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
        {syncMessage ?? meta.label}
      </span>
    </div>
  );
};
