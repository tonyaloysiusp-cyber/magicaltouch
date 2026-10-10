'use client';

import { useEffect } from 'react';
import { installChunkRecovery } from '@/lib/chunkRecovery';

export function ChunkRecovery() {
  useEffect(() => installChunkRecovery(), []);
  return null;
}
