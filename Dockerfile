FROM arm32v7/node:9.4.0

COPY . .

RUN npm install && npm run build

CMD ["npm", "start"]
