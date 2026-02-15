# =============================================================================
# International Medical Software - Data Dictionary
# Production-ready multi-stage Dockerfile (Next.js standalone output).
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install all dependencies (including dev) needed for build.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests only for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies; do not use --omit=dev so build tools and exceljs (if in devDeps) are available.
# For production runtime we rely on standalone output or install prod deps in final stage.
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Build the Next.js application (output: standalone for minimal production image).
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry in build; disable in CI/Docker if desired
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments are not used for secrets; DATABASE_URL must come from env at runtime.
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner
# Minimal image to run the standalone server. No devDependencies.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Listen on all interfaces so the container can receive traffic from the host.
# Required for Docker port mapping and internal network access.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output (see next.config.js output: 'standalone')
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Run the standalone server (server.js is at the root of standalone)
CMD ["node", "server.js"]
