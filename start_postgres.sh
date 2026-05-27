#!/bin/bash
set -euo pipefail
if ! command -v psql &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y postgresql
fi
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD:-postgres}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'toique'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE toique;"
