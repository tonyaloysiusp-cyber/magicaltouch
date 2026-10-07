import { NextRequest } from 'next/server';
import { requireUser, ApiAuthError } from '@/lib/api/auth';

// Admin check for API routes. The database enforces admin rights too
// (RLS + is_admin() in every admin function); this just fails fast with
// a clear 403 instead of a confusing empty result.
export async function requireAdmin(request: NextRequest) {
  const ctx = await requireUser(request);
  const { data, error } = await ctx.supabase.from('profiles').select('is_admin, name').eq('id', ctx.user.id).maybeSingle();
  if (error || !data?.is_admin) throw new ApiAuthError('Administrators only', 403);
  return { ...ctx, adminName: data.name as string | null };
}
