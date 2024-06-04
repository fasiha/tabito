#!/bin/bash
for table in sentence document connectedWords parentChildWords jmdict; do
    sqlite3 $1 <<EOF
.headers off
.mode csv
.output $table.csv
select * from $table;
EOF
    done