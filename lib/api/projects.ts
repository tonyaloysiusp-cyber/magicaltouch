import { apiFetch } from './client';

export interface ProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updated_at: string;
  thumbnail: string | null;
  editor_type?: string;
}

export interface ProjectFull extends ProjectSummary {
  canvas_json: any;
}

export const listProjects = (): Promise<ProjectSummary[]> => apiFetch('/api/projects');

export const getProject = (id: string): Promise<ProjectFull> => apiFetch(`/api/projects/${id}`);

export const createProject = (payload: {
  name?: string;
  width: number;
  height: number;
  editor_type?: string;
  canvas_json?: any;
  thumbnail?: string | null;
}): Promise<ProjectSummary> => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(payload) });

export const updateProject = (
  id: string,
  patch: Partial<{ name: string; canvas_json: any; thumbnail: string | null; width: number; height: number; editor_type: string }>
): Promise<ProjectSummary> => apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteProject = (id: string): Promise<null> => apiFetch(`/api/projects/${id}`, { method: 'DELETE' });

export const duplicateProject = (id: string): Promise<ProjectSummary> =>
  apiFetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
