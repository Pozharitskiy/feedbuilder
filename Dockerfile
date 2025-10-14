# Базовый образ Node.js
FROM node:20-alpine

# Рабочая директория
WORKDIR /app

# Скопировать package.json и установить ВСЕ зависимости (включая dev для сборки)
COPY package*.json ./
RUN npm install

# Скопировать исходники
COPY . .

# Сборка TypeScript
RUN npm run build

# Удалить dev dependencies после сборки (опционально, для уменьшения размера)
RUN npm prune --production

# Fly передаст порт через $PORT
ENV PORT=8080
EXPOSE 8080

# Запуск
CMD ["node", "dist/index.js"]
