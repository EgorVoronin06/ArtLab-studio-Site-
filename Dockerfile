FROM node:22-alpine AS build
WORKDIR /app

COPY OneDrive/Desktop/ArtLab.com/package.json OneDrive/Desktop/ArtLab.com/package-lock.json ./
RUN npm ci

COPY OneDrive/Desktop/ArtLab.com/ ./
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g serve

COPY --from=build /app/dist ./dist

CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
