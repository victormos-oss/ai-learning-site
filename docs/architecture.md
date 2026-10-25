# Архитектура сайта обучения AI (v1)

## Поправки после решений заказчика (2026-10-25, вечер)

Заказчик решил запускать v1 **без форм и регистрации** из-за 152-ФЗ (VPS2 за рубежом). Следствия для разделов ниже:

| Раздел | Что меняется в v1 | Что остаётся для v2 |
|---|---|---|
| 1, 2 Контент | Без изменений. Уровни доступа в frontmatter размечаются сразу, но в v1 не применяются: весь контент открыт | Фримиум включается флагом |
| 3 Структура | `features/auth`, `premium`, `leads` не создаются; `features/progress` работает с localStorage; `app/admin` и `api/auth` нет; добавляется `api/health` | Папки добавляются по этой же схеме |
| 4 Схема БД | PostgreSQL в v1 не поднимается. Индекс контента живёт в `.content/index.json`, который генерирует сборка. Схема Prisma сохраняется как проект для v2 | Prisma + PostgreSQL в РФ или другой вариант по 152-ФЗ |
| 5 i18n, 6 MDX | Без изменений. Квиз проверяется на клиенте: контент открыт, скрывать правильные ответы незачем. `correct` остаётся в quiz.json, компонент получает его целиком | Серверная проверка при появлении закрытого контента |
| 7 Auth | Нет | Magic link + GitHub по плану ниже |
| 8 Практика | Шаблон-репозиторий и локальный детерминированный чекер остаются. Токенов и endpoint submit нет: ученик отмечает выполнение сам, отметка в localStorage | Вариант A с токенами, затем B |
| 9 Деплой | Сборка в GitHub Actions → GHCR, на VPS2 `docker compose pull && up -d`. Сервисы `db`, `migrate`, `backup` не нужны, остаётся `app`. Домен learn.vdmitriev.com | Добавляются db, migrate, backup |
| Первый модуль | Собирается из гайдов «как пользоваться Claude Code» (MuhammadUsmanGM getting-started, claude-md-guide, permission-modes и др.) и цитат доки. s01–s17 идут модулями 2–4 | |

Прогресс в браузере: ключ localStorage с версией схемы, экспорт и импорт JSON-файлом, предупреждение о потере при смене браузера. При появлении аккаунтов в v2 локальный прогресс импортируется в БД при первом входе.

---

Отчёт агента architect, 2026-10-25. Основа: requirements.md, brief.md, README источников, LESSON_TEMPLATE.md и quiz.json из ai-engineering-from-scratch, README s01 из learn-claude-code, список guides, course-structure.json, оглавление официальной доки.

## Находки в источниках, которые влияют на проект

1. **В learn-claude-code две нумерации.** Папки `s01_agent_loop … s17_agent_loop` (17 секций) не совпадают со старыми `docs/{en,zh,ja}/s01…s12` и `agents/*.py`. Импортировать только из папок `sNN_*`, папки `docs/` и `agents/` пропускать.
2. **learn-claude-code учит собирать свой агент, похожий на Claude Code** (Python поверх API). Как пользоваться самим Claude Code, там не объясняется. Для менеджеров из аудитории бесплатный первый модуль лучше собрать из `guides/getting-started.md`, `claude-md-guide.md`, `permission-modes.md` и цитат официальной доки, а s01–s17 поставить следом. Решение по продукту, нужно подтверждение заказчика.
3. **В README навигационный мусор**: строка языков и цепочка `s01 → s02 → …`. Импорт должен это вырезать.
4. **SVG-картинки локализованы** (`agent-loop.en.svg`, `.ja.svg`), надписи текстом внутри SVG. Для ru/es SVG нужно переводить отдельно.
5. **Mermaid**: в s01–s17 почти нет, в гайдах 2 диаграммы (decision-trees.md), во второй версии массово в phase 14 (24 урока). Для v2 рендер Mermaid обязателен.
6. **quiz.json** у rohitg00: 6 вопросов (1 pre, 3 check, 2 post), поля `stage, question, options, correct, explanation`, только en. База нашего формата с локализованными строками.

