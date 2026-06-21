FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY database/ ./database/
COPY server.js ./
COPY .env.example ./.env.example

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
