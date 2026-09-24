#!/bin/sh
set -eu

node dist/database/run-migrations.js
node dist/database/seed.js
exec node dist/main.js

