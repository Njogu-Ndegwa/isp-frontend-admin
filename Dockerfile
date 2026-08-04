# Self-hosted image for the Hetzner origin. Vercel does not use this file --
# it keeps building the app its own way from the same commit.
#
# Debian slim rather than alpine: sharp (next/image optimisation, which Vercel
# normally provides for us) is far less trouble against glibc than musl.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Flips next.config.ts to output:'standalone'. Unset everywhere else.
ENV BUILD_STANDALONE=1
# Baked into the client bundle AND the CSP connect-src, so it must match the
# value Vercel builds with or the two origins will not behave identically.
ARG NEXT_PUBLIC_API_BASE_URL=https://isp.bitwavetechnologies.com
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
# next/image needs sharp when self-hosting; on Vercel this is handled upstream.
RUN npm i --no-audit --no-fund --omit=dev sharp && npm cache clean --force
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
