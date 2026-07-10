# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci

FROM node:24-bookworm-slim AS whisper-builder

ARG WHISPER_CPP_REF=master
ARG TARGETARCH

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
  apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates cmake g++ git make

RUN git clone --depth 1 --branch "$WHISPER_CPP_REF" https://github.com/ggerganov/whisper.cpp.git /tmp/whisper.cpp \
  && if [ "$TARGETARCH" = "arm64" ]; then export CMAKE_CPU_FLAGS="-DCMAKE_C_FLAGS=-march=armv8.2-a+fp16 -DCMAKE_CXX_FLAGS=-march=armv8.2-a+fp16"; fi \
  && cmake -S /tmp/whisper.cpp -B /tmp/whisper.cpp/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DWHISPER_BUILD_TESTS=OFF \
    -DGGML_NATIVE=OFF \
    ${CMAKE_CPU_FLAGS:-} \
  && cmake --build /tmp/whisper.cpp/build --config Release --target whisper-cli -j "$(nproc)" \
  && cp /tmp/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli

FROM deps AS builder

WORKDIR /app
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000 \
  FFMPEG_BIN=ffmpeg \
  WHISPER_CPP_BIN=/usr/local/bin/whisper-cli \
  WHISPER_CPP_MODEL=/app/models/ggml-base.bin

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
  apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg libgomp1

COPY --from=whisper-builder /usr/local/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
