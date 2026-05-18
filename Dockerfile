FROM nginx:alpine

# ca-certificates for upstream HTTPS, wget for health check
RUN apk add --no-cache ca-certificates wget

# Entrypoint script — reads correct DNS resolver from /etc/resolv.conf
# and injects it into the nginx config before starting
COPY docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod +x /usr/local/bin/docker_entrypoint.sh

# nginx config — __RESOLVER__ placeholder filled at runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Dashboard assets
COPY index.html    /usr/share/nginx/html/index.html
COPY chart.umd.js  /usr/share/nginx/html/chart.umd.js
COPY css/          /usr/share/nginx/html/css/
COPY js/           /usr/share/nginx/html/js/

EXPOSE 80

ENTRYPOINT ["docker_entrypoint.sh"]
