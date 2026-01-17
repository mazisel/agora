FROM node:20-bookworm-slim AS base

# Install runtime deps (tzdata + certs) once for all stages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata ca-certificates wget procps \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ARG SUPABASE_SERVICE_ROLE_KEY=placeholder

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (output goes to 'build' folder per next.config.ts)
RUN npm run build

# Production image using standalone output
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Set timezone to Europe/Istanbul for Turkish locale
ENV TZ=Europe/Istanbul

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server (distDir is 'build' in next.config.ts)
COPY --from=builder /app/build/standalone ./
# Copy static files
COPY --from=builder /app/build/static ./build/static
# Copy public files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Use standalone server instead of npm start
CMD ["node", "server.js"]
