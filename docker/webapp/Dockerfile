FROM node:24-trixie-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY --chown=node:node app.js server.js repositoryFactory.js shoppingItem.js shoppingRepository.js postgresShoppingRepository.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node views ./views
COPY --chown=node:node public ./public
COPY --chown=node:node tests ./tests
COPY --chown=node:node eslint.config.js .prettierignore ./
RUN mkdir -p /app/data && chown -R node:node /app/data

FROM base AS test
ENV NODE_ENV=test
USER node
CMD ["npm", "run", "check"]

FROM node:24-trixie-slim AS production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --chown=node:node app.js server.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node views ./views
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["npm", "start"]
