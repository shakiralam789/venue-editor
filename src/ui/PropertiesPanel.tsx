"use client";
import React from "react";
import { useEditorStore } from "@/state/store";
import type { SelectionTarget, VenueObject, Wall, WallOpening } from "@/model/types";
import { formatLength } from "@/model/units";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-editor-muted w-20 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 0.1,
  suffix
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center bg-editor-bg border border-editor-border rounded px-2 h-7 w-28">
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-transparent outline-none text-sm w-full text-right text-editor-text"
      />
      {suffix && <span className="text-[10px] text-editor-muted ml-1">{suffix}</span>}
    </div>
  );
}

function TextField({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="bg-editor-bg border border-editor-border rounded px-2 h-7 w-40 text-sm text-editor-text outline-none focus:border-editor-accent"
    />
  );
}

function SelectField({
  value,
  options,
  onChange
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-editor-bg border border-editor-border rounded px-2 h-7 w-40 text-sm text-editor-text outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-9 h-7 rounded bg-transparent border border-editor-border cursor-pointer"
    />
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export const PropertiesPanel: React.FC = () => {
  const venue = useEditorStore((s) => s.venue);
  const selection = useEditorStore((s) => s.selection);
  const updateTransform = useEditorStore((s) => s.updateTransform);
  const updateProperty = useEditorStore((s) => s.updateProperty);
  const dispatch = useEditorStore((s) => s.dispatch);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const lockSelection = useEditorStore((s) => s.lockSelection);
  const hideSelection = useEditorStore((s) => s.hideSelection);
  const align = useEditorStore((s) => s.align);
  const distribute = useEditorStore((s) => s.distribute);
  const reorder = useEditorStore((s) => s.reorder);

  const unit = venue.unit;

  if (selection.length === 0) {
    return (
      <div className="w-72 bg-editor-panel border-l border-editor-border flex flex-col no-select">
        <Header title="Properties" />
        <div className="flex-1 flex items-center justify-center text-center px-6 text-editor-muted text-sm">
          Nothing selected.
          <br />
          Use the Select tool to choose an object, wall, or opening.
        </div>
      </div>
    );
  }

  const objTargets = selection.filter((s) => s.kind === "object");
  const wallTargets = selection.filter((s) => s.kind === "wall");
  const openingTargets = selection.filter((s) => s.kind === "opening");

  if (objTargets.length > 1) {
    return (
      <div className="w-72 bg-editor-panel border-l border-editor-border flex flex-col no-select">
        <Header title="Properties" />
        <div className="p-3 space-y-3 overflow-y-auto">
          <div className="text-sm text-editor-text">{objTargets.length} objects selected</div>
          <Section title="Align">
            <div className="grid grid-cols-3 gap-1">
              <Btn onClick={() => align("left")}>L</Btn>
              <Btn onClick={() => align("centerH")}>C</Btn>
              <Btn onClick={() => align("right")}>R</Btn>
              <Btn onClick={() => align("top")}>T</Btn>
              <Btn onClick={() => align("middleV")}>M</Btn>
              <Btn onClick={() => align("bottom")}>B</Btn>
            </div>
          </Section>
          <Section title="Distribute">
            <div className="grid grid-cols-2 gap-1">
              <Btn onClick={() => distribute("h")}>Horizontal</Btn>
              <Btn onClick={() => distribute("v")}>Vertical</Btn>
            </div>
          </Section>
          <Section title="Layer">
            <div className="grid grid-cols-2 gap-1">
              <Btn onClick={() => reorder("front")}>To Front</Btn>
              <Btn onClick={() => reorder("back")}>To Back</Btn>
              <Btn onClick={() => reorder("forward")}>Forward</Btn>
              <Btn onClick={() => reorder("backward")}>Backward</Btn>
            </div>
          </Section>
          <div className="grid grid-cols-2 gap-1 pt-2">
            <ActionBtn onClick={duplicateSelection} label="Duplicate" />
            <ActionBtn onClick={deleteSelection} label="Delete" danger />
          </div>
        </div>
      </div>
    );
  }

  if (wallTargets.length === 1) {
    const wall = venue.walls.find((w) => w.id === wallTargets[0].id);
    if (wall) return <WallPanel wall={wall} dispatch={dispatch} onDelete={deleteSelection} />;
  }

  if (openingTargets.length === 1) {
    const wall = venue.walls.find((w) => w.id === openingTargets[0].wallId);
    const op = wall?.openings.find((o) => o.id === openingTargets[0].id);
    if (wall && op) return <OpeningPanel wall={wall} op={op} dispatch={dispatch} onDelete={deleteSelection} />;
  }

  const obj = venue.objects.find((o) => o.id === objTargets[0]?.id);
  if (!obj) return null;
  return (
    <div className="w-72 bg-editor-panel border-l border-editor-border flex flex-col no-select">
      <Header title="Properties" />
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <Row label="Type">
          <span className="text-sm text-editor-text capitalize">{obj.type.replace(/_/g, " ")}</span>
        </Row>
        <Row label={`X (${unit})`}>
          <NumberInput value={obj.position.x} step={0.1} suffix={unit} onChange={(v) => updateTransform(obj.id, { position: { x: v, y: obj.position.y } })} />
        </Row>
        <Row label={`Y (${unit})`}>
          <NumberInput value={obj.position.y} step={0.1} suffix={unit} onChange={(v) => updateTransform(obj.id, { position: { x: obj.position.x, y: v } })} />
        </Row>
        <Row label={`Width`}>
          <NumberInput value={obj.width} step={0.1} suffix={unit} onChange={(v) => updateTransform(obj.id, { width: Math.max(0.2, v) })} />
        </Row>
        <Row label={`Depth`}>
          <NumberInput value={obj.height} step={0.1} suffix={unit} onChange={(v) => updateTransform(obj.id, { height: Math.max(0.2, v) })} />
        </Row>
        <Row label="Rotation">
          <NumberInput value={obj.rotation} step={1} suffix="°" onChange={(v) => updateTransform(obj.id, { rotation: v })} />
        </Row>
        <Row label="Layer">
          <NumberInput value={obj.z} step={1} onChange={(v) => updateProperty(obj.id, "z", Math.round(v))} />
        </Row>
        <Row label="Label">
          <TextField value={obj.label ?? ""} placeholder="—" onChange={(v) => updateProperty(obj.id, "label", v)} />
        </Row>
        <Row label="Fill">
          <ColorField value={obj.style.fill} onChange={(v) => updateProperty(obj.id, "style.fill", v)} />
        </Row>

        <ExtraFields obj={obj} updateProperty={updateProperty} />

        <div className="grid grid-cols-2 gap-1 pt-3">
          <ActionBtn onClick={() => lockSelection(true)} label="Lock" />
          <ActionBtn onClick={() => hideSelection(true)} label="Hide" />
          <ActionBtn onClick={duplicateSelection} label="Duplicate" />
          <ActionBtn onClick={deleteSelection} label="Delete" danger />
        </div>
      </div>
    </div>
  );
};

function ExtraFields({ obj, updateProperty }: { obj: VenueObject; updateProperty: (id: string, path: string, v: unknown) => void }) {
  const fields: { key: string; label: string; type: "text" | "number" | "select" | "checkbox"; options?: { value: string; label: string }[] }[] = [];
  const p = obj.properties as Record<string, unknown>;
  if (obj.type === "booth") {
    fields.push({ key: "properties.boothNumber", label: "Booth #", type: "text" });
    fields.push({ key: "properties.price", label: "Price", type: "number" });
    fields.push({
      key: "properties.status",
      label: "Status",
      type: "select",
      options: [
        { value: "available", label: "Available" },
        { value: "reserved", label: "Reserved" },
        { value: "sold", label: "Sold" }
      ]
    });
  }
  if (obj.type === "table") {
    fields.push({ key: "properties.seats", label: "Seats", type: "number" });
  }
  if (obj.type === "zone") {
    fields.push({
      key: "properties.zoneType",
      label: "Zone Type",
      type: "select",
      options: ["VIP", "General", "Restricted", "Food", "Registration", "Emergency", "Backstage"].map((z) => ({ value: z, label: z }))
    });
  }
  if (obj.type === "aisle" || obj.type === "corridor") {
    fields.push({ key: "properties.accessible", label: "Accessible", type: "checkbox" });
  }
  if (fields.length === 0) return null;
  return (
    <div className="pt-2 mt-2 border-t border-editor-border">
      <div className="text-[11px] uppercase tracking-wide text-editor-muted mb-1">Details</div>
      {fields.map((f) => {
        const raw = f.key.split(".").reduce((acc: any, k) => acc?.[k], obj);
        return (
          <Row key={f.key} label={f.label}>
            {f.type === "text" && <TextField value={String(raw ?? "")} onChange={(v) => updateProperty(obj.id, f.key, v)} />}
            {f.type === "number" && (
              <NumberInput value={Number(raw ?? 0)} step={1} onChange={(v) => updateProperty(obj.id, f.key, v)} />
            )}
            {f.type === "select" && (
              <SelectField value={String(raw ?? "")} options={f.options ?? []} onChange={(v) => updateProperty(obj.id, f.key, v)} />
            )}
            {f.type === "checkbox" && (
              <Checkbox checked={Boolean(raw)} onChange={(v) => updateProperty(obj.id, f.key, v)} label="" />
            )}
          </Row>
        );
      })}
    </div>
  );
}

function WallPanel({ wall, dispatch, onDelete }: { wall: Wall; dispatch: any; onDelete: () => void }) {
  const unit = useEditorStore((s) => s.venue.unit);
  const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const set = (patch: Partial<{ thickness: number; height: number }>) => {
    dispatch(
      {
        kind: "UPDATE_WALL",
        id: wall.id,
        before: { start: wall.start, end: wall.end, thickness: wall.thickness, height: wall.height },
        after: { start: wall.start, end: wall.end, thickness: patch.thickness ?? wall.thickness, height: patch.height ?? wall.height }
      },
      `wall:${wall.id}:${patch.thickness !== undefined ? "t" : "h"}`
    );
  };
  return (
    <div className="w-72 bg-editor-panel border-l border-editor-border flex flex-col no-select">
      <Header title="Wall" />
      <div className="p-3 space-y-1">
        <Row label="Length">
          <span className="text-sm text-editor-text">{formatLength(len, unit)}</span>
        </Row>
        <Row label="Thickness">
          <NumberInput value={wall.thickness} step={0.05} suffix={unit} onChange={(v) => set({ thickness: Math.max(0.05, v) })} />
        </Row>
        <Row label="Height">
          <NumberInput value={wall.height} step={0.1} suffix={unit} onChange={(v) => set({ height: Math.max(0.1, v) })} />
        </Row>
        <div className="pt-3">
          <ActionBtn onClick={onDelete} label="Delete Wall" danger />
        </div>
      </div>
    </div>
  );
}

function OpeningPanel({ wall, op, dispatch, onDelete }: { wall: Wall; op: WallOpening; dispatch: any; onDelete: () => void }) {
  const unit = useEditorStore((s) => s.venue.unit);
  const set = (patch: Partial<{ width: number; swing: any }>) => {
    dispatch(
      {
        kind: "UPDATE_OPENING",
        id: op.id,
        before: { tOffset: op.tOffset, width: op.width, swing: op.swing },
        after: { tOffset: op.tOffset, width: patch.width ?? op.width, swing: patch.swing ?? op.swing }
      },
      `open:${op.id}:${patch.width !== undefined ? "w" : "s"}`
    );
  };
  return (
    <div className="w-72 bg-editor-panel border-l border-editor-border flex flex-col no-select">
      <Header title={op.type === "door" ? "Door" : "Window"} />
      <div className="p-3 space-y-1">
        <Row label={`Width`}>
          <NumberInput value={op.width} step={0.1} suffix={unit} onChange={(v) => set({ width: Math.max(0.3, v) })} />
        </Row>
        {op.type === "door" && (
          <Row label="Swing">
            <SelectField
              value={op.swing}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
                { value: "none", label: "None" }
              ]}
              onChange={(v) => set({ swing: v })}
            />
          </Row>
        )}
        <div className="pt-3">
          <ActionBtn onClick={onDelete} label={`Delete ${op.type}`} danger />
        </div>
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="px-3 py-3 border-b border-editor-border">
      <div className="text-sm font-semibold text-editor-text">{title}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-editor-muted mb-1">{title}</div>
      {children}
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-8 rounded bg-editor-panel2 hover:bg-editor-border text-editor-text text-xs font-medium"
    >
      {children}
    </button>
  );
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 rounded text-sm font-medium transition-colors ${
        danger ? "bg-editor-danger/20 text-editor-danger hover:bg-editor-danger/30" : "bg-editor-panel2 text-editor-text hover:bg-editor-border"
      }`}
    >
      {label}
    </button>
  );
}
