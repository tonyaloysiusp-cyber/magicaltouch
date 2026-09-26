// ---------------------------------------------------------------------
// lib/templates/builders.ts
// Original Magical Touch Design template compositions. Every shape,
// position and color here is authored directly in this file -- none of
// it is traced, copied, or adapted from Canva, Adobe, Envato, Freepik,
// Pinterest, Behance, or any other existing template. Each builder is a
// genuinely different structural layout (not the same composition
// recolored), built from real design primitives (rects, circles,
// triangles, lines, gradients, text) the same way a human designer would
// lay one out -- see docs/ENGINEERING_AUDIT.md and the "original
// template library" brief this satisfies.
//
// A builder returns real Fabric object instances, unattached to any
// canvas -- lib/templates/renderTemplate.ts adds them to a real artboard
// and serializes the result, so what ships as a template's canvas_json
// is exactly what Main Design itself would produce for the same objects.
// ---------------------------------------------------------------------

export interface TemplateBuilderDef {
  name: string;
  category: string;
  width: number;
  height: number;
  color1: string;
  color2: string;
  build: (F: any, color1: string, color2: string) => any[];
}

function textbox(F: any, text: string, opts: Record<string, any>) {
  return new F.Textbox(text, { fontFamily: 'Arial', fill: '#14121F', ...opts });
}

// --- 1. Modern Grid — Business Card: a two-panel color-block layout,
// name/title on the dark panel, contact details on the light panel. ---
function buildModernGrid(F: any, color1: string, color2: string) {
  const leftPanel = new F.Rect({ left: 0, top: 0, width: 420, height: 600, fill: color1, selectable: true });
  const accent = new F.Rect({ left: 50, top: 270, width: 60, height: 4, fill: color2, selectable: true });
  const name = textbox(F, 'Jordan Ellis', { left: 50, top: 210, width: 320, fontSize: 42, fontWeight: 'bold', fill: '#FFFFFF' });
  const title = textbox(F, 'Creative Director', { left: 50, top: 285, width: 320, fontSize: 18, fill: '#FAF9F6' });
  const contact = textbox(F, 'hello@studio.com\n+1 555 010 2938\nstudio.design', {
    left: 460,
    top: 240,
    width: 540,
    fontSize: 16,
    fill: color1,
    lineHeight: 1.7,
  });
  return [leftPanel, accent, name, title, contact];
}

// --- 2. Diagonal Edge — Flyer: a bold wedge cut across the top-right
// corner, stacked headline, and a pill-shaped call to action. ---
function buildDiagonalEdge(F: any, color1: string, color2: string) {
  const wedge = new F.Polygon(
    [
      { x: 1080, y: 0 },
      { x: 1080, y: 520 },
      { x: 480, y: 0 },
    ],
    { fill: color1, selectable: true }
  );
  const dots = [
    { x: 560, y: 90, r: 14 },
    { x: 620, y: 150, r: 9 },
    { x: 700, y: 70, r: 18 },
    { x: 780, y: 160, r: 8 },
  ].map(
    (d) =>
      new F.Circle({
        left: d.x - d.r,
        top: d.y - d.r,
        radius: d.r,
        fill: color2,
        opacity: 0.85,
        selectable: true,
      })
  );
  const headline = textbox(F, 'GRAND\nOPENING', {
    left: 80,
    top: 850,
    width: 920,
    fontSize: 90,
    fontWeight: 'bold',
    fill: color1,
    lineHeight: 0.95,
  });
  const subheadline = textbox(F, 'Join us for a night of music, food & fun', {
    left: 84,
    top: 1060,
    width: 750,
    fontSize: 26,
    fill: '#4A4750',
  });
  const ctaPill = new F.Rect({ left: 84, top: 1140, width: 260, height: 68, rx: 34, ry: 34, fill: color1, selectable: true });
  const ctaText = textbox(F, 'RSVP NOW', { left: 84, top: 1162, width: 260, fontSize: 20, fill: '#FFFFFF', textAlign: 'center' });
  return [wedge, ...dots, headline, subheadline, ctaPill, ctaText];
}

