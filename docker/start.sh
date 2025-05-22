# docker-compose run bunq-mcp bash

# PUBLISHED:
# docker run -it --rm --env-file=.env -p 8788:8788 node:latest bash

# LOCAL:
docker run --rm -it --name bunq-mcp-2 --env-file=./docker/.env -p 8788:8788 -v $(pwd):/opt -v $(pwd)/docker/bunq-mcp.sh:/usr/local/bin/bunq-mcp -w /app node:latest bash


# echo $BUNQ_API_KEY
#  npm install -g bunq-mcp

# bunq-mcp --mcp --host 0.0.0.0

