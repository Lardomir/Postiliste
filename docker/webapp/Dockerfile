FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --chown=node:node app.js server.js postRepository.js postgresRepository.js repositoryFactory.js library.js ./
COPY --chown=node:node views ./views
RUN mkdir -p /app/data && chown -R node:node /app/data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node
CMD ["npm", "start"]
