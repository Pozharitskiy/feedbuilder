FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# Create data directory for persistent storage
RUN mkdir -p /app/data

ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080
CMD ["node", "dist/index.js"]
