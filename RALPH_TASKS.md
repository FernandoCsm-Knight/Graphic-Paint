# Ralph Loop — Correções estruturais do Graphic Paint

## Como trabalhar (leia a cada iteração)

1. Rode `git status` e `git log --oneline -10` para ver o que já foi feito.
2. Se não estiver na branch `ralph/correcoes`, crie/troque para ela (`git switch -c ralph/correcoes` ou `git switch ralph/correcoes`). Nunca trabalhe na `main`.
3. Escolha a **primeira tarefa com `[ ]`** abaixo. Faça **apenas essa tarefa** nesta iteração.
4. Implemente a correção com a menor mudança possível. Não refatore o que a tarefa não pede.
5. Verifique: `npm run typecheck`, `npm run lint` e `npm test` (quando existirem) precisam passar. Todos os "Critérios de pronto" da tarefa precisam ser verdadeiros.
6. Marque a tarefa como `[x]` neste arquivo e escreva uma linha em **Notas de progresso** (o que mudou, arquivos tocados, algo que ficou pendente).
7. Faça commit com mensagem curta em português: `fix(paint): <resumo>` (ou `chore:`/`test:`).
8. Se uma tarefa estiver bloqueada (algo exige decisão humana, ex.: mudar schema do banco em produção), marque `[!]`, explique o bloqueio em Notas de progresso e passe para a próxima.
9. Quando **todas** as tarefas estiverem `[x]` ou `[!]` e as verificações passarem, responda exatamente: `<promise>TODAS AS TAREFAS CONCLUIDAS</promise>`. Não diga isso antes.

Regras gerais:
- Código do Paint fica em `src/app/(workspace)/paint/`. Persistência em `src/lib/workspace/` e `src/app/api/projects/`.
- Mantenha textos de UI em português.
- Não apague dados do usuário nem altere `supabase/config.toml` sem necessidade.
- Testes novos ficam ao lado do código (`*.test.ts`) e usam Vitest.

---

## Tarefas

### [x] 1. Preparar ferramentas de verificação
- Rodar `npm install`.
- Adicionar em `package.json`: `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"test": "vitest run"`.
- Instalar `vitest` como devDependency e criar `vitest.config.ts` com o alias `@` → `src`.
- Corrigir os erros de typecheck/lint que já existirem (apenas os necessários para ficar verde).

**Pronto quando:** `npm run typecheck`, `npm run lint` e `npm test` rodam e passam (mesmo que ainda sem testes, use `--passWithNoTests`).

### [x] 2. Testes dos algoritmos puros
- Criar testes para `_algorithms/BresenhamLine.ts`, `DDA.ts`, `CohenSutherland.ts`, `LiangBarsky.ts`, `SutherlandHodgman.ts`.
- Criar teste de ida e volta para `_utils/scenePersistence.ts` (serializar → desserializar → mesmos dados) para formas vetoriais (line, rect, circle, ellipse, polygon, bezier, bspline, freeform, floodfill, clearrect, group). Use mocks simples de canvas quando necessário.

**Pronto quando:** testes passam e cobrem os casos básicos (reta horizontal/vertical/diagonal, linha totalmente dentro/fora/cruzando a janela).

### [x] 3. Desfazer não deixa sobras após o canvas crescer
- Em `_hooks/useScene.ts` (`redrawFromScene`), sempre limpar o canvas (`clearRect`) antes de aplicar o checkpoint.
- Garantir que `RasterCheckpoint`, `FreeForm.draw` e `FillShape.draw` com snapshot não deixem pixels fora da área do snapshot.

**Pronto quando:** desfazer um traço feito na área nova (após o mundo crescer) remove o traço por completo; typecheck/lint/test passam.

### [x] 4. Limitar o uso de memória do histórico
- Hoje cada `FreeForm`/`FillShape` guarda um `ImageData` do canvas inteiro (~15 MB) e o histórico não tem limite.
- Implementar: (a) checkpoints apenas a cada N itens (ex.: 10) em vez de em todo traço/preenchimento; os demais itens são redesenhados a partir do checkpoint anterior; (b) limite de passos de desfazer (ex.: 50) — itens mais antigos são "achatados" em um único checkpoint base.
- Manter o comportamento de desfazer/refazer correto (testes unitários do `useScene` ou de uma classe extraída dele).

**Pronto quando:** no máximo ~`50/N + 1` ImageData vivos na cena; desfazer/refazer continuam corretos; testes cobrem o limite.

### [x] 5. "Apagar página" e recortes de seleção persistem após recarregar
- `RasterCheckpoint` (usado por `saveSnapshot` em `useCanvas.ts`, pelo `PageSizeEraser` e por recortes em `useSelection.ts`) não é serializado em `scenePersistence.ts` e some ao recarregar.
- Opção preferida: transformar "apagar página" em um item vetorial (ex.: `ClearRectItem` do tamanho do canvas) e recortes de seleção em `ClearRectItem` + `ImageShape`. Alternativa: serializar o checkpoint como PNG (data URL) com kind `checkpoint`.
- Adicionar o novo kind ao schema zod em `src/lib/workspace/projectPersistence.schemas.ts` se necessário.

