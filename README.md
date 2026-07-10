# Meeting Transcriber

Next.js приложение для обработки записей совещаний: транскрипция через локальный `whisper.cpp`, сводка через вашу модель с OpenAI-compatible `chat/completions` API.

## Возможности

- загрузка аудио или видеофайла с записью;
- конвертация аудио через `ffmpeg`;
- транскрипция через `whisper.cpp`;
- сводка встречи через `AI_BASE_URL`/`AI_MODEL` или fallback на `~/.config/opencode/opencode.json`;
- выделение ключевых пунктов, решений, задач, открытых вопросов и рисков;
- вывод полной транскрипции на той же странице.

## Почему две модели

Модель для сводки работает как `chat/completions` API: она принимает текст и возвращает текст. Она не принимает аудиофайл как входные данные, поэтому не может сама сделать транскрипцию записи.

Пайплайн разделён по задачам:

- `ffmpeg` приводит разные форматы аудио и видео к WAV 16 kHz mono;
- `whisper.cpp` превращает звук в текст;
- chat-модель делает сводку по готовой транскрипции.

Если появится модель или endpoint, который реально принимает аудио и возвращает текст/сводку, можно будет заменить `whisper.cpp` на неё. Но с текущим `chat/completions` endpoint нужен отдельный ASR-этап.

## Зависимости

```bash
brew install ffmpeg whisper-cpp
```

Модель Whisper уже должна лежать локально:

```bash
models/ggml-base.bin
```

Если нужно скачать заново:

```bash
mkdir -p models
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/ggml-base.bin
```

## Настройка

Создайте `.env.local` на основе примера:

```bash
cp .env.local.example .env.local
```

Текущая рабочая конфигурация:

```bash
FFMPEG_BIN=/opt/homebrew/bin/ffmpeg
WHISPER_CPP_BIN=/opt/homebrew/bin/whisper-cli
WHISPER_CPP_MODEL=/Users/foxxy/Documents/projects/my-transcription/models/ggml-base.bin
MAX_UPLOAD_MB=200

AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=
AI_MODEL=qwen3.5-122b
SUMMARY_CHUNK_CHARS=12000
```

`AI_BASE_URL` должен указывать на base URL OpenAI-compatible API, без `/chat/completions` на конце. Приложение само вызывает `${AI_BASE_URL}/chat/completions`.

Если `AI_BASE_URL` и `AI_MODEL` не указаны, приложение попробует прочитать старый openCode-конфиг:

```bash
OPENCODE_CONFIG_PATH=/Users/foxxy/.config/opencode/opencode.json
OPENCODE_PROVIDER=llm-bridge
OPENCODE_MODEL=smart-fast
```

Для вашего текущего openCode-конфига доступны:

- `OPENCODE_PROVIDER=llm-bridge`, модели `smart`, `smart-fast`;
- `OPENCODE_PROVIDER=home`, модель `qwen3.5-122b`.

Секретный ключ остаётся в openCode-конфиге и не нужен в репозитории.

При конфигурации через `AI_API_KEY` секрет также держите только в `.env.local` или Docker env, не коммитьте его в репозиторий.

## Запуск приложения

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Запуск в Docker

Положите модель Whisper в `models/ggml-base.bin`. Она подключается в контейнер как volume и не попадает в Docker image.

Для локальной нейронки, запущенной на хосте, используйте base URL через `host.docker.internal`:

```bash
AI_BASE_URL=http://host.docker.internal:11434/v1
AI_MODEL=qwen3.5-122b
AI_API_KEY=
```

Запуск:

```bash
docker compose up --build
```

Откройте [http://localhost:3000](http://localhost:3000).

Если нейронка запускается отдельным сервисом в том же `docker-compose.yml`, замените `AI_BASE_URL` на адрес сервиса внутри compose-сети, например `http://neural:8000/v1`.

## Быстрая диагностика

```bash
/opt/homebrew/bin/ffmpeg -version
/opt/homebrew/bin/whisper-cli -h
test -f models/ggml-base.bin
```

Если меняете `.env.local`, перезапустите `npm run dev`.

Также доступна HTTP-проверка окружения:

```bash
curl http://localhost:3000/api/health
```

Endpoint проверяет `ffmpeg`, `whisper-cli`, файл Whisper-модели и доступность chat model endpoint через `${AI_BASE_URL}/models`.

## Проверки кода

```bash
npm test
npm run lint
npm run build
```

Unit-тесты запускаются через встроенный `node:test` без отдельного test runner. Временная сборка тестов пишется в `.tmp/test-build`.

## Журнал изменений и версии

`CHANGELOG.md` ведётся на русском языке и генерируется из git-коммитов.

Обновить changelog для текущей версии из `package.json`:

```bash
npm run changelog
```

Поднять версию и обновить changelog:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

Скрипты `release:*` обновляют `package.json`, `package-lock.json` и добавляют/перегенерируют секцию в `CHANGELOG.md`. Для хорошей группировки используйте conventional commits, например `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`.

## Ограничения MVP

- обработка длинных записей может занять много времени;
- качество транскрипции зависит от выбранной Whisper-модели;
- качество сводки зависит от выбранной openCode-модели;
- результат хранится только в браузере до перезагрузки страницы;
- авторизация и история встреч пока не реализованы.