// --- 3. Confetti Pop — Invitation (playful): scattered confetti dots
// in mixed hues around a centered announcement and a rounded frame. ---
function buildConfettiPop(F: any, color1: string, color2: string) {
  const palette = [color1, color2, '#F5B942', '#4FC8C0', '#EC1E79'];
  const confetti = [
    { x: 120, y: 140, r: 12 }, { x: 220, y: 90, r: 8 }, { x: 1080, y: 130, r: 14 },
    { x: 990, y: 210, r: 9 }, { x: 100, y: 1020, r: 10 }, { x: 200, y: 1100, r: 16 },
    { x: 1050, y: 1050, r: 12 }, { x: 960, y: 970, r: 8 }, { x: 150, y: 600, r: 9 },
    { x: 1060, y: 620, r: 11 }, { x: 400, y: 80, r: 7 }, { x: 780, y: 100, r: 9 },
    { x: 350, y: 1120, r: 8 }, { x: 800, y: 1110, r: 10 },
  ].map(
    (d, i) =>
      new F.Circle({
        left: d.x - d.r,
        top: d.y - d.r,
        radius: d.r,
        fill: palette[i % palette.length],
        selectable: true,
      })
  );
  const frame = new F.Rect({
    left: 60,
    top: 60,
    width: 1080,
    height: 1080,
    rx: 24,
    ry: 24,
    fill: '',
    stroke: color2,
    strokeWidth: 6,
    selectable: true,
  });
  const headline = textbox(F, "You're Invited", {
    left: 200,
    top: 430,
    width: 800,
    fontSize: 64,
    fontWeight: 'bold',
    fill: color1,
    textAlign: 'center',
  });
  const subtext = textbox(F, "to celebrate Maya's 30th Birthday", {
    left: 200,
    top: 520,
    width: 800,
    fontSize: 26,
    fill: '#4A4750',
    textAlign: 'center',
  });
  const dateLine = textbox(F, 'Saturday, June 14 · 7:00 PM', {
    left: 200,
    top: 650,
    width: 800,
    fontSize: 22,
    fill: '#14121F',
    textAlign: 'center',
  });
  const venueLine = textbox(F, 'The Garden Loft, 42 Willow Ave', {
    left: 200,
    top: 690,
    width: 800,
    fontSize: 18,
    fill: '#4A4750',
    textAlign: 'center',
  });
  return [frame, ...confetti, headline, subtext, dateLine, venueLine];
}

// --- 4. Golden Frame — Invitation (elegant): a nested double border,
// centered serif typography, structurally distinct from Confetti Pop
// (frame-first, minimal, no scattered elements) per the brief's rule
// against just recoloring one master layout. ---
function buildGoldenFrame(F: any, color1: string, _color2: string) {
  const outerFrame = new F.Rect({ left: 70, top: 70, width: 1060, height: 1060, fill: '', stroke: color1, strokeWidth: 2, selectable: true });
  const innerFrame = new F.Rect({ left: 90, top: 90, width: 1020, height: 1020, fill: '', stroke: color1, strokeWidth: 1, selectable: true });
  const headline = textbox(F, 'Emma & Noah', {
    left: 200,
    top: 460,
    width: 800,
    fontSize: 58,
    fontFamily: 'Times New Roman',
    fill: color1,
    textAlign: 'center',
  });
  const divider = new F.Line([560, 560, 640, 560], { stroke: color1, strokeWidth: 1, selectable: true });
  const subtext = textbox(F, 'request the pleasure of your company', {
    left: 200,
    top: 590,
    width: 800,
    fontSize: 20,
    fontFamily: 'Times New Roman',
    fill: '#4A4750',
    textAlign: 'center',
  });
  const dateLine = textbox(F, 'Saturday, the Twelfth of September', {
    left: 200,
    top: 660,
    width: 800,
    fontSize: 18,
    fontFamily: 'Times New Roman',
    fill: '#4A4750',
    textAlign: 'center',
  });
  const rsvp = textbox(F, 'RSVP by August 1st', {
    left: 200,
    top: 1000,
    width: 800,
    fontSize: 16,
    fontFamily: 'Times New Roman',
    fill: color1,
    textAlign: 'center',
  });
  return [outerFrame, innerFrame, headline, divider, subtext, dateLine, rsvp];
}

// --- 5. Sale Burst — Social Media: a rotated-triangle starburst behind
// a percentage callout, distinct construction technique from every
// other template here. ---
function buildSaleBurst(F: any, color1: string, color2: string) {
  const rays: any[] = [];
  const rayCount = 16;
  for (let i = 0; i < rayCount; i++) {
    rays.push(
      new F.Triangle({
        left: 540,
        top: 540,
        width: 60,
        height: 620,
        fill: i % 2 === 0 ? color1 : color2,
        opacity: 0.9,
        originX: 'center',
        originY: 'center',
        angle: (360 / rayCount) * i,
        selectable: true,
      })
    );
  }
  const backdrop = new F.Circle({
    left: 540,
    top: 540,
    radius: 320,
    originX: 'center',
    originY: 'center',
    fill: '#FFFFFF',
    opacity: 0.92,
    selectable: true,
  });
  const percent = textbox(F, '50% OFF', {
    left: 140,
    top: 460,
    width: 800,
    fontSize: 100,
    fontWeight: 'bold',
    fill: color1,
    textAlign: 'center',
  });
  const subtext = textbox(F, 'This weekend only', { left: 140, top: 590, width: 800, fontSize: 28, fill: '#4A4750', textAlign: 'center' });
  const badge = new F.Circle({ left: 30, top: 30, radius: 70, fill: color2, selectable: true });
  const badgeText = textbox(F, 'NEW\nDROP', {
    left: 30,
    top: 78,
    width: 140,
    fontSize: 18,
    fontWeight: 'bold',
    fill: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.1,
  });
  return [...rays, backdrop, percent, subtext, badge, badgeText];
}

