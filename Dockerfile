FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# Data directory will be mounted as volume at /data
# No need to create it here

ENV PORT=8080
ENV DATA_DIR=/data
EXPOSE 8080
CMD ["node", "dist/index.js"]
