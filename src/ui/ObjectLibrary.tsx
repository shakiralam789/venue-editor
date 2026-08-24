"use client";
import React from "react";
import { CATALOG_BY_CATEGORY, OBJECT_DEFINITIONS } from "@/model/objectDefs";
import type { ObjectDefinition } from "@/model/objectDefs";
import type { ObjectCategory } from "@/model/types";
import { useEditorStore } from "@/state/store";
import type { ObjectType } from "@/model/types";

const CATEGORY_ORDER: ObjectCategory[] = [
  "Furniture",
  "Event",
  "Infrastructure",
  "Navigation",
  "Zones",
  "Facilities",
  "Custom"
];

export const ObjectLibrary: React.FC = () => {
  const setActiveObjectType = useEditorStore((s) => s.setActiveObjectType);
  const setTool = useEditorStore((s) => s.setTool);
  const activeObjectType = useEditorStore((s) => s.activeObjectType);

  const arm = (def: ObjectDefinition) => {
    setActiveObjectType(def.type);
    setTool("object");
  };

  return (
    <div className="w-60 bg-editor-panel border-r border-editor-border flex flex-col no-select overflow-hidden">
      <div className="px-3 py-3 border-b border-editor-border">
        <div className="text-xs uppercase tracking-wider text-editor-muted">Object Library</div>
        <div className="text-[11px] text-editor-muted mt-1">Click to arm, then click canvas — or drag onto the venue.</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const items = CATALOG_BY_CATEGORY[cat] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-editor-muted">
                {cat}
              </div>
              <div className="space-y-1">
                {items.map((def) => {
                  const active = def.type === activeObjectType;
                  return (
                    <button
                      key={def.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-venue-object", def.type);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => arm(def)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                        active ? "bg-editor-accent/20 ring-1 ring-editor-accent" : "hover:bg-editor-panel2"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: def.defaultStyle.fill, border: `1px solid ${def.defaultStyle.stroke}` }}
                      />
                      <span className="text-sm text-editor-text truncate">{def.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-editor-border text-[10px] text-editor-muted">
        {OBJECT_DEFINITIONS.length} definitions · 3D-ready
      </div>
    </div>
  );
};
