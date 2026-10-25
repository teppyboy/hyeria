FROM node:24 AS build

WORKDIR /app
COPY . .
RUN npm install --global vite-plus@1.3.0
RUN vp install --frozen-lockfile
RUN vp run build:management

FROM nginx:alpine

COPY --from=build /app/dist-management/management.html /usr/share/nginx/html/index.html
COPY --from=build /app/dist-management/management.html /usr/share/nginx/html/management.html
