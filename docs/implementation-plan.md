# План реализации v1

Отчёт агента planner, 2026-10-25, с решениями основного агента по открытым вопросам (внизу). Версии пакетов сверены 2026-10-25: next 16.4.3, next-intl 4.14.9, @content-collections/next 0.2.11, tailwindcss 4.3.3, Node 24.15, npm 11.

## Обзор

Сначала вертикальный срез (M1): локальный сайт с маршрутами /ru /en /es и одним уроком s01 «Цикл агента», который проходит весь путь: импорт из апстрима, трансформации, MDX, Shiki, картинка, CodeFile, блок авторства. На /ru и /es урок показывается с плашкой «пока только на английском». Дальше волны параллельной работы.

## Ключевые технические решения

1. **content-collections** (адаптер `withContentCollections`, Standard Schema и zod 4, MDX через `@content-collections/mdx`, отдельная команда `content-collections build` в `predev` и `prebuild`). Запасной путь: `@next/mdx` за тонким загрузчиком `src/features/content/loader.ts`.
2. **Next 16**: `params` как Promise, `proxy.ts` вместо middleware, ESLint напрямую, Turbopack, `cacheComponents`.
3. **Импорт** парсит markdown источника обычным remark и сериализует с расширением MDX, чтобы экранировать `{`, `<` и HTML-комментарии (в README s01 есть `<!-- translation-sync -->`).
4. **Ассеты уроков** копируются при сборке в `public/content/` (в .gitignore), выводятся через `<img>` с размерами из viewBox; SVG чистятся при импорте.
5. **Свой inline-скрипт темы** около 30 строк, sha256 известен заранее для CSP.
6. **Сообщения next-intl по пространствам**: `messages/{locale}/{namespace}.json`, склейка в `request.ts`.
7. **npm 11, Node 24 LTS**, образ `node:24-alpine`.

## Вехи

| Веха | Условие |
|---|---|
| M0 | Репозиторий, версии сверены, шрифты выбраны |
| M1 | `npm run dev`, урок s01 на /en с кодом, SVG и авторством; /ru и /es с плашкой; e2e smoke и axe зелёные |
| M2 | CI зелёный, Docker-образ собирается и отвечает 200 на /api/health |
| M3 | 23 урока en в MDX, content:lint зелёный, повторный import --check даёт 0 изменений |
| M4 | Лендинг-табло, трек, урок, прогресс, квиз s01, видео, лицензии |
| M5 | SEO, axe-матрица, визуальные регрессии, Lighthouse 90+ |
| M6 | learn.vdmitriev.com отвечает 200 после ревью |

## Фаза 0. Подготовка

- 0.1 Сверка версий: сделано. 0.2 Шрифты: Sofia Sans Extra Condensed (табло) и Golos Text (текст), оба OFL, кириллица и латиница с диакритикой; через `@fontsource-variable/*` и `next/font/local`. 0.3 Репозиторий: git init, `.gitattributes` с `eol=lf`, `.editorconfig`, `.nvmrc`.

## Фаза 1. Каркас

