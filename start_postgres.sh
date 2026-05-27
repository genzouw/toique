#!/bin/bash
set -euo pipefail
if ! command -v psql &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y postgresql
fi
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD:-postgres}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${POSTGRES_USER:-toique}'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER ${POSTGRES_USER:-toique} WITH LOGIN PASSWORD '${POSTGRES_PASSWORD:-toique}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB:-toique}'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE ${POSTGRES_DB:-toique} OWNER ${POSTGRES_USER:-toique};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB:-toique} TO ${POSTGRES_USER:-toique};"
