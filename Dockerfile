FROM node:current-bullseye

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 8000

CMD ["node", "index.js"]