---

## 1. Модель контента

**Рекомендация: тексты уроков лежат MDX-файлами в репозитории, в БД только индекс** (стабильный ключ, порядок, доступ, хеши, заголовки). Источник правды для текста: файлы. Для пользовательских данных: БД.

| Критерий | MDX в репо + индекс в БД | Контент в БД |
|---|---|---|
| Три языка | `en.mdx`, `ru.mdx`, `es.mdx` в папке урока, пропуски видны | Таблица переводов, пропуски видны только запросом |
| Повторяемый импорт с diff | `git diff` из коробки, трёхсторонний merge | Свой diff и версии |
| Вычитка перевода | Через PR | Нужна админка с редактором |
| Lighthouse 90+ | Бесплатные уроки собираются статически | Рендер на запрос или ISR |
| Безопасность | MDX компилируется при сборке | `evaluate` MDX из БД: риск XSS и RCE |
| Правка без деплоя | Нет | Да |
| Объём v2 (542 × 3) | ~1600 файлов, сборка дольше, терпимо | Масштабируется лучше |

Правка без деплоя в v1 не нужна: контент меняет один человек через Claude Code.

**Ключевое правило: у урока есть стабильный `key`** (`cc-zero.agent-loop`), не зависящий от slug, языка и модуля. Progress и QuizAttempt ссылаются на `Lesson.id`, привязанный к `key`. Удалённый из контента урок не удаляется из БД, а получает `archivedAt`.

| Данные | Где |
|---|---|
| Текст урока, frontmatter, код, картинки | MDX и файлы в `content/` |
| Тексты квизов (3 языка) и правильные ответы | `quiz.json` в папке урока |
| key, порядок, доступ, хеши, статус перевода, заголовок и summary | БД (кеш, заполняет `content:sync`) |
| Пользователи, прогресс, попытки, лиды, гранты, промокоды | только БД |
| Вебинары | БД, тексты в WebinarTranslation |
| Строки интерфейса | `messages/{ru,en,es}.json` |

**Frontmatter урока:**

```yaml
key: cc-zero.agent-loop          # стабильный, одинаковый во всех языках
slug: agent-loop                 # одинаковый во всех языках
title: "Цикл агента"
summary: "..."
order: 1
access: PUBLIC                   # PUBLIC | ACCOUNT | PREMIUM, обычно наследуется от module.yaml
estimatedMinutes: 20
type: learn                      # learn | build | practice
quiz: true
practice: cc-zero.hooks-block-rm # ключ задания, если есть
translation:
  status: reviewed               # machine | reviewed | stale
  sourceHash: "sha256:..."       # хеш en.mdx, с которого сделан перевод
attribution:
  - source: shareAI-lab/learn-claude-code
    path: s01_agent_loop/README.md
    commit: "<sha>"
    license: MIT
    authors: "shareAI-lab contributors"
    url: "https://github.com/shareAI-lab/learn-claude-code/tree/<sha>/s01_agent_loop"
    relation: adapted            # adapted | translated | quoted | original
```

---

## 2. Контент-пайплайн

### Три слоя

```
Апстрим (чужой git) -> content/_upstream/ (точная копия, en) -> content/tracks/.../en.mdx (наша адаптация) -> ru.mdx, es.mdx
```

Каждый слой знает хеш предыдущего, поэтому видно, что устарело.

### Файлы пайплайна

| Файл | Назначение |
|---|---|
| `content/sources/sources.yaml` | Реестр источников: url, путь, лицензия, автор, копирайт, разрешённое использование (`adapt` / `quote` / `link`) |
| `content/sources/mapping/<source>.yaml` | Соответствие «файл источника → ключ урока» и трансформации |
| `content/sources/sources.lock.json` | Закреплённый commit и sha256 каждого файла на момент apply |
| `content/_upstream/<source>/<path>` | Точная копия апстрима на закреплённом commit (клоны shallow, старого commit может не быть) |
| `content/glossary.yaml` | Термины en → ru/es и непереводимые слова (hook, subagent, MCP) |
| `content/reports/import-<date>.md` | Отчёт прогона, коммитится |

