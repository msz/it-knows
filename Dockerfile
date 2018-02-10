FROM schmich/armv7hf-alpine-qemu

COPY . .

RUN ["cross-build-start"]

RUN npm install && npm run build

RUN ["cross-build-end"]

CMD ["npm", "start"]
