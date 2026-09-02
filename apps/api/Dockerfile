FROM node:20-slim AS base

# Install LibreOffice, Thai fonts, fontconfig, and build tools for PDF conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    fonts-thai-tlwg \
    fonts-liberation \
    fonts-noto-cjk \
    fonts-dejavu-core \
    fontconfig \
    openssl \
    ca-certificates \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies
RUN pnpm install --filter api... --frozen-lockfile

# Copy API source code
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Generate Prisma Client & Build TypeScript
RUN npx prisma generate
RUN pnpm build

# Ensure storage directories exist & permissions on entrypoint
RUN mkdir -p storage/templates storage/exports storage/logos storage/uploads && \
    chmod +x /app/apps/api/entrypoint.sh

EXPOSE 5050

# Start API server with automated Prisma schema push
CMD ["/app/apps/api/entrypoint.sh"]
