FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
