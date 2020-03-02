FROM node
RUN npm install -g @prisma/client
RUN npm install -g prisma2@2.0.0-preview022
COPY hello-prisma /app
RUN cd /app && yarn