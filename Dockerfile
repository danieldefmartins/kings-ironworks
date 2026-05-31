FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN rm -rf .next && npm run build
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["npm", "run", "start"]
