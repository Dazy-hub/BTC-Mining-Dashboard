#!/bin/sh
# Health check for StartOS — must emit JSON to stdout
# StartOS expects: {"result": "passing", "message": "..."} or {"result": "failing", "message": "..."}

if wget -qO- http://localhost:80/ > /dev/null 2>&1; then
  echo '{"result": "passing", "message": "Dashboard is running"}'
else
  echo '{"result": "failing", "message": "nginx not responding on port 80"}'
fi
