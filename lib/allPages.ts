// The database answers at most 1,000 rows per request, so long lists are
// read in pages of 1,000 (all pages at once) and joined.
export async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any; count?: number | null }>): Promise<{ data: T[] | null; error: any }> {
  const SIZE = 1000;
  const first = await page(0, SIZE - 1);
  if (first.error || !first.data) return { data: null, error: first.error };
  if (first.data.length < SIZE) return { data: first.data, error: null };
  const out = [...first.data];
  for (let from = SIZE; ; from += SIZE * 3) {
    const parts = await Promise.all([0, 1, 2].map((k) => page(from + k * SIZE, from + (k + 1) * SIZE - 1)));
    const bad = parts.find((p) => p.error);
    if (bad) return { data: null, error: bad.error };
    let done = false;
    for (const p of parts) {
      out.push(...(p.data || []));
      if (!p.data || p.data.length < SIZE) { done = true; break; }
    }
    if (done) return { data: out, error: null };
  }
}
