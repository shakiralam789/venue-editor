"use client";
import React from "react";
import { Icon } from "@/ui/icons";

export const ZoomControls: React.FC<{
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}> = ({ scale, onZoomIn, onZoomOut, onFit, onReset }) => {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-editor-panel/90 backdrop-blur border border-editor-border rounded-lg px-1 py-1 no-select shadow-lg">
      <button onClick={onZoomOut} className="w-8 h-8 rounded hover:bg-editor-panel2 flex items-center justify-center text-editor-text" title="Zoom out (-)">
        <Icon name="minus" size={16} />
      </button>
      <button
        onClick={onReset}
        className="h-8 px-2 rounded hover:bg-editor-panel2 text-editor-text text-xs font-medium w-16 text-center"
        title="Reset zoom"
      >
        {Math.round(scale * 100)}%
      </button>
      <button onClick={onZoomIn} className="w-8 h-8 rounded hover:bg-editor-panel2 flex items-center justify-center text-editor-text" title="Zoom in (+)">
        <Icon name="plus" size={16} />
      </button>
      <div className="w-px h-6 bg-editor-border mx-1" />
      <button onClick={onFit} className="w-8 h-8 rounded hover:bg-editor-panel2 flex items-center justify-center text-editor-text" title="Fit to content (F)">
        <Icon name="fit" size={16} />
      </button>
    </div>
  );
};
