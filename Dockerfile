# syntax=docker/dockerfile:1

# ---- Build stage: build the React UI ----
FROM node:24-slim AS builder

# Install ffmpeg so peak generation / duration scripts can run during build if needed
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
COPY ui/package*.json ./ui/
RUN npm ci
RUN npm --prefix ui ci

# Copy source files and build the UI
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:24-slim

# ffmpeg is required for audio duration detection and waveform peak generation
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifest and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code and built UI
COPY server ./server
COPY --from=builder /app/ui/dist ./ui/dist

# Create persistent directories
RUN mkdir -p /app/data /app/media

# Volumes for user data and uploaded/imported media
VOLUME ["/app/data", "/app/media"]

EXPOSE 3000

CMD ["node", "server/index.js"]
