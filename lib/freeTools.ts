// Free tools for making festival and promo content — shown in Admin →
// Festivals (planner) and the AI Studio. Every one has a usable free plan
// (some ask for a free account). Our own tools come first, so the work
// stays on the site where possible.

export interface FreeTool { name: string; url: string; what: string }
export interface ToolGroup { id: string; title: string; tools: FreeTool[] }

export const FREE_TOOLS: ToolGroup[] = [
  { id: 'ours', title: 'Built into Magical Touch', tools: [
    { name: 'AI Template Studio', url: '/admin/templates?claude=', what: 'Recreate any image or brief as an editable template' },
    { name: 'Editor', url: '/create', what: 'Design from a template or a blank page' },
    { name: 'Photo Studio', url: '/photo-studio', what: 'Retouch, filters and background removal' },
    { name: 'QR code generator', url: '/free-qr-code-generator', what: 'Scannable QR codes with your logo' },
    { name: 'Image resizer', url: '/free-image-resizer', what: 'Exact sizes for every platform' },
  ] },
  { id: 'chat', title: 'AI that designs templates (free chat)', tools: [
    { name: 'Claude', url: 'https://claude.ai', what: 'Clean layouts; follows the template format best' },
    { name: 'ChatGPT', url: 'https://chatgpt.com', what: 'All-rounder; reads reference images' },
    { name: 'Gemini', url: 'https://gemini.google.com', what: 'Strong with photos; free API key for one-click' },
    { name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com', what: 'Free with a Microsoft account' },
    { name: 'Le Chat (Mistral)', url: 'https://chat.mistral.ai', what: 'Fast European AI' },
    { name: 'Grok', url: 'https://grok.com', what: 'Free with an X account' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com', what: 'Great at captions and copy' },
    { name: 'Qwen', url: 'https://chat.qwen.ai', what: 'Reads images; good in many languages' },
  ] },
  { id: 'image', title: 'Free AI images', tools: [
    { name: 'Microsoft Designer / Bing Image Creator', url: 'https://www.bing.com/images/create', what: 'Free daily image generations' },
    { name: 'Google ImageFX', url: 'https://labs.google/fx/tools/image-fx', what: 'Free photo-realistic images' },
    { name: 'Adobe Firefly', url: 'https://firefly.adobe.com', what: 'Free monthly credits; commercially safe' },
    { name: 'Ideogram', url: 'https://ideogram.ai', what: 'Best at text inside images' },
    { name: 'Leonardo.ai', url: 'https://leonardo.ai', what: 'Free daily tokens; many styles' },
    { name: 'Krea', url: 'https://www.krea.ai', what: 'Real-time generation and upscaling' },
    { name: 'Pollinations', url: 'https://pollinations.ai', what: 'No sign-up; used for free AI photos in the Studio' },
    { name: 'Hugging Face Spaces', url: 'https://huggingface.co/spaces', what: 'Open models (FLUX, SDXL) to try free' },
  ] },
  { id: 'photo', title: 'Free photos, icons & illustrations', tools: [
    { name: 'Unsplash', url: 'https://unsplash.com', what: 'High-quality free photos' },
    { name: 'Pexels', url: 'https://www.pexels.com', what: 'Free photos and videos' },
    { name: 'Pixabay', url: 'https://pixabay.com', what: 'Photos, vectors, music and videos' },
    { name: 'Openverse', url: 'https://openverse.org', what: 'Openly licensed images, searchable' },
    { name: 'unDraw', url: 'https://undraw.co', what: 'Free illustrations in your colour' },
    { name: 'Storyset', url: 'https://storyset.com', what: 'Animated and static illustrations' },
    { name: 'SVG Repo', url: 'https://www.svgrepo.com', what: 'Free icons and vectors' },
    { name: 'Iconify', url: 'https://icon-sets.iconify.design', what: '200,000+ open-source icons' },
  ] },
  { id: 'edit', title: 'Free photo clean-up', tools: [
    { name: 'Photoroom (web)', url: 'https://www.photoroom.com', what: 'Product photos and backgrounds' },
    { name: 'Clipdrop', url: 'https://clipdrop.co', what: 'Remove objects, relight, upscale' },
    { name: 'Upscayl', url: 'https://upscayl.org', what: 'Free desktop app to enlarge photos sharply' },
    { name: 'Photopea', url: 'https://www.photopea.com', what: 'Open PSD files in the browser' },
  ] },
  { id: 'type', title: 'Free fonts & colours', tools: [
    { name: 'Google Fonts', url: 'https://fonts.google.com', what: 'Open fonts, including Arabic and Indian scripts' },
    { name: 'Fontshare', url: 'https://www.fontshare.com', what: 'Free professional fonts' },
    { name: 'Coolors', url: 'https://coolors.co', what: 'Colour palettes in seconds' },
    { name: 'Adobe Color', url: 'https://color.adobe.com', what: 'Palettes from any photo' },
  ] },
  { id: 'video', title: 'Free video & reels', tools: [
    { name: 'CapCut', url: 'https://www.capcut.com', what: 'Reels with templates and auto captions' },
    { name: 'Clipchamp', url: 'https://clipchamp.com', what: 'Browser video editor, free 1080p export' },
    { name: 'Kapwing', url: 'https://www.kapwing.com', what: 'Subtitles and resizing for every platform' },
    { name: 'Pixabay Music', url: 'https://pixabay.com/music', what: 'Royalty-free music for reels' },
  ] },
  { id: 'post', title: 'Free scheduling', tools: [
    { name: 'Meta Business Suite', url: 'https://business.facebook.com', what: 'Schedule Instagram and Facebook posts free' },
    { name: 'LinkedIn scheduler', url: 'https://www.linkedin.com', what: 'Clock icon when posting — free' },
    { name: 'Buffer (free plan)', url: 'https://buffer.com', what: 'Up to 3 channels, 10 posts each' },
    { name: 'Pinterest scheduler', url: 'https://www.pinterest.com', what: 'Schedule pins up to 2 weeks ahead' },
  ] },
];

export const FREE_TOOL_COUNT = FREE_TOOLS.reduce((n, g) => n + g.tools.length, 0);
