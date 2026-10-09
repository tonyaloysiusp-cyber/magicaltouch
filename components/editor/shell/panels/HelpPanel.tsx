'use client';

import { useMemo, useState } from 'react';
import { Keyboard, ChevronDown } from 'lucide-react';
import { SearchField } from '../ui';

export const HELP_ARTICLES: { title: string; tags: string; body: string }[] = [
  { title: 'Make a design in 5 minutes', tags: 'start beginner quick template', body: 'Open Templates, pick one you like, tap a photo to replace it, double-click any text to change the words, then use Export to download. Everything on the page can be changed.' },
  { title: 'Replace a photo', tags: 'image picture swap replace frame', body: 'Select the photo and choose Replace in the toolbar above the page — or drag a new photo from your computer or the Uploads panel straight onto it. The size, position, shape, crop and effects stay the same.' },
  { title: 'Crop a photo', tags: 'crop trim ratio reposition straighten', body: 'Select the photo and choose Crop (or double-click it). Drag the photo to reposition it, use the corners to zoom, or pick a ratio like 1:1, 4:5, 16:9 or 9:16. Choose Done to keep it, Cancel to undo. The full photo is always kept, so you can re-crop later.' },
  { title: 'Put a photo in a shape (clipping mask)', tags: 'mask clip frame circle heart star shape', body: 'Add a frame from Elements and drop a photo into it. Or select a photo and choose Mask to pick a shape. You can also select a photo and a shape together and choose “Place photo in shape”. Double-click the result to move or zoom the photo inside.' },
  { title: 'Remove a background', tags: 'background remove cutout transparent erase restore', body: 'Select a photo and choose Remove background. The subject is found automatically on your device (nothing is uploaded). Fine-tune the edge, then use Restore or Erase to paint any spots the automatic pass missed, and Apply. Undo brings the original back.' },
  { title: 'Adjust and filter a photo', tags: 'adjust filter brightness contrast exposure temperature tint highlights shadows sharpen blur vignette enhance', body: 'Select a photo and choose Adjust. Pick a ready-made look or move the sliders. Enhance makes gentle automatic fixes. Adjustments never change the original photo, so you can reset them any time.' },
  { title: 'Gradient colours', tags: 'gradient colour fill text shape background', body: 'Open any colour button (text colour, shape fill or background) and switch to Gradient. Choose linear or radial, drag the angle, click the bar to add colour stops and drag them to move.' },
  { title: 'Curved, wavy and glowing text', tags: 'text effect curve arc wave glow neon outline shadow highlight', body: 'Select text and choose Effects. Pick a style (shadow, glow, neon, outline, hollow, highlight, echo) and use Curve or Wave to bend the line. The text stays editable.' },
  { title: 'Draw with brush, marker or pencil', tags: 'draw brush marker highlighter pencil eraser apple pencil stylus pressure', body: 'Open Draw, pick a tool and draw on the page. With Apple Pencil or a stylus, pressing harder makes thicker lines. The eraser removes parts of drawn strokes only.' },
  { title: 'Pen tool and editing points', tags: 'pen vector path bezier node anchor point curve', body: 'Switch to Pro mode and choose Pen. Click to add corner points, click and drag for curves, click the first point to close the shape, or press Enter to finish. Choose Edit points (A) to move points and handles; click a pink square to add a point; select a point and press Delete to remove it.' },
  { title: 'Align and space objects', tags: 'align center distribute spacing position', body: 'Select one or more objects and choose Position. Align to the page, or select several and align them to each other. With three or more selected you can space them evenly.' },
  { title: 'Layers', tags: 'layers order front back hide lock rename', body: 'Open Layers to see everything on the page from front to back. Drag to reorder, click the eye to hide, the lock to lock, and double-click a name to rename. Right-click an object on the page for the same options.' },
  { title: 'Group and ungroup', tags: 'group ungroup combine', body: 'Select several objects (Shift-click or drag a box around them) and press Ctrl/Cmd+G, or choose Group. Press Ctrl/Cmd+Shift+G to ungroup.' },
  { title: 'Pages', tags: 'pages multi page add duplicate delete reorder magazine brochure', body: 'Use the page strip at the bottom to add, duplicate, delete and reorder pages. PDF export puts every page into one file.' },
  { title: 'Resize your design', tags: 'resize format instagram story a4 flyer magic', body: 'Choose Resize at the top. Pick a new size and either change this design or make a resized copy. Content is re-arranged to fit — it is never stretched.' },
  { title: 'Brand kit', tags: 'brand colours fonts logo business', body: 'Save your colours, fonts, logo and business details in Brand. Then use “Apply brand to this page” on any template.' },
  { title: 'Export and download', tags: 'export download png jpg webp pdf print bleed crop marks transparent', body: 'Choose Export. Pick PNG, JPG, WebP or PDF and the resolution. For print, include bleed and crop marks. PNG can have a transparent background.' },
  { title: 'Print setup: bleed, safe area, margins', tags: 'print bleed safe area margin trim columns guides', body: 'In Pro mode open Pages → Print setup to set bleed, safe area, margins and columns. They show as guides on the page and are used when exporting for print.' },
  { title: 'Rulers, guides and snapping', tags: 'ruler guide snap grid smart guides', body: 'In Pro mode, drag from a ruler to create a guide; double-click a guide to remove it. Objects snap to other objects, the page, guides and the grid — turn each on or off in the View menu. Hold Ctrl/Cmd while dragging to move freely.' },
  { title: 'Units', tags: 'units px mm cm inch pt', body: 'Choose px, mm, cm, in or pt from the Units menu. Sizes are converted exactly (1 in = 25.4 mm = 72 pt = 96 px); your design itself never changes.' },
  { title: 'Saving', tags: 'save autosave offline unsaved version history', body: 'Designs in your account save automatically a few seconds after each change; the status shows Saving…, Saved or Offline. If you lose connection your changes are kept and saved when you’re back online. File → Version History lets you go back to earlier saves.' },
  { title: 'Undo and redo', tags: 'undo redo history mistake', body: 'Press Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z to redo. Every change — moving, colours, cropping, filters, drawing, masks, layers — can be undone.' },
  { title: 'Simple and Pro mode', tags: 'simple pro mode beginner advanced', body: 'Simple mode shows the essentials. Pro mode adds the pen and point tools, rulers, the menu bar, layers, precise sizes and print settings. Switch any time at the top.' },
];

