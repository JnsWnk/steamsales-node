FROM ghcr.io/puppeteer/puppeteer:19.10.0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    STEAM_WL_URL=$STEAM_WL_URL \
    ALLKEYSHOP_URL=$ALLKEYSHOP_URL \
    EXECUTABLE_PATH=$EXECUTABLE_PATH \
    DATABASE_URL=$DATABASE_URL \ 
    SECRET=$SECRET \
    EXPIRES=$EXPIRES

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .

CMD [ "node", "index" ]