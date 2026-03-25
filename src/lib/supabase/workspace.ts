'use server';

import { requireUser } from '@/lib/auth/server';
import { createClient } from './server';
import type { Database } from './db.types';
import {
    getWorkspaceValidationMessage,
    workspaceFolderSchema,
    workspaceProjectMoveSchema,
    workspaceProjectSchema,
} from '@/lib/workspace/validation';

export type Folder  = Database['public']['Tables']['folders']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function resolveClient(client?: SupabaseServerClient): Promise<SupabaseServerClient> {
    return client ?? createClient();
}

async function assertOwnedFolder(
    supabase: SupabaseServerClient,
    userId: string,
    folderId: string,
): Promise<Folder> {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error('Pasta invalida ou nao pertence ao usuario autenticado.');
    }

    return data;
}

async function assertOwnedProject(
    supabase: SupabaseServerClient,
    userId: string,
    projectId: string,
): Promise<Project> {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error('Projeto invalido ou nao pertence ao usuario autenticado.');
    }

    return data;
}

export async function getWorkspaceSnapshot(): Promise<{ folders: Folder[]; projects: Project[] }> {
    const { supabase, user } = await requireUser();
    const [folders, projects] = await Promise.all([
        getFolders(user.id, supabase),
        getProjects(user.id, undefined, supabase),
    ]);

    return { folders, projects };
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function getFolders(userId: string, client?: SupabaseServerClient): Promise<Folder[]> {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name');
    if (error) throw error;
    return data;
}

export async function createFolder(params: {
    name: string;
    parentId?: string | null;
}): Promise<Folder> {
    const parsed = workspaceFolderSchema.safeParse(params);
    if (!parsed.success) {
        throw new Error(getWorkspaceValidationMessage(parsed.error));
    }

    const { supabase, user } = await requireUser();

    if (parsed.data.parentId) {
        await assertOwnedFolder(supabase, user.id, parsed.data.parentId);
    }

    const { data, error } = await supabase
        .from('folders')
        .insert({
            user_id: user.id,
            name: parsed.data.name,
            parent_id: parsed.data.parentId ?? null,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteFolder(id: string): Promise<void> {
    const { supabase, user } = await requireUser();
    await assertOwnedFolder(supabase, user.id, id);
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) throw error;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(
    userId: string,
    folderId?: string | null,
    client?: SupabaseServerClient,
): Promise<Project[]> {
    const supabase = await resolveClient(client);
    let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (folderId === null) {
        query = query.is('folder_id', null);
    } else if (folderId) {
        query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createProject(params: {
    name: string;
    module: 'paint' | 'graph' | 'automaton';
    folderId?: string | null;
}): Promise<Project> {
    const parsed = workspaceProjectSchema.safeParse(params);
    if (!parsed.success) {
        throw new Error(getWorkspaceValidationMessage(parsed.error));
    }

    const { supabase, user } = await requireUser();

    if (parsed.data.folderId) {
        await assertOwnedFolder(supabase, user.id, parsed.data.folderId);
    }

    const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
            user_id: user.id,
            name: parsed.data.name,
            module: parsed.data.module,
            folder_id: parsed.data.folderId ?? null,
        })
        .select()
        .single();
    if (projError) throw projError;

    const moduleTable = `${parsed.data.module}_projects` as const;
    const { error: moduleError } = await supabase
        .from(moduleTable as 'paint_projects')
        .insert({ project_id: project.id } as never);
    if (moduleError) {
        await supabase.from('projects').delete().eq('id', project.id);
        throw moduleError;
    }

    return project;
}

export async function deleteProject(id: string): Promise<void> {
    const { supabase, user } = await requireUser();
    await assertOwnedProject(supabase, user.id, id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
}

export async function moveProjectToFolder(params: {
    projectId: string;
    folderId: string | null;
}): Promise<Project> {
    const parsed = workspaceProjectMoveSchema.safeParse(params);
    if (!parsed.success) {
        throw new Error(getWorkspaceValidationMessage(parsed.error));
    }

    const { supabase, user } = await requireUser();
    await assertOwnedProject(supabase, user.id, parsed.data.projectId);

    if (parsed.data.folderId) {
        await assertOwnedFolder(supabase, user.id, parsed.data.folderId);
    }

    const { data, error } = await supabase
        .from('projects')
        .update({ folder_id: parsed.data.folderId })
        .eq('id', parsed.data.projectId)
        .eq('user_id', user.id)
        .select('*')
        .single();

    if (error || !data) throw error ?? new Error('Nao foi possivel mover o projeto.');
    return data;
}