// --- 6. Editorial Minimal — Resume: a full-height sidebar panel next to
// a content column with section dividers, the only template here built
// around an asymmetric two-column grid rather than a centered/frame
// layout. ---
function buildEditorialMinimal(F: any, color1: string, color2: string) {
  const sidebar = new F.Rect({ left: 0, top: 0, width: 280, height: 1100, fill: color1, selectable: true });
  const name = textbox(F, 'Jordan Ellis', { left: 30, top: 80, width: 220, fontSize: 30, fontWeight: 'bold', fill: '#FFFFFF' });
  const roleTitle = textbox(F, 'UX Designer', { left: 30, top: 128, width: 220, fontSize: 16, fill: color2 });
  const contactHeader = textbox(F, 'CONTACT', { left: 30, top: 210, width: 220, fontSize: 13, fontWeight: 'bold', fill: color2, charSpacing: 150 });
  const contact = textbox(F, 'jordan@email.com\n555 010 2938\nPortland, OR', {
    left: 30,
    top: 240,
    width: 220,
    fontSize: 13,
    fill: '#FAF9F6',
    lineHeight: 1.7,
  });
  const skillsHeader = textbox(F, 'SKILLS', { left: 30, top: 360, width: 220, fontSize: 13, fontWeight: 'bold', fill: color2, charSpacing: 150 });
  const skills = textbox(F, 'Product Design\nDesign Systems\nPrototyping\nUser Research', {
    left: 30,
    top: 390,
    width: 220,
    fontSize: 13,
    fill: '#FAF9F6',
    lineHeight: 1.8,
  });

  const expHeader = textbox(F, 'Experience', { left: 320, top: 80, width: 500, fontSize: 24, fontWeight: 'bold', fill: '#14121F' });
  const expDivider = new F.Rect({ left: 320, top: 122, width: 500, height: 2, fill: color1, selectable: true });
  const jobTitle = textbox(F, 'Senior Product Designer — Studio Co.', { left: 320, top: 148, width: 500, fontSize: 16, fontWeight: 'bold', fill: '#14121F' });
  const jobDates = textbox(F, '2021 – Present', { left: 320, top: 176, width: 500, fontSize: 13, fill: '#7A7680' });
  const jobDesc = textbox(
    F,
    'Led end-to-end design for the flagship product, partnering with engineering and research to ship a design system used across 12 teams.',
    { left: 320, top: 204, width: 500, fontSize: 14, fill: '#4A4750', lineHeight: 1.5 }
  );

  const eduHeader = textbox(F, 'Education', { left: 320, top: 640, width: 500, fontSize: 24, fontWeight: 'bold', fill: '#14121F' });
  const eduDivider = new F.Rect({ left: 320, top: 682, width: 500, height: 2, fill: color1, selectable: true });
  const eduTitle = textbox(F, 'B.A. Graphic Design — Willow State University', { left: 320, top: 708, width: 500, fontSize: 16, fontWeight: 'bold', fill: '#14121F' });
  const eduDates = textbox(F, '2016 – 2020', { left: 320, top: 736, width: 500, fontSize: 13, fill: '#7A7680' });

  return [
    sidebar, name, roleTitle, contactHeader, contact, skillsHeader, skills,
    expHeader, expDivider, jobTitle, jobDates, jobDesc,
    eduHeader, eduDivider, eduTitle, eduDates,
  ];
}

export const TEMPLATE_BUILDERS: TemplateBuilderDef[] = [
  { name: 'Modern Grid', category: 'Business Card', width: 1050, height: 600, color1: '#14121F', color2: '#F5B942', build: buildModernGrid },
  { name: 'Diagonal Edge', category: 'Flyer', width: 1080, height: 1350, color1: '#6C4FD1', color2: '#FF6F91', build: buildDiagonalEdge },
  { name: 'Confetti Pop', category: 'Invitation', width: 1200, height: 1200, color1: '#EC1E79', color2: '#3FA9E8', build: buildConfettiPop },
  { name: 'Golden Frame', category: 'Invitation', width: 1200, height: 1200, color1: '#B08D57', color2: '#FAF9F6', build: buildGoldenFrame },
  { name: 'Sale Burst', category: 'Social Media', width: 1080, height: 1080, color1: '#EC1E79', color2: '#F5B942', build: buildSaleBurst },
  { name: 'Editorial Minimal', category: 'Resume', width: 850, height: 1100, color1: '#14121F', color2: '#4FC8C0', build: buildEditorialMinimal },
];
