#!/bin/bash
for table in sentence document connectedWords parentChildWords jmdict; do
    sqlite3 $1 <<EOF
.mode json
.output $table.json
select * from $table;
EOF
    done