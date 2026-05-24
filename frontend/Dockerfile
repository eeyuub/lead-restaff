# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Build with Vite env vars (must be set at build time — Vite inlines them)
ARG VITE_API_URL
ARG VITE_INTERNAL_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_INTERNAL_API_KEY=$VITE_INTERNAL_API_KEY

COPY . .
RUN npm run build

# Production stage — serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing + long-cache for hashed assets
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    location / { \
        add_header Cache-Control "no-cache"; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
