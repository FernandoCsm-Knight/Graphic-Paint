# Ralph Loop — Rodada 2: mecânicas de formas, seleção e bounding box

A rodada 1 (estrutura, histórico, persistência) está em `docs/ralph/rodada-1.md`.

## Como trabalhar (leia a cada iteração)

1. Rode `git status` e `git log --oneline -10` para ver o que já foi feito.
2. Trabalhe na branch `ralph/formas` (crie a partir da branch atual com `git switch -c ralph/formas` se não existir; senão `git switch ralph/formas`). Nunca trabalhe na `main`.
3. Escolha a **primeira tarefa com `[ ]`** abaixo. Faça **apenas essa tarefa** nesta iteração.
4. Implemente com a menor mudança que resolva a causa (não só o sintoma). Lógica nova deve ficar em funções/classes puras testáveis (ex.: `_utils/`), e os hooks só chamam essas funções.
5. Verifique: `npm run typecheck`, `npm run lint` (0 erros) e `npm test` precisam passar, e os "Critérios de pronto" da tarefa precisam ser verdadeiros.
6. Marque a tarefa como `[x]` e escreva uma linha em **Notas de progresso** (o que mudou, arquivos, o que não foi verificado).
7. Commit com mensagem curta em português: `fix(paint): <resumo>` (ou `feat:`/`test:`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
8. Tarefa bloqueada por decisão humana → marque `[!]`, explique em Notas de progresso e siga para a próxima.
9. Quando **todas** as tarefas estiverem `[x]` ou `[!]` e as verificações passarem, responda exatamente: `<promise>RODADA 2 CONCLUIDA</promise>`. Não diga isso antes.

Mapa rápido do código:
- Ferramentas e roteamento de eventos: `src/app/(workspace)/paint/_hooks/useDrawingHandlers.ts`
- Forma "pendente" (alças de mover/girar/redimensionar, confirmar/cancelar, Delete): `_hooks/usePendingPlacement.ts`
- Seleção de formas já colocadas (arrastar com botão direito): `_hooks/useMultiSelect.ts`
- Recorte retangular (ferramenta de seleção): `_hooks/useSelection.ts`
- Cena, desfazer/refazer: `_hooks/useScene.ts`, `_utils/sceneReplay.ts`, `_utils/sceneHistory.ts`
- Formas: `_shapes/*.ts` (base em `_shapes/ShapeTypes.ts`), fábrica em `_types/ShapeGenerator.ts`
- Bounding boxes: `_utils/boundingBox.ts`
- Persistência: `_utils/scenePersistence.ts`

---

## Tarefas

### [x] 1. Delete apaga de verdade formas já colocadas
**Bug (confirmado no código):** ao selecionar uma forma já colocada (arrastar com botão direito), `useMultiSelect` remove a forma da cena com `replaceScene` e entra no modo pendente com `onCancel: () => replaceScene(capturedScene)`. A tecla Delete/Backspace (`usePendingPlacement.ts`, listener de keydown) chama `cancelPending()`, que executa esse `onCancel` e **devolve a forma à cena**. Por isso só dá para apagar logo após criar (quando não há `onCancel`).
- Criar `deletePending()` separado de `cancelPending()`: descarta a forma pendente **sem** chamar `onCancel`, e registra a remoção no histórico (ver tarefa 2 — se a 2 ainda não existir, ao menos garanta que a forma não volta).
- Delete/Backspace chamam `deletePending()`; `cancelPending()` continua para "desistir da edição".
- Também vale para grupos (`ShapeGroup`) e para o recorte de imagem (`useSelection`): Delete remove o recorte (o buraco `ClearRectItem` fica).

**Pronto quando:** teste de unidade (sobre a lógica extraída) prova que, após selecionar uma forma existente e apertar Delete, a cena não contém mais a forma; Esc/cancelar continua restaurando.

### [x] 2. Editar forma já colocada vira uma operação de desfazer/refazer correta
**Bugs (confirmados no código):**
- Mover/girar/redimensionar uma forma existente: ela é removida via `replaceScene` (sem entrar no histórico) e reinserida no fim com `pushShape`. **Ctrl+Z depois disso apaga a forma** (o original já tinha sido removido).
- A forma é editada *in place* (`moveBy`, `rotateBy`, `resizeToBoundingBox`) e o `capturedScene` guarda o mesmo objeto: **cancelar não desfaz o movimento**.
- `replaceScene` limpa a pilha de refazer.
- A forma editada vai para o topo da pilha de desenho: se ela tinha sido parcialmente apagada (`ClearRectItem` depois dela), a parte apagada reaparece.

**O que fazer:**
- Ao levantar uma forma para edição, trabalhar numa **cópia** (ex.: `clone()` em `Shape`, pode usar a serialização existente) para que o original fique intacto até confirmar.
- Transformar o histórico de `useScene` em **operações**: `push` (como hoje) e `replace { index, before: SceneItem[], after: SceneItem[] }` (editar/excluir/agrupar/desagrupar). Desfazer/refazer aplicam a operação inversa. Ao confirmar a edição, a forma volta **na mesma posição** da pilha (mantém a ordem de desenho).
- Respeitar o limite de memória da rodada 1 (`MAX_UNDO_STEPS`, liberação de snapshots) e invalidar (liberar) checkpoints posteriores ao índice editado, para o replay não mostrar o "fantasma" da forma antiga.
- Extrair a lógica para `_utils/sceneOperations.ts` (puro) com testes.

**Pronto quando:** testes cobrem: mover existente + desfazer → forma volta à posição original; refazer → posição nova; excluir existente + desfazer → forma volta; cancelar edição → geometria original; ordem de desenho preservada.

### [x] 3. Selecionar forma com clique (hit-test pela geometria)
**Problema:** hoje a única forma de selecionar uma forma já colocada é arrastar um retângulo com o **botão direito** (pouco descobrível), e o teste é por interseção de **bounding box**: arrastar perto de uma reta diagonal ou dentro de um círculo vazio seleciona a forma mesmo sem tocá-la.
- Adicionar `hitTest(point, tolerance)` em `Shape` (contorno com tolerância `lineWidth/2 + 4px` em coordenadas de tela; interior quando `filled`). Implementar para reta/seta (distância ao segmento), polígonos/retângulos/estrela (distância às arestas), círculo/elipse (distância ao contorno), curvas (amostrar a curva), grupo (qualquer filho).
- Com a ferramenta de seleção ativa, **clique** sobre uma forma seleciona a de cima (última na cena); arrastar no vazio continua fazendo o recorte retangular atual. O arraste com botão direito continua funcionando, mas usando hit-test geométrico (retângulo intersecta o contorno), não só bbox.
- Mostrar dica no badge quando a ferramenta de seleção estiver ativa (ex.: "Clique numa forma para editar · Delete apaga · Esc cancela").

**Pronto quando:** testes de `hitTest` para cada tipo de forma (dentro da tolerância / fora); clique seleciona a forma de cima.

### [ ] 4. Formas antigas continuam selecionáveis depois de pincel/apagar
**Problema:** `getSelectableSceneSlice` corta a cena no último item raster (`isBarrier`): depois de **qualquer** pincelada ou balde, todas as formas anteriores ficam impossíveis de selecionar/apagar.
- Só o **balde** (`FillShape`) precisa ser barreira (o preenchimento depende do que está embaixo). Pincel (`FreeForm`) e `ClearRectItem` não devem bloquear a seleção.
- Ao levantar uma forma que está antes de checkpoints, liberar esses checkpoints (todos os itens são redesenháveis desde a rodada 1) para o replay não mostrar a forma antiga.

**Pronto quando:** testes: forma → pincelada → forma continua selecionável; forma → balde → forma não é selecionável; replay após remover a forma não a desenha.

### [ ] 5. Bounding box visual inclui espessura do traço e ponta da seta
**Problema:** `getBoundingBox()` de todas as formas usa só a geometria: traços grossos e a ponta da seta (`Arrow`, `headLength = 2 * lineWidth`) ficam **fora** da caixa de seleção/alças, e uma reta horizontal tem altura 0.
- Adicionar `getVisualBounds()` = bbox geométrica expandida por `lineWidth/2` (e pela ponta da seta; no modo pixelado, pela espessura em células conforme `drawPixel`). Usar no overlay de seleção, no hit-test de retângulo e em `getShapeDocBoundingBox`; manter a bbox geométrica para redimensionar.
- Garantir alças utilizáveis em formas de altura/largura 0 (reta horizontal/vertical).

**Pronto quando:** testes de `getVisualBounds` para reta grossa, seta e polígono; reta horizontal tem caixa com altura > 0.

### [ ] 6. Círculo pixelado: contorno e bounding box alinhados
**Problema:** no modo pixelado, `Circle` guarda centro/raio fracionários (centro = ponto médio do arraste, ex. 3.5) e só arredonda no desenho; `getBoundingBox()` usa os valores sem arredondar, então a caixa fica deslocada até meia célula do desenho. A espessura par (`drawPixel`, `lineWidth % 2 === 0`) também é assimétrica.
- Regra: no modo pixelado, a geometria guardada é sempre inteira (centro e raio arredondados na construção, no mover, no redimensionar). Revisar `Circle`, `Ellipse` e formas por pontos.
- Espessura par: deslocamento simétrico ou documentado; a bbox visual (tarefa 5) deve bater com as células pintadas.

**Pronto quando:** teste que rasteriza o círculo pixelado (capturando `fillRect`) e confere que todas as células pintadas ficam dentro da bbox visual e tocam suas bordas.

### [ ] 7. Rotação e caixa de transformação sobrevivem ao recarregar
**Problema:** a caixa orientada (`_transformBounds`/`_transformRotation`) só existe em memória (o clipboard salva, a cena não). Depois de recarregar, um retângulo girado volta com caixa alinhada aos eixos e **redimensionar distorce** a forma.
- Serializar `transformBounds` e `transformRotation` em `scenePersistence.ts` (opcional na leitura, compatível com projetos antigos) e restaurar com `restoreTransformFrame`.

**Pronto quando:** teste de ida e volta de um retângulo girado preserva `getOverlayBounds()` e `getVisualRotation()`.

### [ ] 8. Ajustes de interação do modo pendente
- **Esc** cancela a edição pendente (hoje não há atalho; só clique fora confirma).
- Clique fora confirma a forma **e** já inicia a próxima ação (hoje o clique é "engolido" e é preciso clicar de novo).
- `Line` e `Arrow` guardam referências aos pontos recebidos (`this.start = start`): clonar no construtor para evitar alterações acidentais.
- Respeitar `isTypingTarget` em tudo que for adicionado.

**Pronto quando:** testes para a clonagem; comportamento de Esc/clique fora descrito em Notas de progresso (não verificável sem navegador).

### [ ] 9. Formação consistente das formas pelo arraste
**Problema:** cada forma interpreta o arraste de um jeito: quadrado e elipse usam o arraste como **caixa** (canto a canto); círculo usa como **diâmetro** (direção qualquer); triângulo, estrela e polígonos usam o ponto inicial como **centro** e a distância como raio (e giram conforme a direção). O resultado parece aleatório para o usuário. Além disso, triângulo/estrela/polígonos arredondam os pontos para inteiro mesmo no modo suave.
- **Decisão humana necessária** antes de implementar. Proposta padrão: todas as formas regulares inscritas na caixa do arraste (canto a canto), Shift = manter proporção, Alt = desenhar a partir do centro; rotação só pela alça.
- Se não houver decisão registrada aqui, marque `[!]` e siga.

**Pronto quando:** decisão registrada; testes garantem que cada forma cabe na caixa do arraste.

---

## Notas de progresso

<!-- Uma linha por iteração: data · tarefa · o que mudou · pendências -->
- 2026-11-10 · T1 · `_utils/pendingActions.ts` (`resolvePendingAction` confirm/cancel/delete + `liftFromScene`); `usePendingPlacement.ts` ganhou `deletePending()` (nunca chama `onCancel`) e opção `onDelete`; Delete/Backspace usam `deletePending`; `useMultiSelect.ts` usa `liftFromScene` · 7 testes novos (73 no total) · verificado no navegador (modo livre): hexágono confirmado → seleção com botão direito → Delete → contorno some e não volta · a remoção ainda não entra no desfazer (tarefa 2).
- 2026-11-10 · T2 · histórico por operações em `_utils/sceneOperations.ts` (`SceneHistory`: `push`/`replace` antes-depois, `setTransient`, `reset`, desfazer/refazer, limite de 50 passos, libera checkpoints não alcançáveis e os posteriores a uma edição) + `replaceItemsInPlace`; `_utils/cloneSceneItem.ts` (cópia profunda); `useScene.ts` reescrito (`commitScene`, `setSceneTransient`, `resetScene`; estado transitório não dispara autosave); `useMultiSelect.ts` edita cópias e substitui no lugar (confirmar/apagar/agrupar/desagrupar = 1 passo); recorte em `useSelection.ts` (buraco transitório; confirmar/apagar = 1 passo; recorte pixelado = 1 passo); removidos `computeUndoFloor`/`releaseSnapshotsBeforeFloor` · 80 testes · verificado no navegador: mover existente → Ctrl+Z volta ao lugar → Ctrl+Y move de novo; Delete → Ctrl+Z traz de volta · colar grupo do clipboard ainda gera 1 passo por filho (menor).
- 2026-11-10 · T3 · `_utils/hitTest.ts` (contornos em pixels do documento por tipo: reta, seta com ponta via `Arrow.getHeadPoints()`, polígonos, círculo/elipse amostrados, Bézier/B-spline via `sampleBezier`/`sampleBSpline` exportados, imagem via `getRotatedCorners()` público, grupo; `hitTestShape` com tolerância + meia espessura e interior para preenchidas/imagens; `shapeIntersectsRect`; `findTopmostHit`); `useMultiSelect.ts` ganhou `beginEditing` + `selectAt` (clique, tolerância 6px de tela) e o arraste com botão direito usa o contorno; `useDrawingHandlers.ts`: com a ferramenta de seleção, clique numa forma edita, no vazio recorta; badge mostra a dica · 16 testes novos (96) · verificado no navegador: clique na borda do hexágono seleciona, Delete apaga, Ctrl+Z volta, clique no centro vazio não seleciona · imagem pixelada usa centro de célula para os cantos (aproximação).