**Pronto quando:** teste de ida e volta prova que a cena com apagar/recorte é restaurada igual; typecheck/lint/test passam.

### [x] 6. Spray igual depois de recarregar
- Em `_shapes/FreeForm.ts`, o spray usa `Math.random()` ao desenhar, mas o replay desenha círculos.
- Usar um gerador pseudoaleatório com semente (ex.: mulberry32) salva no item, usado tanto no desenho ao vivo quanto no replay. Serializar a semente.

**Pronto quando:** teste mostra que duas execuções de replay com a mesma semente geram os mesmos pontos; desenho ao vivo e replay usam o mesmo algoritmo.

### [!] 7. Salvamento atômico no servidor
- `savePaintProjectSnapshot` (e as versões de grafo/autômato) em `src/lib/workspace/projectPersistence.ts` apaga tudo e depois insere; se a inserção falhar, o projeto fica vazio.
- Criar funções SQL (RPC) em `src/lib/sql/schema.sql` que façam apagar+inserir dentro de uma transação, e chamá-las com `supabase.rpc(...)`. Atualizar `src/lib/supabase/db.types.ts` com as assinaturas.
- Se aplicar a migração no banco exigir ação humana, implemente o código e o SQL, e marque `[!]` explicando que a migração precisa ser aplicada.
- Na rota `src/app/api/projects/[module]/[projectId]/route.ts`, não devolver mensagens internas de erro ao cliente; logar no servidor e responder mensagem genérica (zod → 400 com a mensagem de validação; resto → 500).

**Pronto quando:** não existe mais caminho em que o delete roda sem o insert na mesma transação; typecheck/lint passam.

### [x] 8. Atalhos de teclado não atrapalham campos de texto
- Criar `src/utils/isTypingTarget.ts` (retorna true para `input`, `textarea`, `select` e `contentEditable`).
- Usar em todos os listeners de `keydown`: `paint/PaintWorkspace.tsx`, `paint/_hooks/usePendingPlacement.ts`, `usePolygonDrawing.ts`, `useCurveDrawing.ts`, `graph/_hooks/useGraphD3.ts`, `automaton/_hooks/useAutomatonD3.ts` (substituir o `tagName === 'INPUT'` atual).
- Adicionar Ctrl+Shift+Z como refazer no Paint.

**Pronto quando:** teste unitário do `isTypingTarget`; nenhum handler de keydown do projeto deixa de usá-lo.

### [x] 9. Salvamento automático visível e confiável
- Em `paint/_hooks/useCanvas.ts`:
  - Separar o salvamento de visualização (`viewOffset`, `zoom`) do salvamento da cena, ou pelo menos não reserializar a cena quando só a visualização mudou (comparar `sceneRevision`).
  - Expor um estado `saveStatus: 'idle' | 'saving' | 'saved' | 'error'` e mostrá-lo no badge do workspace (ex.: "Salvo", "Salvando…", "Erro ao salvar — tentando novamente").
  - Tentar de novo com backoff em caso de erro.
  - Salvar imediatamente em `visibilitychange` (aba escondida) usando `fetch(..., { keepalive: true })`, e avisar com `beforeunload` se houver alterações não salvas.

**Pronto quando:** arrastar/zoom não serializa a cena; status visível; typecheck/lint/test passam.

### [x] 10. Trocar `alert()` por aviso não bloqueante
- Criar um componente de toast simples (sem nova dependência) em `src/components/` com contexto/provider.
- Substituir os `alert()` de `paint/_hooks/usePaintClipboard.ts`.

**Pronto quando:** `grep -r "alert(" src` não retorna nada; typecheck/lint passam.

### [x] 11. README do projeto
- Substituir o README padrão do create-next-app por um README em português: o que é o app (Paint, Grafos, Autômatos), como rodar (`npm install`, variáveis do Supabase, `npm run dev`), scripts disponíveis e estrutura de pastas.

**Pronto quando:** README não contém mais texto do template.

---

## Notas de progresso

