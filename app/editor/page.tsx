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
    const fabricModule = (window as any).fabric;
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
