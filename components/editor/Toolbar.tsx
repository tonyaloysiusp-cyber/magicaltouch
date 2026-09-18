'use client';

import {
  MousePointer2,
  Pointer,
  Hand,
  Frame,
  PenTool as PenToolIcon,
  Type,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Minus as LineIcon,
  Hexagon as PolygonIcon,
  Star as StarIcon,
  ImagePlus,
  Copy,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Trash2,
  Combine,
  Clock,
  SquareDashedMousePointer,
  CircleDashed,
  Lasso,
  Wand2,
} from 'lucide-react';
import type { ToolMode } from '@/lib/editor/types';
import { getFeatureStatus } from '@/lib/editor/tool-registry';

interface Props {
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  onAddText: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onOpenShapeBuilder: () => void;
  onOpenRoadmap: (featureId: string, label: string) => void;
}

function ToolButton({
  id,
  label,
  icon,
  active,
  onClick,
  onPlanned,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onPlanned: (id: string, label: string) => void;
}) {
  const status = getFeatureStatus(id);
  const isLive = status !== 'planned';

  return (
    <button
      onClick={() => (isLive ? onClick() : onPlanned(id, label))}
      title={isLive ? label : `${label} — planned, not yet available`}
      className={`relative flex flex-col items-center gap-1 w-full ${
        active ? 'text-blue-600' : isLive ? 'text-gray-700' : 'text-gray-300'
      }`}
    >
      {icon}
      <span className="text-[10px] leading-none">{label}</span>
      {status === 'beta' && (
        <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-bold rounded px-1">
          β
        </span>
      )}
    </button>
  );
}

export function Toolbar({
  activeTool,
  onSelectTool,
  onAddText,
  onImageUpload,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDelete,
  onOpenShapeBuilder,
  onOpenRoadmap,
}: Props) {
  return (
    <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-4 text-xs overflow-y-auto">
      <ToolButton
        id="select"
        label="Select"
        icon={<MousePointer2 size={18} />}
        active={activeTool === 'select'}
        onClick={() => onSelectTool('select')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="direct"
        label="Direct"
        icon={<Pointer size={18} />}
        active={activeTool === 'direct'}
        onClick={() => onSelectTool('direct')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="marquee-rect"
        label="Marquee"
        icon={<SquareDashedMousePointer size={18} />}
        active={activeTool === 'marquee-rect'}
        onClick={() => onSelectTool('marquee-rect')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="marquee-ellipse"
        label="Oval Marquee"
        icon={<CircleDashed size={18} />}
        active={activeTool === 'marquee-ellipse'}
        onClick={() => onSelectTool('marquee-ellipse')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="lasso"
        label="Lasso"
        icon={<Lasso size={18} />}
        active={activeTool === 'lasso'}
        onClick={() => onSelectTool('lasso')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="magic-wand"
        label="Magic Wand"
        icon={<Wand2 size={18} />}
        active={activeTool === 'magic-wand'}
        onClick={() => onSelectTool('magic-wand')}
        onPlanned={onOpenRoadmap}
      />

      <div className="w-full h-px bg-gray-200" />

      <ToolButton
        id="pan"
        label="Hand"
        icon={<Hand size={18} />}
        active={activeTool === 'pan'}
        onClick={() => onSelectTool('pan')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="artboard"
        label="Artboard"
        icon={<Frame size={18} />}
        active={activeTool === 'artboard'}
        onClick={() => onSelectTool('artboard')}
        onPlanned={onOpenRoadmap}
      />

      <div className="w-full h-px bg-gray-200" />

      <ToolButton
        id="pen"
        label="Pen"
        icon={<PenToolIcon size={18} />}
        active={activeTool === 'pen'}
        onClick={() => onSelectTool('pen')}
        onPlanned={onOpenRoadmap}
      />
      <button onClick={onOpenShapeBuilder} className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <Combine size={18} />
        <span className="text-[10px] leading-none">Shape Builder</span>
      </button>

      <div className="w-full h-px bg-gray-200" />

      <button onClick={onAddText} className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <Type size={18} />
        <span className="text-[10px] leading-none">Text</span>
      </button>

      <ToolButton
        id="rect"
        label="Square"
        icon={<Square size={18} />}
        active={activeTool === 'rect'}
        onClick={() => onSelectTool('rect')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="ellipse"
        label="Circle"
        icon={<CircleIcon size={18} />}
        active={activeTool === 'ellipse'}
        onClick={() => onSelectTool('ellipse')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="triangle"
        label="Triangle"
        icon={<TriangleIcon size={18} />}
        active={activeTool === 'triangle'}
        onClick={() => onSelectTool('triangle')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="line"
        label="Line"
        icon={<LineIcon size={18} />}
        active={activeTool === 'line'}
        onClick={() => onSelectTool('line')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="polygon"
        label="Polygon"
        icon={<PolygonIcon size={18} />}
        active={activeTool === 'polygon'}
        onClick={() => onSelectTool('polygon')}
        onPlanned={onOpenRoadmap}
      />
      <ToolButton
        id="star"
        label="Star"
        icon={<StarIcon size={18} />}
        active={activeTool === 'star'}
        onClick={() => onSelectTool('star')}
        onPlanned={onOpenRoadmap}
      />

      <div className="w-full h-px bg-gray-200" />

      <label className="flex flex-col items-center gap-1 text-gray-700 cursor-pointer w-full">
        <ImagePlus size={18} />
        <span className="text-[10px] leading-none">Upload</span>
        <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
      </label>

      <div className="w-full h-px bg-gray-200" />

      <button onClick={onDuplicate} title="Duplicate (Ctrl/Cmd+D)" className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <Copy size={18} />
        <span className="text-[10px] leading-none">Duplicate</span>
      </button>
      <button onClick={onBringForward} title="Bring Forward (Ctrl/Cmd+])" className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <ArrowUp size={18} />
        <span className="text-[10px] leading-none">Fwd</span>
      </button>
      <button onClick={onSendBackward} title="Send Backward (Ctrl/Cmd+[)" className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <ArrowDown size={18} />
        <span className="text-[10px] leading-none">Back</span>
      </button>
      <button onClick={onBringToFront} title="Bring to Front (Ctrl/Cmd+Shift+])" className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <ArrowUpToLine size={18} />
        <span className="text-[10px] leading-none">Front</span>
      </button>
      <button onClick={onSendToBack} title="Send to Back (Ctrl/Cmd+Shift+[)" className="flex flex-col items-center gap-1 text-gray-700 w-full">
        <ArrowDownToLine size={18} />
        <span className="text-[10px] leading-none">Rear</span>
      </button>

      <button onClick={onDelete} className="flex flex-col items-center gap-1 text-red-400 w-full">
        <Trash2 size={18} />
        <span className="text-[10px] leading-none">Delete</span>
      </button>

      <button
        onClick={() => onOpenRoadmap('roadmap', 'Roadmap')}
        title="See what's planned"
        className="flex flex-col items-center gap-1 text-gray-400 mt-auto w-full"
      >
        <Clock size={18} />
        <span className="text-[10px] leading-none">Roadmap</span>
      </button>
    </div>
  );
}
