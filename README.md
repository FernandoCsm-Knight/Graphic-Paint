# Graphic Paint

Ambiente web para estudar e visualizar algoritmos de computação gráfica, grafos e autômatos. Cada usuário tem um painel com pastas e projetos salvos na nuvem (Supabase).

## Módulos

| Módulo | O que faz |
| --- | --- |
| **Paint** | Canvas com modo suave e modo pixelado (grade de pixels). Ferramentas de pincel (suave, duro, spray), borracha, balde (flood fill e scanline), formas (reta, seta, retângulo, círculo, elipse, polígonos, estrela), polígono livre, curvas de Bézier e B-spline, seleção com recorte, mover/girar/redimensionar, copiar/colar, desfazer/refazer. Rasterização de retas por **Bresenham** ou **DDA** e recorte por **Cohen-Sutherland**, **Liang-Barsky** ou **Sutherland-Hodgman**. |
| **Grafos** | Editor de grafos dirigidos ou não, com pesos. Executa passo a passo BFS, DFS, Dijkstra, Prim, Kruskal, ordenação topológica, caminho crítico, pontes e componentes fortemente conexos (Tarjan e Kosaraju). |
| **Autômatos** | Editor de AFN-λ e autômato de pilha, com estados inicial/final e simulação passo a passo de entradas. |

## Tecnologias

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- D3 (grafos e autômatos) e Canvas 2D (Paint)
- [Supabase](https://supabase.com) (autenticação + Postgres com RLS)
- Zod (validação) e Vitest (testes)

## Como rodar

Pré-requisitos: Node.js 20+ e um projeto no Supabase.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` a partir do exemplo e preencha com os dados do seu projeto Supabase (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

   | Variável | Descrição |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (publishable/anon) |

3. Crie o banco: no Supabase, abra o **SQL Editor** e execute `src/lib/sql/schema.sql` (banco novo). Em um banco que já existia, aplique só as migrações de `supabase/migrations/` em ordem — por exemplo a de salvamento atômico (`20261110000000_atomic_project_save.sql`).

4. Inicie o servidor de desenvolvimento e abra [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint em todo o projeto |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npm test` | Testes unitários (Vitest) |

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/              # login e cadastro
│   ├── (dashboard)/         # painel de pastas e projetos
│   ├── (workspace)/
│   │   ├── paint/           # módulo Paint
│   │   │   ├── _algorithms/ # Bresenham, DDA, recortes, preenchimentos, spray
│   │   │   ├── _shapes/     # formas e itens da cena (serializáveis)
│   │   │   ├── _hooks/      # canvas, cena/histórico, seleção, ferramentas
│   │   │   ├── _utils/      # persistência e replay da cena, histórico
│   │   │   └── _components/ # menus e configurações
│   │   └── (diagram)/
│   │       ├── graph/       # módulo de grafos (algoritmos em _algorithms/)
│   │       └── automaton/   # módulo de autômatos (AFN-λ, pilha)
│   ├── api/projects/        # rota de salvamento dos projetos
│   └── auth/                # rotas de login/logout/confirmação
├── components/              # componentes compartilhados (sidebar, menus, badges)
├── context/                 # contextos globais (auth, workspace, avisos/toast)
├── hooks/                   # hooks compartilhados (pan/zoom, arrastar, player)
├── lib/
│   ├── supabase/            # clientes e tipos do banco
│   ├── workspace/           # carregar/salvar projetos, autosave
│   └── sql/schema.sql       # esquema completo do banco
├── theme/                   # paletas e tema
└── utils/                   # utilitários (grade, atalhos de teclado)
supabase/migrations/         # migrações SQL incrementais
docs/                        # material de apoio (curvas paramétricas)
```

## Como o Paint guarda o desenho

- A cena é uma lista ordenada de itens (formas vetoriais, traços, preenchimentos, recortes). Cada item sabe se desenhar e é salvo como JSON em `paint_scene_items`.
- Para desfazer rápido, alguns traços guardam uma cópia da tela (checkpoint) — no máximo uma a cada 10 itens, com desfazer limitado a 50 passos.
- O salvamento é automático (cerca de 1 s após cada mudança). O selo no canto da tela mostra **Salvando… / Salvo / Erro ao salvar**, e o servidor grava tudo em uma única transação.

## Atalhos do Paint

| Atalho | Ação |
| --- | --- |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` ou `Ctrl+Shift+Z` | Refazer |
| `Ctrl+C` / `Ctrl+V` | Copiar / colar forma ou imagem |
| `Delete` / `Backspace` | Descartar a forma selecionada |
| `Enter` / `Esc` | Finalizar / cancelar polígono ou curva |

Os atalhos não interferem quando o foco está em um campo de texto.
