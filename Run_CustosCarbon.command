#!/bin/bash
cd "$(dirname "$0")"
echo "--------------------------------------"
echo "🌿 CustosCarbon - 啟動熱重載模式中..."
echo "--------------------------------------"
cd "/Users/jennie/Dropbox/Mac (3)/Desktop/CarbonProject_Final"

dotnet dev-certs https --trust
dotnet watch run