### Команды (`scripts/content/`)

| Команда | Что делает |
|---|---|
| `content:import --check` | `git fetch` источника, сравнение sha256 с lock. Таблица NEW / CHANGED / REMOVED / UNCHANGED и diff. Ничего не меняет, код 1 при изменениях |
| `content:import --apply [--source X]` | Обновляет `_upstream` и lock. Новые уроки: черновик `en.mdx` через трансформации. Изменённые: трёхсторонний merge (`git merge-file`) в `en.mdx.proposed`, метка `needs-review` |
| `content:translate --locale ru --lesson <key>` | Платная, только после «да». Защищает код, JSX, URL, ключи; переводит подписи Mermaid; подставляет глоссарий. Пишет `ru.mdx` со статусом `machine` |
| `content:lint` | Frontmatter по zod; все языки у опубликованных или явный fallback; квизы согласованы; битые ссылки; attribution у каждого урока; лимит цитат Anthropic |
| `content:status` | Матрица «урок × язык»: reviewed / machine / stale / missing |
| `content:diagrams` | Пререндер Mermaid в SVG |
| `content:sync` | После миграций: upsert индекса из `.content/index.json` в Track/Module/Lesson, `archivedAt` для исчезнувших |

### Трансформации (модуль на каждую)

Вырезать строку языков и навигацию; переписать `images/x.en.svg` на ассет урока с выбором по языку; заменить относительные ссылки на внутренние; подставить `code.py` как `<CodeFile src="code.py" />`; привести заголовки к шаблону; обернуть Mermaid. Для rohitg00 (v2) отдельный маппер.

### Квизы

Один `quiz.json` на урок: правильный ответ один раз, тексты по языкам.

```json
{ "lesson": "cc-zero.agent-loop", "version": 2,
  "questions": [ { "id": "q1", "stage": "pre", "correct": 0,
    "i18n": { "en": { "question": "...", "options": ["..."], "explanation": "..." },
              "ru": { }, "es": { } } } ] }
```

При изменении вопросов `version` растёт. QuizAttempt хранит версию.

### Авторство и лицензии

- `<Attribution>` выводится автоматически из frontmatter на каждом уроке.
- Страница `/[locale]/licenses` с текстами MIT и копирайтами каждого источника. MIT требует сохранять уведомление, одной ссылки мало.
- Дока Anthropic только через `<DocQuote href>`. Линтер ограничивает длину цитаты (до 80 слов) и долю цитат; проверка по n-граммам ловит перепечатки без DocQuote.
- У carlvellotti и awesome-claude-code `use: link`, импорт из них запрещён.

---

## 3. Структура проекта

```
ai-learning-site/
  content/
    sources/            sources.yaml, sources.lock.json, mapping/*.yaml
    _upstream/
    glossary.yaml
    reports/
    tracks/
      claude-code-zero/
        track.yaml
        modules/
          01-getting-started/
            module.yaml
            lessons/
              01-agent-loop/
                en.mdx  ru.mdx  es.mdx
                quiz.json
                code.py
                assets/             agent-loop.en.svg, .ru.svg, .es.svg
                diagrams/           <hash>.light.svg, <hash>.dark.svg
    practice/
      cc-zero.hooks-block-rm.yaml
    pages/                          landing и about на 3 языках
  messages/             ru.json, en.json, es.json
  prisma/               schema.prisma, migrations/
  scripts/
    content/            import/, transforms/, translate/, lint/, sync/, diagrams/
    ops/                backup.sh, restore.sh
  src/
    app/
      [locale]/
        layout.tsx
        page.tsx                          лендинг
        tracks/page.tsx
        tracks/[track]/page.tsx
        tracks/[track]/[lesson]/page.tsx  модуль в URL не входит
        videos/page.tsx
        webinars/page.tsx
        account/page.tsx
        login/page.tsx
        licenses/page.tsx
      admin/                              гранты, промокоды, вебинары, лиды
      api/
        auth/[...nextauth]/route.ts
        practice/submit/route.ts
        health/route.ts
      sitemap.ts
      robots.ts
    features/
      content/        loader.ts, access.ts (canAccess), lesson-nav.ts, types.ts
      mdx/            components/ (Callout, CodeFile, DocQuote, Video, Quiz, Diagram, Attribution), plugins/
      quiz/           actions.ts, grade.ts, QuizClient.tsx
      progress/       actions.ts, queries.ts, ProgressBar.tsx
      auth/           config.ts, guards.ts
      premium/        grants.ts, promo.ts, actions.ts
      leads/          actions.ts, LeadForm.tsx, ConsultingForm.tsx, consent.ts
      practice/       tokens.ts, submit.ts, PracticeCard.tsx
      webinars/       queries.ts, WebinarList.tsx
      seo/            metadata.ts, jsonld.ts
    i18n/             routing.ts, request.ts, navigation.ts
    lib/              db.ts, env.ts (zod), rate-limit.ts, hash.ts
    components/ui/
    styles/           tokens.css, typography.css, global.css
  proxy.ts            (или middleware.ts) только i18n-маршрутизация
  content.config.ts
  docker/             Dockerfile, compose.yaml, nginx-site.conf
  tests/              unit/, integration/, e2e/
```

