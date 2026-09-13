'use client';

import Image from 'next/image';
import { useState } from 'react';

const sizes = [
  { name: 'Instagram Post', w: 1080, h: 1080 },
  { name: 'Instagram Story', w: 1080, h: 1920 },
  { name: 'Facebook Post', w: 1200, h: 630 },
  { name: 'YouTube Thumbnail', w: 1280, h: 720 },
  { name: 'A4', w: 2480, h: 3508 },
  { name: 'Business Card', w: 1125, h: 675 },
];

export default function CreatePage() {
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [unit, setUnit] = useState('px');

  const unitToPx: Record<string, number> = {
    px: 1,
    in: 96,
    cm: 37.7952755906,
    mm: 3.77952755906,
  };

  const goCustom = () => {
    const wPx = Math.round(parseFloat(customW) * unitToPx[unit]);
    const hPx = Math.round(parseFloat(customH) * unitToPx[unit]);
    if (wPx > 0 && hPx > 0) {
      window.location.href = '/editor?w=' + wPx + '&h=' + hPx;
    }
  };

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center mb-10">
        <Image src="/logo.png" alt="Magical Touch" width={180} height={36} />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Choose a size</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mb-10">
        {sizes.map((size) => (
          <a
            key={size.name}
            href={'/editor?w=' + size.w + '&h=' + size.h}
            className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition text-left"
          >
            <p className="font-semibold text-gray-800">{size.name}</p>
            <p className="text-sm text-gray-500">{size.w} x {size.h} px</p>
          </a>
        ))}
      </div>

      <div className="border border-gray-200 rounded-xl p-5 max-w-md">
        <p className="font-semibold text-gray-800 mb-3">Custom Size</p>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            placeholder="Width"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-24"
          />
          <span className="self-center text-gray-400">x</span>
          <input
            type="number"
            placeholder="Height"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-24"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
          >
            <option value="px">px</option>
            <option value="in">inch</option>
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>
        </div>
        <button
          onClick={goCustom}
          className="bg-brand-gradient text-white font-semibold px-5 py-2 rounded-full"
        >
          Create
        </button>
      </div>
    </main>
  );
}
