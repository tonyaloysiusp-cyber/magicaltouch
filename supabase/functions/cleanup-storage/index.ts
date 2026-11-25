// Removes the storage pictures queued in public.cleanup_files (templates the owner
// approved for deletion on 25 Nov 2026), 100 at a time. It only ever deletes paths
// that an admin queued in that table with SQL, so calling it can do nothing else.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await db.from('cleanup_files').select('path,bucket').eq('done', false).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) return Response.json({ removed: 0, left: 0 });
  const byBucket = new Map<string, string[]>();
  for (const r of data) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) || []), r.path]);
  let removed = 0;
  for (const [bucket, paths] of byBucket) {
    const { error: e } = await db.storage.from(bucket).remove(paths);
    if (!e) { removed += paths.length; await db.from('cleanup_files').update({ done: true }).in('path', paths); }
  }
  const { count } = await db.from('cleanup_files').select('path', { count: 'exact', head: true }).eq('done', false);
  return Response.json({ removed, left: count ?? null });
});
