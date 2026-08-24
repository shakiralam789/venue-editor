"use client";

import React, { useEffect, useRef, useState } from "react";
import { PixiRenderer } from "@/renderer/PixiRenderer";
import { EditorEngine } from "@/engine/EditorEngine";
import { useEditorStore } from "@/state/store";
import { createSampleVenue } from "@/model/factory";
import { zoomToward } from "@/lib/geometry";
import { Toolbar } from "@/ui/Toolbar";
import { ObjectLibrary } from "@/ui/ObjectLibrary";
import { PropertiesPanel } from "@/ui/PropertiesPanel";
import { TopControls } from "@/ui/TopControls";
import { ZoomControls } from "@/ui/ZoomControls";
import { StatusBar } from "@/ui/StatusBar";

const TOOL_KEYS: Record<string, any> = {
  v: "select",
  h: "pan",
  w: "wall",
  d: "door",
  n: "window",
  z: "zone",
  a: "aisle",
  o: "object",
  m: "measure"
};

export default function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const [measure, setMeasure] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const camera = useEditorStore((s) => s.camera);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current!;
    const renderer = new PixiRenderer();
    const engine = new EditorEngine(renderer);
    rendererRef.current = renderer;
    engineRef.current = engine;

    renderer.init(container).then(() => {
      if (disposed) {
        renderer.destroy();
        return;
      }
      engine.setOnMeasure(setMeasure);
      engine.attach();
      const st = useEditorStore.getState();
      st.initVenue(createSampleVenue());
      const ns = useEditorStore.getState();
      renderer.setCamera(ns.camera);
      renderer.syncVenue(ns.venue);
      renderer.setSelection(ns.selection, ns.venue);
      setReady(true);
    });

    const unsub = useEditorStore.subscribe((state, prev) => {
      const r = rendererRef.current;
      if (!r) return;
      if (state.venue !== prev.venue) {
        r.syncVenue(state.venue);
        r.setSelection(state.selection, state.venue);
      } else if (state.selection !== prev.selection) {
        r.setSelection(state.selection, state.venue);
      }
      if (state.camera !== prev.camera) {
        r.setCamera(state.camera);
      }
    });

    return () => {
      disposed = true;
      unsub();
      engine.detach();
      renderer.destroy();
      rendererRef.current = null;
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready && tool !== "wall") engineRef.current?.cancelTool();
  }, [tool, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      const s = useEditorStore.getState();
      const k = e.key.toLowerCase();

      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && k === "c") {
        e.preventDefault();
        s.copySelection();
        return;
      }
      if (mod && k === "v") {
        e.preventDefault();
        s.paste();
        return;
      }
      if (mod && k === "d") {
        e.preventDefault();
        s.duplicateSelection();
        return;
      }
      if (mod && k === "a") {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (typing) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.deleteSelection();
        return;
      }
      if (e.key === "Escape") {
        engineRef.current?.cancelTool();
        s.clearSelection();
        return;
      }
      if (e.key === "f") {
        zoomToFit();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const base = e.shiftKey ? 1 : 0.2;
        const g = s.venue.snapToGrid ? s.venue.gridSize : base;
        const step = e.shiftKey ? Math.max(g, 1) : g;
        if (e.key === "ArrowLeft") s.nudge(-step, 0);
        if (e.key === "ArrowRight") s.nudge(step, 0);
        if (e.key === "ArrowUp") s.nudge(0, -step);
        if (e.key === "ArrowDown") s.nudge(0, step);
        return;
      }
      const mapped = TOOL_KEYS[k];
      if (mapped) {
        s.setTool(mapped);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const zoomBy = (factor: number) => {
    const r = rendererRef.current;
    if (!r) return;
    const center = { x: r.app.screen.width / 2, y: r.app.screen.height / 2 };
    const next = zoomToward(r.camera, center, factor);
    useEditorStore.getState().setCamera(next);
    r.setCamera(next);
  };

  const zoomToFit = () => {
    const r = rendererRef.current;
    if (!r) return;
    r.fitToContent(useEditorStore.getState().venue);
    useEditorStore.getState().setCamera(r.camera);
  };

  const resetView = () => {
    const r = rendererRef.current;
    if (!r) return;
    const next = { x: 0, y: 0, scale: 80 };
    useEditorStore.getState().setCamera(next);
    r.setCamera(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-venue-object");
    const r = rendererRef.current;
    if (!type || !r) return;
    const world = r.pointerToWorld(e.clientX, e.clientY);
    const id = useEditorStore.getState().addObjectAt(type as any, world);
    void id;
    useEditorStore.getState().setTool("select");
  };

  return (
    <div className="editor-root flex flex-col h-full w-full bg-editor-bg text-editor-text">
      <TopControls />
      <div className="flex flex-1 min-h-0">
        <Toolbar />
        <ObjectLibrary />
        <div
          ref={containerRef}
          className="relative flex-1 min-w-0 overflow-hidden bg-editor-bg"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={onDrop}
        >
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-editor-muted text-sm">
              Initializing renderer…
            </div>
          )}
          <ZoomControls
            scale={camera.scale}
            onZoomIn={() => zoomBy(1.2)}
            onZoomOut={() => zoomBy(1 / 1.2)}
            onFit={zoomToFit}
            onReset={resetView}
          />
          <StatusBar measure={measure} />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