- **1.1** create-next-app перенесён в корень. `next.config.ts`: `output: 'standalone'`, `poweredByHeader: false`, `images.unoptimized: true`. tsconfig strict + `noUncheckedIndexedAccess`. `src/styles/{tokens.css,global.css}`.
- **1.2 Тестовый контур до фич**: `vitest.config.ts` (projects jsdom и node), `tests/setup.ts`, `playwright.config.ts` (webServer: build+start в CI, dev локально), `tests/e2e/helpers/a11y.ts` с `expectNoA11yViolations` (wcag2a/aa, wcag21a/aa, wcag22aa, best-practice; critical и serious роняют). Пороги покрытия 80% на `src/features/**`, `src/lib/**`, `scripts/**`. Первый красный тест: smoke /en отдаёт 200, `html[lang=en]`, один h1.
- **1.3 next-intl**: `src/i18n/{routing,request,navigation}.ts`, `src/proxy.ts`, `messages/{ru,en,es}/{common,nav,landing,lesson,quiz,progress,a11y}.json`, типизация ключей, `src/app/[locale]/layout.tsx` с `setRequestLocale` и `generateStaticParams`. `localePrefix: 'always'`, `/` редиректит по cookie, затем Accept-Language, по умолчанию en. Тесты: одинаковые ключи в трёх языках, нет длинных тире; e2e `lang`, редирект, 404 для /de.
- **1.4 Layout и доступность**: SiteHeader, SiteFooter (mailto и Telegram на каждой странице), SkipLink, Announcer (`role="status"` в DOM заранее), RouteFocus (фокус на h1 после клиентской навигации), фокус 2px с контрастом 3:1, `scroll-padding-top`. Тесты: первый Tab на skip link, Enter в `main#content`, axe чистый.
- **1.5 Переключатели**: LanguageSwitcher (`nav aria-label`, ссылки с `lang` и `hreflang`, `aria-current`), тема как радиогруппа (система, светлая, тёмная), inline-скрипт до отрисовки, `@custom-variant dark (&:where([data-theme=dark] *))`. Иконки `@phosphor-icons/react/dist/ssr`, `aria-hidden`. Тесты: `resolveTheme` чистая функция, href переключателя, нет вспышки темы.
- **1.6 404 и ошибки**: `[locale]/not-found.tsx`, `[locale]/[...rest]/page.tsx`, глобальный `not-found.tsx`, `error.tsx`, `global-error.tsx`. Тест: /ru/nope даёт 404 с переведённым h1.
- **1.7 /api/health и env**: `force-dynamic`, `{status, version: GIT_SHA, time}`; `src/lib/env.ts` на zod.
- **1.8 ESLint, Prettier, typecheck**: jsx-a11y strict как error, запрет других наборов иконок, границы features (фича импортирует только `lib/`, `components/ui` и `index.ts` других фич). Контрольный файл `<img>` без alt роняет lint.
- **1.9 GitHub Actions CI**: install с кешем → lint, typecheck, unit с coverage → content:lint → build (проверка, что страницы SSG) → e2e и axe на `next start`.
- **1.10 Dockerfile и compose**: стадии deps → build (`ARG GIT_SHA`) → runner `node:24-alpine`, `USER node`, standalone, HEALTHCHECK на `/api/health`. compose: образ `ghcr.io/<owner>/ai-learning-site:${IMAGE_TAG}`, `127.0.0.1:3141:3000`, `read_only`, tmpfs `/tmp` и `/app/.next/cache`, `mem_limit 384m`, `cap_drop ALL`, `no-new-privileges`, `env_file .env.production`. Образ меньше 250 МБ.

## Фаза 2. Контент-пайплайн

