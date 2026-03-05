#!/bin/sh
# Add STV DNS override at runtime (Docker replaces /etc/hosts at container start)
echo "104.21.0.1 sangtacviet.vip" >> /etc/hosts
echo "[Entrypoint] Added sangtacviet.vip -> 104.21.0.1 to /etc/hosts"

# Start the server with xvfb (virtual display for headed Chromium)
exec xvfb-run --auto-servernum --server-args="-screen 0 1280x720x24" node server.js
