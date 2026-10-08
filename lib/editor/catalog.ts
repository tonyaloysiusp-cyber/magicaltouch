// Ready-made content for the editor's side panels: text styles, font
// pairings, stickers, frames and backgrounds.

import type { TextPreset } from '@/hooks/useEditorFeatures';
import type { FrameKind } from './frames';
import { BRAND_GRADIENTS } from './gradients';

export const TEXT_BASICS: TextPreset[] = [
  { id: 'heading', label: 'Add a heading', text: 'Add a heading', fontFamily: 'Montserrat', fontSize: 96, fontWeight: 700 },
  { id: 'subheading', label: 'Add a subheading', text: 'Add a subheading', fontFamily: 'Montserrat', fontSize: 54, fontWeight: 700, fill: '#52525B' },
  { id: 'body', label: 'Add a little bit of body text', text: 'Add a little bit of body text', fontFamily: 'Inter', fontSize: 34, lineHeight: 1.4, fill: '#3F3F46' },
];

// Styled text combos. Each stays fully editable after it's added.
export const TEXT_STYLES: TextPreset[] = [
  { id: 'celebrate', label: 'Celebrate', text: 'Celebrate', fontFamily: 'Great Vibes', fontSize: 150, fill: '#D9778F' },
  { id: 'sale', label: 'SALE', text: 'SALE', fontFamily: 'Anton', fontSize: 210, fill: '#09090B', charSpacing: 40, fx: { effect: 'echo', color: '#8CCBFF', amount: 55 } },
  {
    id: 'magic',
    label: 'Magical',
    text: 'Magical',
    fontFamily: 'Playfair Display',
    fontSize: 140,
    fontWeight: 700,
    gradient: BRAND_GRADIENTS[1].spec,
  },
  { id: 'neon', label: 'Neon nights', text: 'Neon nights', fontFamily: 'Monoton', fontSize: 110, fill: '#F2708F', fx: { effect: 'neon', color: '#F2708F', amount: 60 } },
  { id: 'party', label: "LET'S PARTY", text: "LET'S PARTY", fontFamily: 'Bungee', fontSize: 110, fill: '#35C2F1', fx: { effect: 'outline', color: '#09090B', amount: 45 } },
  { id: 'curved', label: 'Curved text', text: 'HAPPY BIRTHDAY', fontFamily: 'Fredoka', fontSize: 90, fontWeight: 700, fill: '#3B82C4', fx: { curve: 55 } },
  { id: 'wedding', label: 'Sophia & Liam', text: 'Sophia & Liam', fontFamily: 'Alex Brush', fontSize: 130, fill: '#B8862B' },
  { id: 'elegant', label: 'THE GRAND OPENING', text: 'THE GRAND OPENING', fontFamily: 'Cinzel', fontSize: 70, fontWeight: 700, charSpacing: 200, fill: '#09090B' },
  { id: 'hand', label: 'thank you!', text: 'thank you!', fontFamily: 'Caveat', fontSize: 120, fill: '#09090B' },
  { id: 'glow', label: 'Glow up', text: 'Glow up', fontFamily: 'Pacifico', fontSize: 120, fill: '#FFFFFF', fx: { effect: 'glow', color: '#A69BD3', amount: 70 } },
  { id: 'retro', label: 'RETRO', text: 'RETRO', fontFamily: 'Righteous', fontSize: 170, fill: '#F7B267', fx: { effect: 'lift', color: '#09090B', amount: 55 } },
  { id: 'highlight', label: 'Highlighted', text: 'Highlighted', fontFamily: 'Poppins', fontSize: 90, fontWeight: 700, fill: '#09090B', fx: { effect: 'highlight', color: '#DDE23B', amount: 60 } },
  { id: 'wave', label: 'Making waves', text: 'Making waves', fontFamily: 'Baloo 2', fontSize: 96, fontWeight: 700, fill: '#5DCCB8', fx: { wave: 45 } },
  { id: 'hollow', label: 'OUTLINE', text: 'OUTLINE', fontFamily: 'Archivo Black', fontSize: 150, fill: '#09090B', fx: { effect: 'hollow', color: '#09090B', amount: 40 } },
];