- **2.1 Схемы frontmatter** (zod): `src/features/content/schema/{common,lesson,module,track,media}.ts`. Locale, AccessLevel, TranslationStatus, Attribution (минимум одна, `relation`), key `^[a-z0-9-]+(\.[a-z0-9-]+)+$`. Для ru и es обязательны `translation.status` и `sourceHash`. `access` наследуется от module.yaml.
- **2.2 content-collections и MDX**: коллекции tracks, modules, lessons (locale из пути, `compileMDX`, contentHash, оглавление, наследование access). Плагины `src/features/mdx/plugins/`: `remark-guard` (запрет import/export и JSX вне белого списка), `remark-code-file`, `remark-figure-assets` (вариант по языку с fallback на en), `rehype-heading-anchors`, shiki-config (две темы через CSS-переменные, `pre` с `tabindex=0`, `role=region`, `aria-label`). Загрузчик `getLesson('ru', track, slug)` без ru даёт `{lesson: en, isFallback: true}`. `scripts/content/assets.ts` копирует ассеты. Скрипты `predev`/`prebuild`.
- **2.3 Реестр и маппинг**: `content/sources/sources.yaml` (есть), `mapping/learn-claude-code.yaml` (17 записей: from, key, module, slug, order, assets, code, transforms), `mapping/muhammadusmangm.yaml` (from + alsoFrom), `mapping/awattar.yaml`, `licenses/*.txt`, `glossary.yaml` (есть). Тесты: уникальные key и slug, `use: link` в маппинге роняет, `from` не выходит за разрешённые пути.
- **2.4 Трансформации learn-claude-code** (`scripts/content/transforms/`): parse/stringify (remark-parse gfm → mdast → remark-mdx), strip-lang-bar, strip-nav-chain, strip-html-comments, extract-title (H1 «s01: The Agent Loop — …» → title без тире, H1 убирается), rewrite-images (`images/x.en.svg` → `<Figure>`), inline-codefile, rewrite-links (`../sNN_x/` → внутренняя ссылка, прочее → GitHub на commit), strip-next-arrow, sanitize-svg; для гайдов mkdocs-admonitions → Callout. Golden-тест на реальном README s01.
- **2.5 Импорт** (`scripts/content/import/`): cli (parseArgs: `--check`, `--apply`, `--source`, `--only`, `--from-local`), fetch-source (`git clone --filter=blob:none` в `.cache/upstream`), hash (sha256 после LF), compare (NEW/CHANGED/REMOVED/UNCHANGED), diff-report (терминал и `content/reports/import-<date>.md`), merge (трёхсторонний: base = трансформация старой копии из `_upstream`, ours = текущий en.mdx, theirs = трансформация нового) → `en.mdx.proposed`, apply, lock. Коды: `--check` 1 при изменениях, конфликт 2. Тесты: идемпотентность, слияние без конфликта, конфликт с маркерами, отказ `use: link`.
- **2.6 content:lint**: frontmatter по zod; attribution на adapt/quote; одинаковые slug; битые ссылки; alt не похож на имя файла; сырой mermaid запрещён; DocQuote с href на code.claude.com до 80 слов, в ru/es с `lang="en"`; quiz согласован; длинное тире предупреждает; n-граммы против доки (хранить только хеши 8-грамм).
- **2.7 content:status**: матрица урок × язык, stale по `sourceHash`.
- **2.8 Структура трека** (23 урока):

| Модуль | Уроки |
|---|---|
| 01 Как пользоваться Claude Code (PUBLIC) | 01 Установка · 02 Первая задача · 03 CLAUDE.md · 04 Режимы разрешений · 05 Практика: лендинг · 06 Контекст, стоимость и частые ошибки |
| 02 Один агент: цикл, инструменты, контроль | s01 agent_loop · s02 tool_use · s03 permission · s04 hooks · s05 todo_write · s06 subagent |
| 03 Контекст и долгие задачи | s07 skill_loading · s08 context_compact · s09 memory · s10 task_system · s11 background_tasks |
| 04 Автономия и команды агентов | s12 cron_scheduler · s13 agent_teams · s14 mcp_plugin · s15 integrated_harness · s16 workflow_runtime · s17 goal_loop |

- **2.9 content:diagrams** отложен до первого урока с Mermaid.

## Фаза 3. Страницы

Перед кодом UI: impeccable и design-taste-frontend уже загружены, craft-floor прочитан. Перед сдачей `/impeccable audit` и `polish`.