<!-- Uma linha por iteração: data · tarefa · o que mudou · pendências -->
- 2026-11-10 · T1 · scripts `typecheck`/`lint`/`test` + vitest (`vitest.config.ts`, alias `@`); corrigidos 3 erros `react-hooks/set-state-in-effect` em `AutomatonWorkspace.tsx` e `AutomatonLabelEditor.tsx` (estado ajustado durante render; posição do editor via `useMemo` + origem do SVG por ResizeObserver) · restam 5 warnings em `usePendingPlacement.ts` (não bloqueiam) · editor de rótulo do autômato não testado no navegador.
- 2026-11-10 · T2 · testes em `_algorithms/lineRasterization.test.ts` (Bresenham/DDA), `_algorithms/clipping.test.ts` (Cohen-Sutherland, Liang-Barsky, Sutherland-Hodgman) e `_utils/scenePersistence.test.ts` (ida e volta de 15 kinds); `vitest.config.ts` → `.mts` para evitar aviso de ESM · 26 testes passando · `.gitignore` agora ignora o estado do Ralph.
- 2026-11-10 · T3 · replay extraído para `_utils/sceneReplay.ts` (`replayScene` sempre limpa antes; `drawRedoItem` limpa antes de refazer checkpoint); `useScene.ts` usa os helpers · `sceneReplay.test.ts` com canvas falso reproduz o bug do canvas que cresce · 32 testes passando · não verificado no navegador.
- 2026-11-10 · T4 · `_utils/sceneHistory.ts`: checkpoint no máximo a cada 10 itens (`applyCheckpointInterval`), desfazer limitado a 50 (`undoFloorRef` em `useScene.ts`) e snapshots anteriores ao checkpoint base liberados (`releaseSnapshotsBeforeFloor`); `SceneItem.releaseSnapshot()`/`isBarrier()`; seleção usa `getSelectableSceneSlice` (barreira) para manter o comportamento · itens continuam na cena para persistência · spray não libera pelo intervalo (replay inexato, ver T6) — após T6, trocar a condição em `FreeForm.releaseSnapshot` · `RasterCheckpoint` nunca é liberado (ver T5) · 42 testes · não verificado no navegador.
- 2026-11-10 · T5 · "apagar página" agora registra um `ClearRectItem` com a união da faixa apagada (`_utils/eraseBand.ts`) via novo `pushSceneItemRef` (substitui `saveSnapshotRef`); `RasterCheckpoint`/`takeSnapshotShape` removidos (não há mais item raster sem dados vetoriais); recorte de seleção já usava `ClearRectItem` + `ImageShape` (persistidos); campos do `ClearRectItem` públicos (sem cast na serialização) · 46 testes · `ImageShape` não testado em Node (precisa de DOM) · não verificado no navegador.
- 2026-11-10 · T6 · `_algorithms/Spray.ts` (mulberry32 + `sprayDots` por semente e índice do ponto); `FreeForm` guarda `seed`, desenho ao vivo e replay usam a mesma função (antes o replay desenhava círculos); semente serializada (projetos antigos → semente 0); `FreeForm.releaseSnapshot` agora libera spray também (pendência da T4 resolvida) · 54 testes · não verificado no navegador.
- 2026-11-10 · T7 [!] · funções `save_paint_project`, `save_graph_project`, `save_automaton_project` (plpgsql, SECURITY INVOKER, uma transação) em `supabase/migrations/20261110000000_atomic_project_save.sql` e anexadas a `src/lib/sql/schema.sql`; `projectPersistence.ts` usa `supabase.rpc(...)`; tipos em `db.types.ts`; rota: `unstable_rethrow`, ZodError → 400, `ProjectAccessError` → 404, resto → log no servidor + 500 genérico · **BLOQUEIO: a migração precisa ser aplicada no Supabase (SQL Editor ou `supabase db push`). Até lá, salvar projetos falha (dados existentes não são apagados).** · não testado contra banco real.
- 2026-11-10 · T8 · `src/utils/isTypingTarget.ts` (input de texto, textarea, select, contentEditable; ignora range/checkbox/color etc.) aplicado em todos os listeners globais de keydown: `PaintWorkspace.tsx`, `usePendingPlacement.ts`, `usePolygonDrawing.ts`, `useCurveDrawing.ts`, `useGraphD3.ts`, `useAutomatonD3.ts`; Ctrl+Shift+Z refaz no Paint · 57 testes · não verificado no navegador.
- 2026-11-10 · T9 · `src/lib/workspace/autosave.ts` (`Autosaver`: debounce 900 ms, não reenvia payload igual, status idle/saving/saved/error, novas tentativas 2s/5s/15s/30s, `flush` com keepalive só até 60 KB); `useCanvas.ts` usa um Autosaver por projeto, cacheia a cena serializada por `sceneRevision` (pan/zoom não reserializa), salva ao esconder a aba e ao sair do workspace, avisa no `beforeunload` com alterações pendentes; badge do Paint mostra "Salvando…/Salvo/Erro ao salvar — tentando novamente" · 64 testes · enquanto a migração da T7 não for aplicada o badge vai mostrar erro · não verificado no navegador.
- 2026-11-10 · T10 · `src/context/ToastContext.ts` (contexto, `useToast`, `toastReducer`, máx. 3 avisos, duração por tipo) + `src/context/providers/ToastProvider.tsx` (avisos no topo, cores do tema, `role=alert` para erro, botão fechar) montado em `app/layout.tsx`; os 3 `alert()` de `usePaintClipboard.ts` viraram `showToast` · `grep alert( src` vazio · 66 testes · visual não verificado no navegador.
- 2026-11-10 · T11 · README em português (módulos, tecnologias, como rodar com Supabase, scripts, estrutura de pastas, como o Paint guarda o desenho, atalhos); `.env.example` com as duas variáveis do Supabase e exceção `!.env.example` no `.gitignore` · todas as tarefas `[x]` exceto T7 `[!]` (migração a aplicar no Supabase).
