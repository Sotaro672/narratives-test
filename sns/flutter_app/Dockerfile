# Dockerfile for Flutter Web Build
FROM ghcr.io/cirruslabs/flutter:latest

WORKDIR /app

# Copy pubspec files
COPY pubspec.yaml pubspec.lock ./

# Get dependencies
RUN flutter pub get

# Copy source code
COPY . .

# Build web app
RUN flutter build web --release

# Final stage for hosting
FROM nginx:alpine
COPY --from=0 /app/build/web /usr/share/nginx/html

# Custom nginx config for SPA
RUN echo 'server { listen 80; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