- **3.1 Токены и контраст**: `src/styles/tokens.css` (`@theme`: board #23262b, rail #9ea3a8, flap #ece6d6, ink #15171a, amber #e0a526, «бумага» для уроков в двух темах), `src/app/fonts.ts`, `scripts/design/contrast.ts`, тест всех пар текст/фон и токенов тем Shiki на 4.5:1. Известные провалы эскиза: `#6d7177` и `#8c9096` на доске, `#5b5a55` на `#cfc9b9`.
- **3.2 Компоненты табло** (`src/features/board/`): FlapLetter (щель через `::after`, углы 3px), FlapText (пластины `aria-hidden` + текст для скринридера, режим `strip` на узких экранах), FlightRow (`li > a` на всю строку), LanguageFlag, Rail, `flip.ts` (чистая функция кадров и задержек), `useFlipAnimation.ts` (Web Animations API, rotateX двух половин, до 1.5 с), `useReducedMotion`. Адаптив: ниже 1024 пластины меньше через container queries, ниже 640 название полосой.
- **3.3 Лендинг**: `BoardHero`, `DeparturesTable` (6 первых уроков из индекса), `PracticeSection`, `ArrivedProjects`, `SourcesSection`, `ContactSection`. Смена языка: строки для трёх языков пропсами, клик по флагу запускает перекидывание, затем `router.push`; без JS обычная ссылка; при reduced motion переход сразу. Лендинг всегда тёмный, переключатель темы влияет на страницы чтения.
- **3.4 Список треков**, **3.5 Страница трека** («бумага расписания», пластина как метка статуса, статус из прогресса через клиентский остров), **3.6 Страница урока** (`article` до 70ch, оглавление, крошки, назад/вперёд, плашка fallback с `lang="en"`).
- **3.7 MDX-компоненты**: белый список; CodeBlock (`figure`/`figcaption`) и CopyButton (объявляет «Скопировано»); CodeFile; Callout (`aside role="note"` с префиксом); DocQuote (href обязателен в типе и runtime, `blockquote lang="en" cite`); Diagram (два SVG по теме, текст в `details`); Figure; Attribution в layout урока; Video; Quiz.
- **3.8 Лицензии** и заявление о доступности.
- **3.9 Видео и вебинары**: `content/media/{videos,webinars}.yaml`, `providers.ts` с белым списком (youtube-nocookie, Rutube, VK), VideoFacade (постер, `button` «Воспроизвести видео: название», iframe по клику с `title`), WebinarList с `<time datetime>`, деление на прошедшие и будущие на клиенте, честное пустое состояние.

## Фаза 4. Прогресс в браузере

- **4.1 Хранилище** (`src/features/progress/`): schema (`schemaVersion`, `lessons[key] = {startedAt, completedAt, quiz, practiceDoneAt}`), storage (ключ `learn.vdmitriev.progress`, try/catch, запасной режим в памяти), migrations, reducers без мутаций, store на `useSyncExternalStore` с событием `storage`. Тесты на `Object.freeze`, миграции, битый JSON, QuotaExceeded, другая вкладка.
- **4.2 Отметка урока** (`aria-pressed`, объявление), **4.3 «Мой прогресс»** (нативный `<progress>`, ICU-плюрализация, предупреждение про браузер), **4.4 Экспорт и импорт JSON** (до 256 КБ, zod, слияние по времени, двухшаговый сброс), **4.5 Самоотметка практики** и контракт будущего `POST /api/progress/import`.

## Фаза 5. Квизы

- **5.1 quiz.json**: `lesson`, `version`, вопросы `{id, stage, correct, i18n: {en, ru?, es?}}`, одинаковое число вариантов, JSON Schema через `z.toJSONSchema`.
- **5.2 grade.ts** чистая функция с `PASS_RATIO`.
- **5.3 Компонент**: по одному вопросу, `form > fieldset > legend`, нативные radio, «Вопрос 2 из 6», результат в заранее отрисованный `role="status"`, пояснение через `aria-describedby`, фокус на `legend` после «Далее», ответы не сбрасываются, попытка в хранилище. Непереведённый квиз на en с `lang="en"`.
- **5.4** Квиз для s01 в срезе, остальные 22 позже.

## Фаза 6. SEO и i18n

- **6.1** `generateMetadata`: `metadataBase` из env, `alternates.languages` только для machine/reviewed плюс `x-default`. **6.2** sitemap без заглушек, robots. **6.3** Плашка непереведённого урока: `noindex`, canonical на en, `article[lang=en]`. **6.4** OG через next/og (нужен ttf с кириллицей), запас: статичные PNG.

## Фаза 7. Качество и деплой

- **7.1 axe-матрица**: 11 шаблонов × 3 языка × 2 темы × 2 вьюпорта; в PR подмножество, ночью полная. **7.2** Поведенческие a11y-тесты. **7.3** Визуальные регрессии 320/768/1024/1440 × 2 темы, эталоны только из Linux-образа Playwright. **7.4** Lighthouse CI: performance 0.9, accessibility 1, CLS < 0.1.
- **7.5 CSP**: `frame-src` только видеоплатформы, хеш скрипта темы; решение по inline-скриптам RSC на шаге.
- **7.6 Release**: push в main → build-push в GHCR (теги `sha-<short>` и `latest`, provenance, SBOM). **7.7 VPS2**: DNS `learn` → 31.70.101.86 через API Cloudflare, nginx-конфиг в RO bind-mount и `docker restart`, `/srv/learn/{compose.yaml,.env.production}`, `docker compose pull && up -d`, откат через `IMAGE_TAG`, проверка check_http.py. **7.8** Ревью: code-reviewer, typescript-reviewer, security-reviewer, impeccable audit и polish, DESIGN.md, ручной проход NVDA. **7.9** Бэкапов БД нет, контент в git, образы в GHCR.

## Волны

- **Волна 0** (основной агент): 0.x → 1.1 → 1.2, все пакеты ставятся сразу.
- **Волна 1, M1**: основной 1.3 → 1.4; субагент A: 2.1, 2.4, затем 2.3 для s01; сведение 2.2 → 2.5 → 3.6 и 3.7 минимально → fallback.
- **Волна 2** в worktree: A пайплайн (2.3, 2.5, 2.6, 2.7); B инфраструктура (1.5–1.10, 7.6); C дизайн (3.1, 3.2); D логика (4.1, 5.1, 5.2).
- **Волна 3**: A 2.8 (23 урока); C 3.3; B 3.4, 3.5; D 4.2–4.5, 5.3, 5.4; E остаток 3.7, 3.9.
- **Волна 4**: фаза 6, 3.8, квизы, e2e-runner 7.1–7.4.
- **Волна 5**: 7.5 → 7.8 → 7.6 → 7.7 → 7.9.
- Перевод ru/es после «да» по бюджету.

Правила владения: у каждого агента своя папка `src/features/<feature>` и свои пространства сообщений; `next.config.ts`, `content-collections.ts`, `package.json` правит только основной агент.

## Решения по открытым вопросам планировщика (основной агент, 2026-10-25)

| # | Вопрос | Решение |
|---|---|---|
| 1 | content-collections и Turbopack | CLI в `predev`/`prebuild`, плагин проверяется на 2.2 |
| 2 | CSP и inline-скрипты RSC | Решается на 7.5: сначала проверить `experimental.sri` в Next 16, иначе `script-src 'self' 'unsafe-inline'` при строгих остальных директивах |
| 3 | Шрифт табло | Sofia Sans Extra Condensed; текст Golos Text |
| 4 | Темы на лендинге | Лендинг всегда тёмный, переключатель влияет на страницы чтения |
| 5 | Модуль 1 | 6 уроков, всего 23; табло показывает реальные данные индекса |
| 6 | Квизы модуля 1 | Да, 23 квиза в итоге; в v1 минимум s01 |
| 7 | Почта для контакта | Спросить заказчика |
| 8 | Видимость репо и пакета | Спросить заказчика |
| 9 | Cloudflare proxy и TLS | Спросить заказчика; по умолчанию только DNS и certbot на VPS2, как у других сайтов |
| 10 | Порт на VPS2 | 3141, проверить `ss -ltn` перед деплоем |
| 11 | Node в образе | 24 |
| 12 | Менеджер пакетов | npm |
| 13 | Практика | Отдельный пакет работ после M4: репозитории-шаблоны в GitHub заказчика; ученика предупреждать, что Try It из s01–s17 требует ключ Anthropic API |
| 14 | n-граммы | Хранить только хеши 8-грамм |
| 15 | SVG с текстом | В v1 en-версия с переведённым alt |
| 16 | Скриншоты проектов | Те же, что на vdmitriev.com (уже публичные) |
| 17 | Пустые вебинары | Честное пустое состояние, пункт меню остаётся |
| 18 | Янтарный следующий урок | По умолчанию урок 01, клиентский остров меняет статус по прогрессу без сдвига раскладки |
| 19 | Аналитика | Нет в v1 |
| 20 | Эталоны визуальных регрессий | Только Linux-контейнер, Windows-прогоны не обновляют |
