FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS whisper-builder

ARG WHISPER_CPP_REF=master

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates cmake g++ git make \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch "$WHISPER_CPP_REF" https://github.com/ggerganov/whisper.cpp.git /tmp/whisper.cpp \
  && cmake -S /tmp/whisper.cpp -B /tmp/whisper.cpp/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DWHISPER_BUILD_TESTS=OFF \
  && cmake --build /tmp/whisper.cpp/build --config Release --target whisper-cli -j "$(nproc)" \
  && cp /tmp/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000 \
  FFMPEG_BIN=ffmpeg \
  WHISPER_CPP_BIN=/usr/local/bin/whisper-cli \
  WHISPER_CPP_MODEL=/app/models/ggml-base.bin

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=whisper-builder /usr/local/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