Правила: файлы до 400 строк; логика в `features/*`, страницы тонкие; проверка доступа в `features/content/access.ts`, вызывается в серверном компоненте и server actions, **не в middleware** (его можно обойти, пример CVE-2025-29927).

---

## 4. Схема БД Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Locale { ru en es }
enum Role { USER ADMIN }
enum AccessLevel { PUBLIC ACCOUNT PREMIUM }
enum ProgressStatus { STARTED COMPLETED }
enum TranslationStatus { MISSING MACHINE REVIEWED STALE }
enum LeadKind { NEWSLETTER CONSULTING }
enum GrantScope { ALL TRACK }
enum WebinarKind { WEBINAR VIDEO }
enum WebinarStatus { SCHEDULED LIVE RECORDED CANCELLED }
enum VideoProvider { YOUTUBE RUTUBE VK OTHER }
enum SubmissionStatus { PASSED FAILED }

// ---------- Auth.js ----------

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  role          Role      @default(USER)
  locale        Locale    @default(en)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts       Account[]
  sessions       Session[]
  progress       Progress[]
  quizAttempts   QuizAttempt[]
  grants         PremiumGrant[]       @relation("GrantRecipient")
  grantsIssued   PremiumGrant[]       @relation("GrantIssuer")
  practiceTokens PracticeToken[]
  submissions    PracticeSubmission[]
  leads          Lead[]
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@index([userId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

// ---------- Индекс контента (заполняет content:sync) ----------

model Track {
  id          String    @id @default(cuid())
  key         String    @unique
  slug        String    @unique
  order       Int
  isPublished Boolean   @default(false)
  contentHash String
  syncedAt    DateTime
  archivedAt  DateTime?

  translations TrackTranslation[]
  modules      Module[]
  lessons      Lesson[]
  grants       PremiumGrant[]
  promoCodes   PromoCode[]

  @@index([isPublished, order])
}

model TrackTranslation {
  trackId     String
  locale      Locale
  title       String
  description String?
  status      TranslationStatus @default(MISSING)

  track Track @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@id([trackId, locale])
}

model Module {
  id          String      @id @default(cuid())
  key         String      @unique
  trackId     String
  order       Int
  access      AccessLevel @default(ACCOUNT)
  isPublished Boolean     @default(false)
  archivedAt  DateTime?

  track        Track               @relation(fields: [trackId], references: [id], onDelete: Cascade)
  translations ModuleTranslation[]
  lessons      Lesson[]

  @@index([trackId, order])
}

model ModuleTranslation {
  moduleId String
  locale   Locale
  title    String
  summary  String?

  module Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@id([moduleId, locale])
}

model Lesson {
  id               String      @id @default(cuid())
  key              String      @unique
  trackId          String
  moduleId         String
  slug             String
  order            Int
  access           AccessLevel
  estimatedMinutes Int?
  hasQuiz          Boolean     @default(false)
  quizVersion      Int?
  contentHash      String
  upstreamSource   String?
  upstreamCommit   String?
  isPublished      Boolean     @default(false)
  archivedAt       DateTime?
  syncedAt         DateTime

  track        Track                @relation(fields: [trackId], references: [id], onDelete: Cascade)
  module       Module               @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  translations LessonTranslation[]
  progress     Progress[]
  quizAttempts QuizAttempt[]
  assignments  PracticeAssignment[]

  @@unique([trackId, slug])
  @@index([moduleId, order])
  @@index([trackId, isPublished])
}

model LessonTranslation {
  lessonId    String
  locale      Locale
  title       String
  summary     String?
  status      TranslationStatus
  sourceHash  String?
  contentHash String?

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@id([lessonId, locale])
  @@index([locale, status])
}

// ---------- Обучение ----------

model Progress {
  id          String         @id @default(cuid())
  userId      String
  lessonId    String
  status      ProgressStatus @default(STARTED)
  startedAt   DateTime       @default(now())
  completedAt DateTime?
  updatedAt   DateTime       @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Restrict)

  @@unique([userId, lessonId])
  @@index([lessonId, status])
}

model QuizAttempt {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  quizVersion Int
  locale      Locale
  answers     Json
  score       Int
  total       Int
  passed      Boolean
  createdAt   DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Restrict)

  @@index([userId, lessonId, createdAt])
}

