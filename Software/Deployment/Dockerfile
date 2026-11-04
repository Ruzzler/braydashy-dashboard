# Stage 1: Build the React frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY Management/Docs/CHANGELOG.md ./Management/Docs/CHANGELOG.md
WORKDIR /app/Software/Dashboard
COPY Software/Dashboard/package*.json ./
RUN npm ci
COPY Software/Dashboard ./
RUN npm run build

# Stage 2: Final Production Image
FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/Ruzzler/braydashy-dashboard"
LABEL org.opencontainers.image.description="A custom, beautiful, and highly dynamic unraid landing page dashboard"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

ENV NODE_ENV=production

# Install backend dependencies
COPY Software/Server/package*.json ./
RUN npm ci --omit=dev

# Copy backend logic
COPY Software/Server/server.js ./backend/server.js

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/Software/Dashboard/dist ./frontend/dist

# Ensure data directory exists for volume mounting
RUN mkdir -p /app/data /app/data/profiles

EXPOSE 3050
CMD ["node", "backend/server.js"]
