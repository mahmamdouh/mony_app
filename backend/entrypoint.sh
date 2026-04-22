#!/bin/bash
set -e

# Fix ownership of the volume-mounted /data directory so the mony user can write to it
# This runs as root (before gosu drops privileges)
mkdir -p /data/music
chown -R mony:audio /data

# Drop to mony user and exec the app
exec gosu mony "$@"
