# Build context: repo root (Coolify default).
# In Coolify: Dockerfile Location = /frontend/Dockerfile, Base Directory = /

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/ ./
RUN npm run build

# Production stage — nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    # Tell every crawler to stay out — defence-in-depth alongside <meta robots> and /robots.txt. \
    add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always; \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always; \
    } \
    location / { \
        add_header Cache-Control "no-cache"; \
        add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
