#!/bin/bash
for table in sentence document connectedWords parentChildWords jmdict; do
    sqlite3 $1 <<EOF
.mode csv
.import $table.csv $table
EOF
    done