const SHORTCUTS: [string, string][] = [
  ['Undo / redo', 'Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z'],
  ['Copy / cut / paste', 'Ctrl/Cmd+C · X · V'],
  ['Duplicate', 'Ctrl/Cmd+D'],
  ['Delete', 'Delete'],
  ['Group / ungroup', 'Ctrl/Cmd+G · Ctrl/Cmd+Shift+G'],
  ['Select all', 'Ctrl/Cmd+A'],
  ['Move 1 px / 10 px', 'Arrow keys · Shift+Arrow'],
  ['Bring forward / to front', 'Ctrl/Cmd+] · Ctrl/Cmd+Shift+]'],
  ['Send backward / to back', 'Ctrl/Cmd+[ · Ctrl/Cmd+Shift+['],
  ['Lock / hide', 'Ctrl/Cmd+L · Ctrl/Cmd+H'],
  ['Zoom in / out', 'Ctrl/Cmd+= · Ctrl/Cmd+-'],
  ['Fit page / 100%', 'Ctrl/Cmd+0 · Ctrl/Cmd+1'],
  ['Pan', 'Hold Space and drag'],
  ['Text', 'T'],
  ['Select / edit points / pen', 'V · A · P'],
  ['Rectangle / ellipse / line', 'M · L · \\'],
  ['Deselect / cancel', 'Esc'],
  ['All shortcuts', '?'],
];

export function HelpPanel({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(HELP_ARTICLES[0].title);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return HELP_ARTICLES;
    return HELP_ARTICLES.filter((a) => `${a.title} ${a.tags} ${a.body}`.toLowerCase().includes(n));
  }, [q]);
  return (
    <div>
      <SearchField value={q} onChange={setQ} placeholder="Search help (e.g. crop, mask, pen)" />
      <div className="mt-3 flex flex-col gap-1.5">
        {list.map((a) => (
          <div key={a.title} className="rounded-xl border border-mt-border">
            <button type="button" onClick={() => setOpen(open === a.title ? null : a.title)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-mt-ink" aria-expanded={open === a.title}>
              {a.title}
              <ChevronDown size={15} className={`shrink-0 transition-transform ${open === a.title ? 'rotate-180' : ''}`} />
            </button>
            {open === a.title && <p className="px-3 pb-3 text-[13px] leading-relaxed text-mt-muted">{a.body}</p>}
          </div>
        ))}
        {!list.length && <p className="text-sm text-mt-muted">No help found for “{q}”.</p>}
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-mt-ink">Keyboard shortcuts</h3>
          <button type="button" onClick={onOpenShortcuts} className="inline-flex items-center gap-1 text-xs text-mt-accent hover:underline">
            <Keyboard size={12} /> All
          </button>
        </div>
        <dl className="text-xs divide-y divide-mt-border border-y border-mt-border">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1.5">
              <dt className="text-mt-muted">{k}</dt>
              <dd className="text-mt-ink text-right font-mono text-[11px]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
