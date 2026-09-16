FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

RUN npm install

COPY server ./server

ENV NODE_ENV=production
ENV PORT=3002
ENV APP_DATA_FILE=/data/app.json
ENV LEARNING_DB_PATH=/data/learning.db

RUN mkdir -p /data

EXPOSE 3002

CMD ["npm", "run", "start", "--workspace=server"]
