'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

function EditorContent() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [zoom, setZoom] = useState(50);
  const [layers, setLayers] = useState<any[]>([]);

  const width = parseInt(searchParams.get('w') || '1080');
  const height = parseInt(searchParams.get('h') || '1080');
  const bleed = parseInt(searchParams.get('bleed') || '0');

  useEffect(() => {
    let fabricModule: any;
    import('fabric').then((mod) => {
      fabricModule = mod.fabric;
      const canvas = new fabricModule.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      fabricCanvasRef.current = canvas;

      canvas.on('object:added', updateLayers);
      canvas.on('object:removed', updateLayers);
      canvas.on('object:modified', updateLayers);

      function updateLayers() {
        setLayers([...canvas.getObjects()].reverse());
      }
    });

    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, [width, height]);

  const scale = zoom / 100;

  const addText = () => {
    import('fabric').then((mod) => {
      const text = new mod.fabric.IText('Double-click to edit', {
        left: width / 2 - 100,
        top: height / 2 - 20,
        fontSize: 40,
        fill: '#1A1A1A',
      });
      fabricCanvasRef.current?.add(text);
      fabricCanvasRef.current?.setActiveObject(text);
    });
  };

  const addRect = () => {
    import('fabric').then((mod) => {
      const rect = new mod.fabric.Rect({
        left: width / 2 - 75,
        top: height / 2 - 75,
        width: 150,
        height: 150,
        fill: '#3FA9E8',
      });
      fabricCanvasRef.current?.add(rect);
      fabricCanvasRef.current?.setActiveObject(rect);
    });
  };

  const addCircle = () => {
    import('fabric').then((mod) => {
      const circle = new mod.fabric.Circle({
        left: width / 2 - 75,
        top: height / 2 - 75,
        radius: 75,
        fill: '#7ED33E',
      });
      fabricCanvasRef.current?.add(circle);
      fabricCanvasRef.current?.setActiveObject(circle);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      import('fabric').then((mod) => {
        mod.fabric.Image.fromURL(event.target?.result as string, (img: any) => {
          img.scaleToWidth(300);
          fabricCanvasRef.current?.add(img);
          fabricCanvasRef.current?.setActiveObject(img);
        });
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active) fabricCanvasRef.current?.remove(active);
  };

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <Image src="/logo.png" alt="Magical Touch" width={130} height={26} />
        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="px-2 py-1 border rounded">−</button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="px-2 py-1 border rounded">+</button>
        </div>
        <button className="bg-brand-gradient text-white px-4 py-2 rounded-full text-sm font-semibold">
          Save
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-4 text-xs">
          <button className="flex flex-col items-center gap-1 text-gray-700">
            <span>🖱️</span>Select
          </button>
          <button onClick={addText} className="flex flex-col items-center gap-1 text-gray-700">
            <span>T</span>Text
          </button>
          <button onClick={addRect} className="flex flex-col items-center gap-1 text-gray-700">
            <span>▭</span>Shapes
          </button>
          <button onClick={addCircle} className="flex flex-col items-center gap-1 text-gray-400">
            <span>◯</span>Circle
          </button>
          <label className="flex flex-col items-center gap-1 text-gray-700 cursor-pointer">
            <span>⬆️</span>Upload
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <button className="flex flex-col items-center gap-1 text-gray-300">
            <span>✏️</span>Draw
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-300">
            <span>🎨</span>Brand Kit
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-300">
            <span>✨</span>AI
          </button>
          <button onClick={deleteSelected} className="flex flex-col items-center gap-1 text-red-400 mt-auto">
            <span>🗑️</span>Delete
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              boxShadow: '0 0 0 1px #e5e7eb',
              position: 'relative',
            }}
          >
            <canvas ref={canvasRef} />
            {bleed > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: bleed,
                  left: bleed,
                  right: bleed,
                  bottom: bleed,
                  border: '1px dashed #EC1E79',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        <div className="w-56 bg-white border-l p-3">
          <p className="font-semibold text-gray-700 mb-3 text-sm">Layers</p>
          <div className="flex flex-col gap-2">
            {layers.length === 0 && (
              <p className="text-xs text-gray-400">No objects yet</p>
            )}
            {layers.map((obj, i) => (
              <div
                key={i}
                onClick={() => fabricCanvasRef.current?.setActiveObject(obj)}
                className="text-xs p-2 border rounded cursor-pointer hover:bg-gray-50"
              >
                {obj.type} {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
