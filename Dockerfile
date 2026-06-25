# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài dependencies trước (tận dụng Docker layer cache)
COPY package*.json ./

# 🚀 BỘ BA BIỆN PHÁP CHỐNG NGHẼN MẠNG NPM TRÊN IPV6:
# 1. Ép npm chỉ phân giải và tải gói qua IPv4 sạch
RUN npm config set fetch-ipv4 true
# 2. Định nghĩa lại Registry chuẩn chính thống
RUN npm config set registry https://registry.npmjs.org/
# 3. Nâng thời gian chờ (timeout) lên 5 phút để tránh rớt gói tin trên HP Server
RUN npm config set fetch-retry-maxtimeout 300000

RUN npm ci --no-audit --no-fund

# Copy toàn bộ source code
COPY . .

# VITE "bake" biến này vào JS tĩnh tại thời điểm build.
# → Nếu đổi IP sau này: docker compose build --no-cache frontend
ARG VITE_API_BASE_URL=http://api-gateway:80/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─── Stage 2: Runtime (Nginx) ─────────────────────────────────────────────────
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Xóa config mặc định của nginx
RUN rm -rf ./*

# Copy file tĩnh đã build
COPY --from=build /app/dist .

# Copy nginx config tùy chỉnh (hỗ trợ React Router SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]