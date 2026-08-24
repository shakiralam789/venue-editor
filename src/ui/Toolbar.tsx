"use client";
import React from "react";
import { useEditorStore } from "@/state/store";
import type { ToolType } from "@/state/store";
import { Icon } from "@/ui/icons";
import type { IconName } from "@/ui/icons";

const TOOLS: { tool: ToolType; icon: IconName; label: string; key?: string }[] = [
  { tool: "select", icon: "select", label: "Select", key: "V" },
  { tool: "pan", icon: "pan", label: "Pan", key: "H" },
  { tool: "wall", icon: "wall", label: "Wall", key: "W" },
  { tool: "door", icon: "door", label: "Door", key: "D" },
  { tool: "window", icon: "window", label: "Window", key: "N" },
  { tool: "zone", icon: "zone", label: "Zone", key: "Z" },
  { tool: "aisle", icon: "aisle", label: "Aisle", key: "A" },
  { tool: "object", icon: "object", label: "Place Object", key: "O" },
  { tool: "measure", icon: "measure", label: "Measure", key: "M" }
];

export const Toolbar: React.FC = () => {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div className="flex flex-col gap-1 p-2 bg-editor-panel border-r border-editor-border no-select">
      {TOOLS.map((t) => {
        const active = tool === t.tool;
        return (
          <button
            key={t.tool}
            title={`${t.label}${t.key ? ` (${t.key})` : ""}`}
            onClick={() => setTool(t.tool)}
            className={`relative w-11 h-11 rounded-md flex items-center justify-center transition-colors ${
              active ? "bg-editor-accent text-white" : "text-editor-muted hover:bg-editor-panel2 hover:text-editor-text"
            }`}
          >
            <Icon name={t.icon} />
            {t.key && (
              <span className="absolute bottom-0.5 right-1 text-[9px] opacity-50">{t.key}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
