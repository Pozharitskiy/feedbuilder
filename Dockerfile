# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Установить зависимости
COPY package*.json ./
RUN npm ci

# Скопировать исходники и собрать
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Скопировать package.json и установить только production зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Скопировать собранные файлы из builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/feedbuilder.db ./feedbuilder.db

# Fly передаст порт через $PORT
ENV PORT=8080
EXPOSE 8080

# Запуск
CMD ["node", "dist/index.js"]
