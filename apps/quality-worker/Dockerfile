FROM node:22-bookworm-slim

WORKDIR /app

# The scanner is isolated from NestJS. It only parses source files written to a
# temporary directory; it never compiles or executes the candidate submission.
RUN npm install --global @sonar/scan@4.3.0 \
  && groupadd --gid 10001 quality \
  && useradd --uid 10001 --gid quality --create-home quality

COPY server.mjs /app/server.mjs

USER quality
EXPOSE 3001
CMD ["node", "/app/server.mjs"]
