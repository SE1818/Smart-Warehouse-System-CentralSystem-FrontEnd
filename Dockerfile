# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài dependencies trước (tận dụng Docker layer cache)
COPY package*.json ./

# 🚀 GIẢI PHÁP CHUẨN ĐỂ ÉP NPM DÙNG IPV4 MÀ KHÔNG LỖI CÚ PHÁP
# Sử dụng biến môi trường NODE_OPTIONS để báo cho nhân Node biết chỉ phân giải DNS IPv4
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Thiết lập Registry chuẩn chính thống và tăng timeout chống rớt gói
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-maxtimeout 300000

RUN npm ci --no-audit --no-fund

# Copy toàn bộ source code
COPY . .

# VITE "bake" biến này vào JS tĩnh tại thời điểm build.
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