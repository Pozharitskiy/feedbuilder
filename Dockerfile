FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Скопировать только скомпилированный JS (без tsc в контейнере)
COPY dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
