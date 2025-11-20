# NOTE: React Native usually requires a mobile build environment.
# This Dockerfile builds the "web" version of the Expo app for demonstration purposes.
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Install expo-cli globally to run web export if needed, or just use npx
# For this demo, we'll just start the web server
EXPOSE 8081

CMD ["npx", "expo", "start", "--web"]
