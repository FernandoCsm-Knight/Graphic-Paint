import { NextResponse, type NextRequest } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import {
    automatonProjectSnapshotSchema,
    graphProjectSnapshotSchema,
    moduleProjectParamsSchema,
    paintProjectSnapshotSchema,
} from '@/lib/workspace/projectPersistence.schemas';
import {
    ProjectAccessError,
    saveAutomatonProjectSnapshot,
    saveGraphProjectSnapshot,
    savePaintProjectSnapshot,
} from '@/lib/workspace/projectPersistence';

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}

function isAllowedOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    return !origin || origin === request.nextUrl.origin;
}

type RouteContext = {
    params: Promise<{ module: string; projectId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
    if (!isAllowedOrigin(request)) {
        return jsonResponse({ error: 'Origem da requisicao invalida.' }, 403);
    }

    const parsedParams = moduleProjectParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
        return jsonResponse({ error: parsedParams.error.issues[0]?.message ?? 'Projeto invalido.' }, 400);
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: 'Requisicao invalida.' }, 400);
    }

    try {
        switch (parsedParams.data.module) {
            case 'graph': {
                const snapshot = graphProjectSnapshotSchema.parse(payload);
                await saveGraphProjectSnapshot(parsedParams.data.projectId, snapshot);
                break;
            }
            case 'automaton': {
                const snapshot = automatonProjectSnapshotSchema.parse(payload);
                await saveAutomatonProjectSnapshot(parsedParams.data.projectId, snapshot);
                break;
            }
            case 'paint': {
                const snapshot = paintProjectSnapshotSchema.parse(payload);
                await savePaintProjectSnapshot(parsedParams.data.projectId, snapshot);
                break;
            }
        }
    } catch (error) {
        // Let Next.js handle redirect()/notFound() thrown by auth helpers.
        unstable_rethrow(error);

        if (error instanceof ZodError) {
            return jsonResponse({ error: error.issues[0]?.message ?? 'Dados do projeto invalidos.' }, 400);
        }

        if (error instanceof ProjectAccessError) {
            return jsonResponse({ error: error.message }, 404);
        }

        // Internal/database details stay in the server log only.
        console.error('[api/projects] falha ao salvar projeto', {
            module: parsedParams.data.module,
            projectId: parsedParams.data.projectId,
            error,
        });
        return jsonResponse({ error: 'Nao foi possivel salvar o projeto.' }, 500);
    }

    return jsonResponse({ ok: true });
}
