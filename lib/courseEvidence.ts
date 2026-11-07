// Practical tasks: a learner uploads a screenshot of their edited design as
// proof for a lesson. Pictures are shrunk hard in the browser (about 640 px,
// low-quality WebP, usually 20–60 KB) — just enough for a reviewer to check.
// Stored privately in the learner's own folder of "design-assets"; only the
// learner and admins can open them.

import { supabase } from '@/lib/supabase';
import type { CourseLevel } from '@/lib/courses';

const BUCKET = 'design-assets';
export const evidenceFolder = (userId: string, courseId: string) => `${userId}/course-evidence/${courseId}`;
export const evidencePath = (userId: string, courseId: string, lessonId: string) => `${evidenceFolder(userId, courseId)}/${lessonId}.webp`;

/** Intermediate and Pro courses need a screenshot for every lesson. */
export const needsEvidence = (level: CourseLevel | string) => level === 'Intermediate' || level === 'Pro';

export async function compressScreenshot(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const tries: [number, number][] = [[640, 0.42], [520, 0.32], [420, 0.25]];
  let out: Blob | null = null;
  for (const [max, q] of tries) {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    out = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/webp', q));
    if (!out) out = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', q));
    if (out && out.size <= 70 * 1024) break;
  }
  if (!out) throw new Error('Could not read the picture.');
  return out;
}

export async function uploadEvidence(userId: string, courseId: string, lessonId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a picture (screenshot).');
  const blob = await compressScreenshot(file);
  const { error } = await supabase.storage.from(BUCKET).upload(evidencePath(userId, courseId, lessonId), blob, { contentType: blob.type, upsert: true });
  if (error) throw error;
  return blob.size;
}

/** lessonId → signed picture URL (1 hour) for every screenshot in a course. */
export async function listEvidence(userId: string, courseId: string): Promise<Record<string, { url: string; size: number; at: string }>> {
  const folder = evidenceFolder(userId, courseId);
  const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 200 });
  const files = (data || []).filter((f) => f.name.endsWith('.webp'));
  if (!files.length) return {};
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(files.map((f) => `${folder}/${f.name}`), 3600);
  const out: Record<string, { url: string; size: number; at: string }> = {};
  files.forEach((f, i) => {
    const url = signed?.[i]?.signedUrl;
    if (url) out[f.name.replace(/\.webp$/, '')] = { url, size: (f.metadata as any)?.size || 0, at: f.updated_at || f.created_at || '' };
  });
  return out;
}