// ---------- Премиум ----------

model PremiumGrant {
  id          String     @id @default(cuid())
  userId      String
  scope       GrantScope @default(ALL)
  trackId     String?
  reason      String?
  grantedById String?
  promoCodeId String?
  startsAt    DateTime   @default(now())
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdAt   DateTime   @default(now())

  user      User       @relation("GrantRecipient", fields: [userId], references: [id], onDelete: Cascade)
  grantedBy User?      @relation("GrantIssuer", fields: [grantedById], references: [id], onDelete: SetNull)
  track     Track?     @relation(fields: [trackId], references: [id], onDelete: Cascade)
  promoCode PromoCode? @relation(fields: [promoCodeId], references: [id], onDelete: SetNull)

  @@unique([userId, promoCodeId])
  @@index([userId, revokedAt, expiresAt])
}

model PromoCode {
  id             String     @id @default(cuid())
  code           String     @unique
  scope          GrantScope @default(ALL)
  trackId        String?
  grantDays      Int?
  maxRedemptions Int?
  redeemedCount  Int        @default(0)
  expiresAt      DateTime?
  isActive       Boolean    @default(true)
  createdAt      DateTime   @default(now())

  track  Track?         @relation(fields: [trackId], references: [id], onDelete: Cascade)
  grants PremiumGrant[]
}

// ---------- Лиды ----------

model Lead {
  id               String    @id @default(cuid())
  email            String
  kind             LeadKind
  name             String?
  company          String?
  message          String?
  locale           Locale
  sourcePath       String
  consentAt        DateTime
  consentVersion   String
  confirmTokenHash String?   @unique
  confirmedAt      DateTime?
  unsubscribedAt   DateTime?
  ipHash           String?
  userId           String?
  createdAt        DateTime  @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([email, kind])
  @@index([kind, createdAt])
}

// ---------- Видео и вебинары ----------

model Webinar {
  id              String         @id @default(cuid())
  slug            String         @unique
  kind            WebinarKind    @default(WEBINAR)
  status          WebinarStatus  @default(SCHEDULED)
  startsAt        DateTime?
  durationMin     Int?
  timezone        String         @default("Europe/Moscow")
  provider        VideoProvider?
  videoId         String?
  registrationUrl String?
  access          AccessLevel    @default(PUBLIC)
  isPublished     Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  translations WebinarTranslation[]

  @@index([isPublished, status, startsAt])
}

model WebinarTranslation {
  webinarId   String
  locale      Locale
  title       String
  description String?

  webinar Webinar @relation(fields: [webinarId], references: [id], onDelete: Cascade)

  @@id([webinarId, locale])
}