// Heading + body pairings that work well together.
export const FONT_PAIRINGS: { heading: string; body: string; mood: string }[] = [
  { heading: 'Playfair Display', body: 'Lato', mood: 'Elegant' },
  { heading: 'Montserrat', body: 'Inter', mood: 'Modern' },
  { heading: 'Bebas Neue', body: 'Roboto', mood: 'Bold' },
  { heading: 'Great Vibes', body: 'Josefin Sans', mood: 'Romantic' },
  { heading: 'Fredoka', body: 'Nunito', mood: 'Playful' },
  { heading: 'Cinzel', body: 'Cormorant Garamond', mood: 'Luxury' },
  { heading: 'Anton', body: 'Work Sans', mood: 'Impact' },
  { heading: 'Pacifico', body: 'Quicksand', mood: 'Friendly' },
  { heading: 'Abril Fatface', body: 'Raleway', mood: 'Editorial' },
  { heading: 'Space Mono', body: 'DM Sans', mood: 'Tech' },
];

export const FRAME_KINDS: { kind: FrameKind; label: string }[] = [
  { kind: 'rect', label: 'Square' },
  { kind: 'roundRect', label: 'Rounded' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'arch', label: 'Arch' },
  { kind: 'heart', label: 'Heart' },
  { kind: 'star', label: 'Star' },
  { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'blob', label: 'Blob' },
  { kind: 'diamond', label: 'Diamond' },
  { kind: 'drop', label: 'Drop' },
  { kind: 'badge', label: 'Badge' },
  { kind: 'cloud', label: 'Cloud' },
];

