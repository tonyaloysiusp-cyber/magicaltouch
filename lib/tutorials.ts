// Tutorial levels: Beginner → Intermediate → Pro. Each lesson teaches one
// part of the software and ends with a small task. Finish every task in a
// level, submit one design you made, and an admin approves it — then a
// verified certificate is issued for that level.

export type LevelId = 'beginner' | 'intermediate' | 'pro';

export interface Lesson {
  id: string;
  title: string;
  tool: string;
  minutes: number;
  intro: string;
  steps: string[];
  task: string;
  tryHref: string;
  tryLabel: string;
}

export interface Level {
  id: LevelId;
  name: string;
  badge: string;
  summary: string;
  certificateTitle: string;
  finalTask: string;
  lessons: Lesson[];
}

export const LEVELS: Level[] = [
  {
    id: 'beginner',
    name: 'Level 1 · Beginner',
    badge: 'Beginner Designer',
    summary: 'Open a template, make it yours and download it. No experience needed.',
    certificateTitle: 'Beginner Designer — Magical Touch Design Tutorials',
    finalTask: 'Design a social media post or flyer for a real or made-up business, using a template, your own text and one of your own photos.',
    lessons: [
      { id: 'b1', title: 'Open a template and change the words', tool: 'Templates & text', minutes: 5, intro: 'Every design starts faster from a template. You will open one and replace its text.', steps: ['Go to Templates and search for something you need, like “flyer”.', 'Click a template, then “Use this template”.', 'Double-click any text on the page to type your own words.', 'Press Esc or click an empty area when you are done.'], task: 'Open any template and change the headline to your own name or business.', tryHref: '/templates', tryLabel: 'Browse templates' },
      { id: 'b2', title: 'Colours and fonts', tool: 'Text toolbar & colour picker', minutes: 6, intro: 'Colour and type set the mood of a design.', steps: ['Click a text box once to select it.', 'Use the font menu at the top to try a different font.', 'Click the colour button and pick a new colour, or type a hex code.', 'Click an empty part of the page and change the Background colour.'], task: 'Change at least one font and two colours in your design.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'b3', title: 'Replace a photo', tool: 'Upload & photo frames', minutes: 5, intro: 'Templates come with sample photos — swap them for yours.', steps: ['Open Upload on the left and upload a photo from your device.', 'Drag your photo onto a photo in the design to replace it.', 'Double-click the photo to move or zoom it inside its frame.'], task: 'Put one of your own photos into a template.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'b4', title: 'Add shapes and elements', tool: 'Elements panel', minutes: 6, intro: 'Shapes, lines, icons and stickers add structure and personality.', steps: ['Open Elements on the left.', 'Click a shape or icon to add it, then drag it into place.', 'Use the corner handles to resize; hold Shift to keep proportions.', 'Use Position → Bring forward / Send backward to change the order.'], task: 'Add a shape behind a heading to make it stand out.', tryHref: '/create', tryLabel: 'Start a blank design' },
      { id: 'b5', title: 'Pages and sizes', tool: 'Pages & Resize', minutes: 5, intro: 'One design can have many pages and be resized for other uses.', steps: ['Open Pages to add, duplicate or delete pages.', 'Use Resize at the top to turn a post into a story or an A4 flyer.', 'Choose “Resize a copy” to keep your original.'], task: 'Make a copy of your design in a second size (for example a story).', tryHref: '/create', tryLabel: 'Start a design' },
      { id: 'b6', title: 'Download and share', tool: 'Export', minutes: 4, intro: 'Get your design out of the editor in the right format.', steps: ['Click Export at the top right.', 'Choose PNG or JPG for social media and WhatsApp, PDF for printing.', 'Pick the pages you want and click Download.'], task: 'Download your design as a PNG and as a PDF.', tryHref: '/templates', tryLabel: 'Open a design' },
    ],
  },
  {
    id: 'intermediate',
    name: 'Level 2 · Intermediate',
    badge: 'Intermediate Designer',
    summary: 'Layout, brand kits, photo editing and print-ready files.',
    certificateTitle: 'Intermediate Designer — Magical Touch Design Tutorials',
    finalTask: 'Create a matching set for one brand: an Instagram post and a printable A4 flyer, both using your brand kit colours and fonts, with an edited photo.',
    lessons: [
      { id: 'i1', title: 'Layers, alignment and spacing', tool: 'Layers & arrange', minutes: 8, intro: 'Clean layouts come from consistent alignment and spacing.', steps: ['Open Layers to see everything on the page, top to bottom.', 'Select several items (Shift-click) and use Align and Distribute.', 'Lock items you do not want to move by accident.', 'Group items that belong together.'], task: 'Align a heading, text and button to the same left edge.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'i2', title: 'Brand kit', tool: 'Brand panel', minutes: 7, intro: 'Save your logo, colours and fonts once and apply them anywhere.', steps: ['Open Brand on the left.', 'Add your logo, brand colours and heading / body fonts.', 'Start a New Design and tick “Use my brand”, or apply your colours and fonts from the Brand panel.'], task: 'Create a brand kit and apply it to a template.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'i3', title: 'Enhance and crop photos', tool: 'Photo Studio (Simple)', minutes: 8, intro: 'Fix light and colour, then crop for the right shape.', steps: ['Open Photo Studio and upload a photo.', 'Click Auto enhance, then fine-tune Brightness, Contrast and Warmth.', 'Try a one-tap Look.', 'Crop to 4:5 for Instagram or Passport size for ID photos.'], task: 'Enhance one photo and crop it to 4:5.', tryHref: '/photo-studio', tryLabel: 'Open Photo Studio' },
      { id: 'i4', title: 'Remove a background', tool: 'Background remover', minutes: 6, intro: 'Cut out a person or product and place it on a new background.', steps: ['In Photo Studio choose Background → Remove background.', 'Refine the edge with the sliders and the Restore / Erase brushes.', 'Pick a new colour, or export PNG to keep it transparent.'], task: 'Cut out a product or person and put it on a brand colour.', tryHref: '/photo-studio', tryLabel: 'Open Photo Studio' },
      { id: 'i5', title: 'Text effects', tool: 'Effects', minutes: 6, intro: 'Shadows, outlines, highlights and curved text — used with care.', steps: ['Select a heading and open Effects.', 'Try Shadow, Outline, Highlight and Curve.', 'Keep body text plain so it stays easy to read.'], task: 'Give one heading an effect that improves readability on a photo.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'i6', title: 'Print-ready PDF', tool: 'Export → PDF for print shops', minutes: 7, intro: 'Print shops need bleed, crop marks and CMYK colour.', steps: ['Extend background colours and photos to the red bleed line.', 'Keep important text inside the safe area.', 'Export → PDF for print shops (CMYK with bleed and crop marks).', 'Open the PDF and check every page before you send it.'], task: 'Export a print PDF of an A4 flyer.', tryHref: '/templates', tryLabel: 'Open an A4 template' },
    ],
  },
  {
    id: 'pro',
    name: 'Level 3 · Pro',
    badge: 'Pro Designer',
    summary: 'Pro photo editing, multi-page documents and designing from a blank page.',
    certificateTitle: 'Pro Designer — Magical Touch Design Tutorials',
    finalTask: 'Design a multi-page brochure or company profile (at least 4 pages) from a blank page, with consistent styles, at least one retouched photo and a clean print-ready export.',
    lessons: [
      { id: 'p1', title: 'Layers and blend modes', tool: 'Photo Studio (Pro)', minutes: 10, intro: 'Combine images like a pro with layers, opacity and blend modes.', steps: ['Switch Photo Studio to Pro.', 'Place a second picture as a layer (Layer → Place picture).', 'Change its blend mode (Multiply, Screen, Overlay) and opacity.', 'Duplicate layers with Ctrl+J and reorder them.'], task: 'Blend two photos into one image with a blend mode.', tryHref: '/photo-studio', tryLabel: 'Open Photo Studio' },
      { id: 'p2', title: 'Selections and lasso', tool: 'Marquee, Lasso & Select subject', minutes: 10, intro: 'Edit only part of a photo with selections.', steps: ['Use the Marquee (M) for rectangles and ellipses.', 'Use the Lasso (L): click points around an area, then click the first point or press Enter to close it.', 'Hold Shift to add to a selection, Alt to subtract, Shift+Alt to keep only the overlap.', 'Adjust or filter only the selected area, then Deselect.'], task: 'Select one area of a photo and change only its colour.', tryHref: '/photo-studio', tryLabel: 'Open Photo Studio' },
      { id: 'p3', title: 'Retouching', tool: 'Healing, dodge, burn, sharpen', minutes: 10, intro: 'Clean up blemishes and guide the eye with light.', steps: ['Use the Healing brush (J) on spots and small objects.', 'Dodge (O) to brighten and Burn to darken areas.', 'Sharpen eyes and details lightly.', 'Compare with Before to keep it natural.'], task: 'Retouch a portrait or remove an unwanted object.', tryHref: '/photo-studio', tryLabel: 'Open Photo Studio' },
      { id: 'p4', title: 'Clean up: remove unwanted content and pages', tool: 'Layers, Pages & Delete', minutes: 6, intro: 'Professional files have nothing hidden or left over.', steps: ['Open Layers and delete hidden or unused items.', 'Remove empty or duplicate pages in Pages.', 'Check that every photo is sharp enough for its size.', 'Rename the design clearly before sharing.'], task: 'Clean a design so it has no unused layers or empty pages.', tryHref: '/templates', tryLabel: 'Open a template' },
      { id: 'p5', title: 'Multi-page documents', tool: 'Pages & consistent styles', minutes: 12, intro: 'Brochures and decks need consistent spacing, type and colour across pages.', steps: ['Set a grid: same margins on every page.', 'Use the same two fonts and a limited colour palette.', 'Duplicate a finished page to keep styles consistent.', 'Export all pages to one PDF.'], task: 'Build a 4-page document with consistent styles.', tryHref: '/create', tryLabel: 'Start a design' },
      { id: 'p6', title: 'Design from a blank page', tool: 'Composition & hierarchy', minutes: 12, intro: 'Put it all together: hierarchy, contrast, alignment and white space.', steps: ['Decide the one message people must see first.', 'Make it biggest; group the details; leave breathing space.', 'Limit yourself to two fonts and three colours.', 'Check it at small size — can you still read the main message?'], task: 'Design a poster from a blank page without using a template.', tryHref: '/create', tryLabel: 'Start a blank design' },
    ],
  },
];

export const levelById = (id: LevelId) => LEVELS.find((l) => l.id === id)!;
export const nextLevel = (id: LevelId): LevelId | null => (id === 'beginner' ? 'intermediate' : id === 'intermediate' ? 'pro' : null);
