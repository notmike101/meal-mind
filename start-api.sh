#!/bin/bash
cd "$(dirname "$0")"
npx tsx --env-file=.env services/api/src/server.ts &
