# Деплой learn.vdmitriev.com

## Поток

1. Push в `main` → workflow CI (lint, типы, юнит, build, e2e с axe).
2. Зелёный CI → workflow Release собирает образ `ghcr.io/victormos-oss/ai-learning-site` с тегами `sha-<short>` и `latest`, проверяет `/api/health` и `/en` внутри контейнера, публикует provenance и SBOM.
3. Lighthouse workflow на `main` отдельно: performance 0.9+, accessibility 1.0, CLS < 0.1.
4. На VPS2 только `docker compose pull && docker compose up -d`.

## Первый запуск на VPS2 (31.70.101.86)

```bash
sudo mkdir -p /srv/learn && cd /srv/learn
# compose.yaml из репозитория: docker/compose.yaml
curl -fsSL https://raw.githubusercontent.com/victormos-oss/ai-learning-site/main/docker/compose.yaml -o compose.yaml
printf 'NEXT_PUBLIC_SITE_URL=https://learn.vdmitriev.com\n' > .env.production
chmod 600 .env.production
# nginx на VPS2 живёт в контейнере и ходит на хост через host.docker.internal,
# поэтому порт публикуется на адресе docker-моста, а не на 127.0.0.1.
printf 'IMAGE_TAG=latest\nAPP_BIND=172.17.0.1\n' > .env
ss -ltn | grep 3141 || echo "port 3141 free"
docker compose pull && docker compose up -d
curl -fsS http://172.17.0.1:3141/api/health
```

Образ публичный (репозиторий публичный), токен для `docker pull` не нужен.

## DNS и TLS

- Запись `A learn.vdmitriev.com → 31.70.101.86` через API Cloudflare, без прокси (серое облако), как у остальных поддоменов. Токен лежит на VPS2, вызов делается с сервера.
- nginx: контейнер `dion-disk-nginx-1`, единственный конфиг `/opt/dion-disk/nginx.conf` смонтирован read-only. Блоки из `docker/nginx-site.conf` дописываются в конец этого файла (`cat >>`, тот же inode, не `mv`), синтаксис проверяется зеркальным контейнером, затем `docker restart dion-disk-nginx-1` (reload не подхватывает bind-mount).
- Порядок: сначала блок 80 и рестарт, потом `certbot certonly --webroot -w /opt/dion-disk/acme -d learn.vdmitriev.com` на хосте (`/opt/dion-disk/acme` = `/var/www/acme` в контейнере, `/etc/letsencrypt` смонтирован read-only), потом блок 443 и ещё один рестарт.
- Тот же блок добавляется в `Conplex/nginx.conf` репозитория Camerata: скрипт выкладки Camerata сверяет файл с продом и предупреждает о расхождении.

## Проверка после выкладки

```bash
python check_http.py https://learn.vdmitriev.com/ https://learn.vdmitriev.com/ru \
  https://learn.vdmitriev.com/en/tracks/claude-code-zero/agent-loop \
  https://learn.vdmitriev.com/api/health https://learn.vdmitriev.com/sitemap.xml
```

Все адреса должны отвечать 200. Логина в v1 нет, учётных данных передавать не нужно.

## Откат

```bash
cd /srv/learn && IMAGE_TAG=sha-<предыдущий> docker compose pull && IMAGE_TAG=sha-<предыдущий> docker compose up -d
```

## Что не делаем в v1

Базы данных нет, бэкапы не нужны: контент в git, образы в GHCR (держать последние 10 тегов).
