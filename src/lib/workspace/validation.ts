import { z } from 'zod';

export const workspaceFolderSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Informe um nome para a pasta.')
        .max(255, 'O nome da pasta deve ter no maximo 255 caracteres.'),
    parentId: z.string().uuid('Pasta pai invalida.').nullable().optional(),
});

export const workspaceProjectSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Informe um nome para o projeto.')
        .max(255, 'O nome do projeto deve ter no maximo 255 caracteres.'),
    module: z.enum(['paint', 'graph', 'automaton']),
    folderId: z.string().uuid('Pasta invalida.').nullable().optional(),
});

export const workspaceProjectMoveSchema = z.object({
    projectId: z.string().uuid('Projeto invalido.'),
    folderId: z.string().uuid('Pasta invalida.').nullable(),
});

export function getWorkspaceValidationMessage(error: z.ZodError): string {
    return error.issues[0]?.message ?? 'Dados invalidos.';
}
