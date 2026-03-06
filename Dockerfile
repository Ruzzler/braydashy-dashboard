# Stage 1: Build the React frontend
# We use standard node:20 (Debian) for building because it's faster and more compatible with build tools
FROM node:20 AS frontend-builder
WORKDIR /app
COPY CHANGELOG.md ./
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Final Production Image
# We use alpine for the final runner to keep the image size minimal and secure
FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/Ruzzler/braydashy-dashboard"
LABEL org.opencontainers.image.description="A custom, beautiful, and highly dynamic unraid landing page dashboard"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend logic
COPY backend/server.js ./backend/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure data directory exists for volume mounting
RUN mkdir -p /app/data

EXPOSE 3050
CMD ["node", "backend/server.js"]
