#!/bin/bash
# Simplified setup: reset database and run SQL scripts

set -euo pipefail

DB_USER="root"
DB_PASS_PROMPT="-p" # will prompt for root password

echo "[1/2] Resetting database (drop + create) ..."
mysql -u "$DB_USER" $DB_PASS_PROMPT < create_db.sql

echo "[2/2] Inserting seed/test data ..."
mysql -u "$DB_USER" $DB_PASS_PROMPT < insert_test_data.sql

echo "✅ Database initialized via SQL scripts (create_db.sql, insert_test_data.sql)"