// ---------- Практика ----------

model PracticeAssignment {
  id           String  @id @default(cuid())
  key          String  @unique
  lessonId     String
  templateRepo String
  checkVersion Int
  isPublished  Boolean @default(false)

  lesson      Lesson               @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  tokens      PracticeToken[]
  submissions PracticeSubmission[]
}

model PracticeToken {
  id           String    @id @default(cuid())
  userId       String
  assignmentId String
  tokenHash    String    @unique
  expiresAt    DateTime
  usedAt       DateTime?
  createdAt    DateTime  @default(now())

  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignment PracticeAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

  @@index([userId, assignmentId])
}

model PracticeSubmission {
  id           String           @id @default(cuid())
  userId       String
  assignmentId String
  status       SubmissionStatus
  checkVersion Int
  report       Json
  createdAt    DateTime         @default(now())

  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignment PracticeAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

  @@index([userId, assignmentId, createdAt])
}
```

Замечания:
- Премиум не булево поле, а вывод из активного PremiumGrant (`revokedAt` пуст, `startsAt <= now`, `expiresAt` пуст или в будущем). Есть аудит, срок, отзыв; биллинг v2 будет создавать гранты.
- `onDelete: Restrict` на Progress и QuizAttempt к Lesson: урок не удаляется, только архивируется.
- `redeemedCount` и создание гранта в одной транзакции с условием `redeemedCount < maxRedemptions`.
- В Prisma 6.x/7 генератор по умолчанию меняется на `prisma-client` с явным `output`, сверить при старте.

---

## 5. i18n

**Рекомендация: next-intl.** Маршрутизация App Router, серверные компоненты, ICU-плюрализация (в русском три формы), типизированные ключи.

| Решение | Выбор |
|---|---|
| Маршруты | `/ru/...`, `/en/...`, `/es/...`, `localePrefix: 'always'`; `/` редиректит по cookie, затем `Accept-Language`, по умолчанию en |
| Slug | Одинаковый во всех языках |
| Сообщения UI | `messages/{locale}.json` по пространствам фич |
| Контент | Если перевода нет или `stale`: показываем en с плашкой, `noindex`, canonical на en, не включаем в sitemap языка |
| hreflang | `alternates.languages` только для `machine`/`reviewed` + `x-default` на en |
| sitemap | `app/sitemap.ts` из индекса, закрытые уроки как тизеры, админка и кабинет не попадают |
| Даты вебинаров | UTC в БД, показ в часовом поясе браузера, в SSR в `timezone` вебинара |
| `<html lang>` | Из `[locale]` |

**SEO для закрытых уроков:** без доступа отдаётся тизер (заголовок, summary, оглавление, первый абзац, форма лида, вход) с HTTP 200. Полный текст в HTML без доступа не попадает.

---

## 6. Рендер MDX

Компиляция при сборке через слой коллекций (content-collections или Velite, zod-схема frontmatter). Скомпилированный модуль в серверном бандле. Серверный компонент проверяет `canAccess`, затем рендерит. PUBLIC пререндерятся статически, закрытые на запрос. Какой инструмент поддерживается лучше, проверить перед стартом.

| Элемент | Решение | Почему |
|---|---|---|
| Подсветка кода | Shiki при сборке, две темы через CSS-переменные; кнопка «копировать» как маленький клиентский компонент | 0 KB JS |
| Файлы кода | `<CodeFile src="code.py" />`: remark подставляет файл + ссылка на оригинал с commit | Код не расходится с источником |
| Mermaid | `content:diagrams` рендерит через mermaid-cli в `diagrams/<sha>.{light,dark}.svg`, SVG коммитятся; remark заменяет блок на `<Diagram>`; нет SVG для хеша → сборка падает | Нет Chromium в Docker, нет 600 KB клиентского mermaid, нет `unsafe-eval` в CSP |
| Картинки | `assets/*.{locale}.svg` с fallback на en, явные размеры | CLS < 0.1 |
| Видео | `<Video provider id />`: фасад, iframe по клику; youtube-nocookie, Rutube, VK; белый список провайдеров | Без фасада 0,5–1 МБ JS; белый список закрывает инъекцию iframe |
| Квиз | `<Quiz />` берёт `quiz.json`; в клиент уходят вопросы без `correct`; server action проверяет и пишет QuizAttempt; гость проверяется без записи | Ответы не видны в исходнике |
| Цитаты Anthropic | `<DocQuote href>` обязательная ссылка | Лицензия, линтер |
| Атрибуция | `<Attribution>` в layout урока из frontmatter | Не забудется |

Разрешённые в MDX компоненты заданы явным списком. Произвольный JSX и `import` в контенте отключены линтером.

---

## 7. Аутентификация

**Рекомендация: magic link через свой почтовый сервер + GitHub OAuth. Google в v1 не подключать.** Сессии в БД (Prisma adapter), не JWT.

| Вариант | Плюсы | Минусы |
|---|---|---|
| Magic link (Stalwart на VPS2) | Работает для всех рынков, подходит менеджерам, адрес сразу подтверждён | Доставляемость: SPF, DKIM, DMARC, PTR, прогрев; отдельный поддомен для отправки |
| GitHub OAuth | Аудитория там есть, нужен для варианта B практики | Менеджеры часто без аккаунта |
| Google OAuth | Конверсия на en/es | Верификация приложения, проблемы доступа в РФ |

Сессии в БД: отзыв премиума и бан действуют сразу. Обязательно: rate limit на magic link (5 в час по IP и email), токен 10–15 минут одноразовый, `AUTH_TRUST_HOST` за nginx, cookie `Secure` и `SameSite=Lax`, одинаковый ответ для существующих и новых адресов, связка GitHub и email по подтверждённому адресу.

**Риск:** Auth.js в 2025 перешёл под команду Better Auth. Запасной вариант: Better Auth с той же схемой User/Session.

---

## 8. Практика в Claude Code

Общее: на каждое задание публичный репозиторий-шаблон с README на трёх языках и **детерминированной** проверкой без LLM. Примеры: `CLAUDE.md` с нужными разделами; хук в `.claude/settings.json` блокирует `rm -rf` (скрипт с тестовым JSON на stdin возвращает код 2); skill с валидным frontmatter; MCP-сервер отвечает на `tools/list`.

**Вариант A: локальная проверка + токен.** Ученик получает одноразовый токен (7 дней, в БД хеш), клонирует шаблон, решает, запускает `npx <check-pkg> --token XXX`. Скрипт проверяет и шлёт POST на `/api/practice/submit`. Без сети печатает код для ручной вставки.

**Вариант B: GitHub Actions + OIDC.** Workflow ученика вызывает наш reusable workflow, тот запускает наш чекер и запрашивает OIDC-токен. Сервер проверяет JWT по JWKS GitHub и клеймы (`job_workflow_ref`, `repository_owner`, `sha`).

| Критерий | A | B |
|---|---|---|
| Защита от подделки | Низкая | Высокая |
| Порог входа | Низкий | Нужны GitHub и Actions |
| Риск для VPS2 | Приём JSON | Проверка JWT |
| Задания с локальным окружением | Естественно | Часть требует эмуляции |
| Сложность | Небольшая | Средняя |

**Рекомендация: в v1 вариант A.** Сертификатов нет, выгоды от подделки почти нет, низкий порог важнее для лидов. Протокол submit независим от транспорта, B добавляется в v2. Запуск чужого кода на VPS2 не рассматривается.

---

## 9. Деплой на VPS2

**Сборка образа в GitHub Actions (или локально), пуш в GHCR, на VPS2 только `docker compose pull && up -d`.** На VPS2 живут Camerata и почта, `next build` ест 2–4 ГБ RAM. Тег образа = git sha, откат = предыдущий тег.

| Сервис | Образ | Назначение |
|---|---|---|
| `db` | `postgres:17-alpine` | Том `pgdata`, healthcheck, порт наружу не публикуется |
| `migrate` | образ приложения | `prisma migrate deploy`, затем `content:sync` |
| `app` | образ приложения (`standalone`, `node:22-alpine`, non-root) | healthcheck `/api/health`, `read_only` + tmpfs, лимит памяти |
| `backup` | `postgres:17-alpine` + cron | Ежедневный `pg_dump -Fc` |

nginx на VPS2 read-only bind-mount: добавить server-блок с TLS, прокси на app, заголовки безопасности (HSTS, CSP с `frame-src` только для видеоплатформ), кеш `/_next/static` на год, rate limit на `/api/auth` и `/api/practice`. После выкладки HTTP 200 через check_http.py.

**Бэкапы:** ежедневно 03:00, 7 дневных + 4 недельных + 6 месячных, шифрование `age`, копия на VPS1 по rsync с ключом только на запись, ежемесячное тестовое восстановление с отчётом в Telegram. Контент не бэкапится, он в git.

**Переменные окружения** (zod в `src/lib/env.ts`, `.env.production` с правами 600):

| Переменная | Назначение |
|---|---|
| `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | БД |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true` | Auth.js за nginx |
| `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` | SMTP Stalwart |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub OAuth |
| `NEXT_PUBLIC_SITE_URL` | канонический домен |
| `PRACTICE_TOKEN_PEPPER`, `IP_HASH_SALT` | хеширование |
| `ADMIN_EMAILS` | начальные админы |
| `BACKUP_AGE_RECIPIENT`, `BACKUP_REMOTE` | бэкапы |

---

## 10. Риски и альтернативы

| Пункт | Риск | Что делать |
|---|---|---|
| Модель контента | Правка = пересборка | Приемлемо для одного автора; при редакторах гибрид с компиляцией при публикации |
| | Сборка 1600+ MDX в v2 долгая | Кеш сборки, ленивая компиляция закрытых |
| Пайплайн | Апстрим переименует папки | Маппинг по путям, отчёт REMOVED/NEW, `key` не меняется |
| | Конфликты merge | `en.mdx.proposed` с маркерами, правка вручную |
| | Стоимость и качество перевода | Смета токенов, глоссарий, вычитка бесплатного модуля носителем |
| | Перепечатка доки Anthropic | Линтер цитат + n-граммы |
| Структура | Разрастание `features/*` | Фича импортирует только `lib/`, `components/ui` и `index.ts` других фич, eslint-границы |
| Схема | Индекс расходится с файлами | Только `content:sync` пишет, запускается при деплое |
| | **152-ФЗ: персданные граждан РФ** должны первично храниться в РФ. VPS2 за рубежом | Решение заказчика: хранение в РФ, или осознанный риск; политика конфиденциальности, `consentVersion`, уведомление Роскомнадзора. **Блокер до сбора лидов** |
| i18n | Частичные переводы и дубли | noindex + canonical на en |
| | Переименование middleware в proxy | Зафиксировать версию Next |
| MDX | Библиотека перестанет поддерживаться | Тонкий загрузчик в одном месте |
| | mermaid-cli требует Chromium | Только в пайплайне, запас: клиентский lazy mermaid |
| Auth | Письма в спам | SPF/DKIM/DMARC, прогрев, GitHub как обход, внешний релей платно по запросу |
| Практика | Подделка в варианте A | Допустимо без сертификатов, B в v2 |
| | Claude Code меняет формат настроек | `checkVersion`, CI шаблонов по расписанию |
| Деплой | Ресурсы Camerata | Сборка вне VPS2, лимиты в compose |
| | Потеря БД | Шифрованные бэкапы вне VPS2 |
| | Компрометация через зависимость | non-root, read-only FS, БД не наружу, секреты в env |

---

## Решения заказчика до старта разработки

1. Где физически стоит VPS2 и как поступаем с 152-ФЗ (блокер для форм лидов и регистрации РФ-аудитории).
2. Бесплатный первый модуль собирается из гайдов «как пользоваться Claude Code», а s01–s17 («как устроен агент») идут модулями 2–4.
3. Сборка образа в GitHub Actions + GHCR.
4. Домен (нужен для DKIM, OAuth callback и canonical), бюджет перевода.
