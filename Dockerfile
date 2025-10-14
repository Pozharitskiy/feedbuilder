# Базовый образ Node.js
FROM node:20-alpine

# Рабочая директория
WORKDIR /app

# Скопировать package.json и установить зависимости
COPY package*.json ./
RUN npm install --production

# Скопировать исходники
COPY . .

# Сборка (если используешь TypeScript)
RUN npm run build

# Fly передаст порт через $PORT
ENV PORT=8080
EXPOSE 8080

# Запуск
CMD ["node", "dist/index.js"]
