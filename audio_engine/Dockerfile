FROM alpine:edge

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache \
    shairport-sync \
    librespot \
    alsa-utils \
    supervisor

# Configure supervisor to run both services
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# We use host networking for avahi to work easily, otherwise we'd need avahi daemon running
# and DBus setup, which is heavy. Shairport-sync works better in host network mode for discovery.

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
