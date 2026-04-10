FROM alpine:edge

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache \
    shairport-sync \
    librespot \
    alsa-utils \
    supervisor \
    dbus \
    avahi

RUN mkdir -p /var/run/dbus && \
    rm -f /var/run/dbus/pid && \
    dbus-uuidgen > /var/lib/dbus/machine-id

# Configure supervisor to run both services
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

