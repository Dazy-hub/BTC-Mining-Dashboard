#!/bin/sh
set -e

# Extract the nameserver from /etc/resolv.conf — works on Docker, Start9/podman,
# and any other container runtime, since the runtime always writes the correct
# DNS address there.
RESOLVER=$(grep -m1 '^nameserver' /etc/resolv.conf | awk '{print $2}')

if [ -z "$RESOLVER" ]; then
    # Fallback: try common addresses
    RESOLVER="8.8.8.8"
    echo "[entrypoint] Warning: could not read nameserver, falling back to $RESOLVER"
else
    echo "[entrypoint] Using DNS resolver: $RESOLVER"
fi

# Inject the resolver into the nginx config
sed -i "s/__RESOLVER__/$RESOLVER/g" /etc/nginx/conf.d/default.conf

# Test the config then start nginx
nginx -t && exec nginx -g "daemon off;"
