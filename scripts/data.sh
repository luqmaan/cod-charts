# https://docs.google.com/spreadsheets/d/1k7jVpX782zoAIDGqj61l1Yw5qoPf1QVHpM01mwa-tTI/edit#gid=1293071648
# File -> Download as CSV, Download each sheet

# install csvkit
csvjson ./weapons.csv | jq '' - > weapons.json
csvjson ./raw_weapons.csv | jq '' - > raw_weapons.json
csvjson ./attachments.csv | jq '' - > attachments.json
csvjson ./raw_attachments.csv | jq '' - > raw_attachments.json