// Emoji stickers are real text (they stay crisp at any size).
export const STICKER_SETS: { title: string; items: string[] }[] = [
  { title: 'Celebrate', items: ['🎉', '🎂', '🎈', '🎁', '🥳', '🍾', '🎊', '✨', '🪅', '🕯️', '🍰', '🧁'] },
  { title: 'Love', items: ['❤️', '💕', '💖', '💐', '🌹', '💍', '💌', '😍', '🥂', '🕊️', '💒', '🤍'] },
  { title: 'Nature', items: ['🌸', '🌼', '🌿', '🍃', '🌻', '🌈', '☀️', '🌙', '⭐', '🌊', '🦋', '🍀'] },
  { title: 'Food & drink', items: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🍦', '☕', '🍹', '🍓', '🥑', '🍋'] },
  { title: 'Business', items: ['📈', '💼', '📣', '🏷️', '🛍️', '💡', '✅', '📍', '📞', '✉️', '🗓️', '⏰'] },
  { title: 'School & kids', items: ['🎓', '📚', '✏️', '🏆', '🥇', '🎨', '🧸', '🚀', '🦄', '⚽', '🎮', '🐣'] },
];

// Background colours (light to dark) and gradients for the Background panel.
export const BACKGROUND_COLORS = [
  '#FFFFFF', '#F8FAFC', '#FFF7ED', '#FCE9EE', '#E8F5FF', '#ECFDF5', '#F5F3FF', '#FEF9C3',
  '#F3A6B8', '#8CCBFF', '#A69BD3', '#5DCCB8', '#F7B267', '#DDE23B', '#3B82C4', '#09090B',
];
export const BACKGROUND_GRADIENTS = BRAND_GRADIENTS;

// Seamless patterns as small SVG tiles.
const svg = (body: string, size = 40) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`)}`;

export const BACKGROUND_PATTERNS: { id: string; label: string; url: string }[] = [
  { id: 'dots', label: 'Dots', url: svg('<rect width="40" height="40" fill="#FFFFFF"/><circle cx="10" cy="10" r="3" fill="#8CCBFF"/><circle cx="30" cy="30" r="3" fill="#F3A6B8"/>') },
  { id: 'grid', label: 'Grid', url: svg('<rect width="40" height="40" fill="#FFFFFF"/><path d="M40 0H0V40" fill="none" stroke="#E5E7EB" stroke-width="2"/>') },
  { id: 'stripes', label: 'Stripes', url: svg('<rect width="40" height="40" fill="#E8F5FF"/><path d="M-10 50L50 -10M-10 10L10 -10M30 50L50 30" stroke="#8CCBFF" stroke-width="8"/>') },
  { id: 'confetti', label: 'Confetti', url: svg('<rect width="60" height="60" fill="#FFFFFF"/><rect x="8" y="10" width="8" height="3" rx="1.5" fill="#F2708F" transform="rotate(25 12 11)"/><rect x="38" y="16" width="8" height="3" rx="1.5" fill="#35C2F1" transform="rotate(-30 42 17)"/><circle cx="22" cy="42" r="3" fill="#DDE23B"/><rect x="44" y="44" width="8" height="3" rx="1.5" fill="#A69BD3" transform="rotate(60 48 45)"/><circle cx="52" cy="6" r="2" fill="#5DCCB8"/>', 60) },
  { id: 'hearts', label: 'Hearts', url: svg('<rect width="40" height="40" fill="#FCE9EE"/><path d="M20 28c-6-4-10-7-10-11a4.5 4.5 0 0 1 10-2a4.5 4.5 0 0 1 10 2c0 4-4 7-10 11z" fill="#F3A6B8"/>') },
  { id: 'waves', label: 'Waves', url: svg('<rect width="40" height="40" fill="#ECFDF5"/><path d="M0 20q10-10 20 0t20 0" fill="none" stroke="#5DCCB8" stroke-width="3"/>') },
  { id: 'checks', label: 'Checks', url: svg('<rect width="40" height="40" fill="#FFFFFF"/><rect width="20" height="20" fill="#F5F3FF"/><rect x="20" y="20" width="20" height="20" fill="#F5F3FF"/>') },
  { id: 'stars', label: 'Stars', url: svg('<rect width="40" height="40" fill="#0B1020"/><path d="M12 6l1.5 3.5L17 11l-3.5 1.5L12 16l-1.5-3.5L7 11l3.5-1.5z" fill="#F7E7A1"/><circle cx="30" cy="28" r="1.5" fill="#FFFFFF"/><circle cx="32" cy="8" r="1" fill="#FFFFFF"/>') },
];

// Searchable index of everything in the Elements panel.
export const ELEMENT_KEYWORDS: Record<string, string> = {
  rect: 'square rectangle box',
  roundRect: 'rounded square button card',
  circle: 'circle round dot',
  ellipse: 'oval ellipse',
  triangle: 'triangle',
  rightTriangle: 'right triangle corner',
  diamond: 'diamond rhombus',
  pentagon: 'pentagon',
  hexagon: 'hexagon honeycomb',
  polygon: 'polygon octagon',
  star: 'star rating',
  star4: 'sparkle twinkle star',
  burst: 'burst sale sticker explosion',
  badge: 'badge seal certificate award',
  heart: 'heart love valentine',
  cloud: 'cloud weather',
  drop: 'drop water',
  moon: 'moon night',
  arch: 'arch window door',
  blob: 'blob organic',
  cross: 'plus cross add medical',
  speech: 'speech bubble chat quote talk',
  speechRound: 'thought bubble think',
  banner: 'banner label title',
  ribbon: 'ribbon banner award',
  arrowRight: 'arrow right next',
  arrowLeft: 'arrow left back',
  arrowUp: 'arrow up',
  arrowDown: 'arrow down',
  arrowDouble: 'double arrow both ways',
  chevron: 'chevron next',
  line: 'line divider rule',
  arrowLine: 'arrow line pointer',
};
