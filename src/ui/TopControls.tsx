"use client";
import React from "react";
import { useEditorStore } from "@/state/store";
import type { Unit } from "@/model/units";
import { Icon } from "@/ui/icons";

const UNITS: Unit[] = ["mm", "cm", "m", "ft"];

export const TopControls: React.FC = () => {
  const venue = useEditorStore((s) => s.venue);
  const setVenueMeta = useEditorStore((s) => s.setVenueMeta);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const sync = useEditorStore((s) => s.sync);
  const retrySave = useEditorStore((s) => s.retrySave);

  const simulateFailure = () => {
    const p = useEditorStore.getState().persistence as unknown as { failNext?: () => void };
    p.failNext?.();
    setVenueMeta({});
  };

  return (
    <div className="h-12 bg-editor-panel border-b border-editor-border flex items-center px-3 gap-3 no-select">
      <div className="flex items-center gap-2 pr-3 border-r border-editor-border">
        <div className="w-6 h-6 rounded bg-editor-accent flex items-center justify-center text-white font-bold text-sm">T</div>
        <span className="font-semibold text-editor-text">Thotic Venue Editor</span>
      </div>

      <input
        value={venue.name}
        onChange={(e) => setVenueMeta({ name: e.target.value })}
        className="bg-editor-bg border border-transparent hover:border-editor-border focus:border-editor-accent rounded px-2 h-8 text-sm text-editor-text outline-none w-56"
      />

      <div className="w-px h-6 bg-editor-border" />

      <Toggle active={venue.showGrid} onClick={() => setVenueMeta({ showGrid: !venue.showGrid })} icon="grid" label="Grid" />
      <Toggle active={venue.snapToGrid} onClick={() => setVenueMeta({ snapToGrid: !venue.snapToGrid })} icon="snap" label="Snap" />

      <div className="flex items-center gap-1 text-xs text-editor-muted">
        <span>Size</span>
        <input
          type="number"
          step={0.5}
          value={venue.gridSize}
          onChange={(e) => setVenueMeta({ gridSize: Math.max(0.1, parseFloat(e.target.value) || 1) })}
          className="bg-editor-bg border border-editor-border rounded px-2 h-7 w-16 text-editor-text outline-none"
        />
        <span>{venue.unit}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-editor-muted">
        <span>Units</span>
        <select
          value={venue.unit}
          onChange={(e) => setVenueMeta({ unit: e.target.value as Unit })}
          className="bg-editor-bg border border-editor-border rounded px-2 h-7 text-editor-text outline-none"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1" />

      {sync === "error" && (
        <button
          onClick={retrySave}
          className="flex items-center gap-1.5 h-8 px-3 rounded bg-editor-danger/20 text-editor-danger text-sm font-medium hover:bg-editor-danger/30"
        >
          <Icon name="retry" size={15} /> Retry
        </button>
      )}

      <button
        onClick={simulateFailure}
        className="flex items-center gap-1.5 h-8 px-3 rounded bg-editor-panel2 hover:bg-editor-border text-editor-muted text-xs"
        title="Force the next autosave to fail (demonstrates error recovery)"
      >
        <Icon name="warn" size={14} /> Simulate failure
      </button>

      <div className="w-px h-6 bg-editor-border" />

      <button
        onClick={undo}
        disabled={!canUndo}
        className="w-9 h-9 rounded flex items-center justify-center text-editor-text enabled:hover:bg-editor-panel2 disabled:opacity-30"
        title="Undo (Ctrl+Z)"
      >
        <Icon name="undo" />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="w-9 h-9 rounded flex items-center justify-center text-editor-text enabled:hover:bg-editor-panel2 disabled:opacity-30"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Icon name="redo" />
      </button>
    </div>
  );
};

function Toggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-sm transition-colors ${
        active ? "bg-editor-accent/20 text-editor-accent" : "text-editor-muted hover:bg-editor-panel2 hover:text-editor-text"
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
