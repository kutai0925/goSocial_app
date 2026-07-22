#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "==================================="
echo "🚀 Starting goSocial Demo Environment"
echo "==================================="

# 1. Get the local IP address (Cross-platform using Node.js)
LOCAL_IP=$(node -e "const nets=require('os').networkInterfaces();for(const name of Object.keys(nets)){for(const net of nets[name]){if((net.family==='IPv4'||net.family===4)&&!net.internal){console.log(net.address);process.exit(0);}}}")
if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  Could not detect local Wi-Fi IP address. Defaulting to localhost."
    LOCAL_IP="localhost"
fi

echo "📡 Detected Local IP: $LOCAL_IP"
echo "   (This IP will be injected into the Expo app to allow physical devices to connect)"

# 2. Export the IP address so Expo can pick it up natively
export EXPO_PUBLIC_API_IP=$LOCAL_IP

# 3. Start the Rust backend in the background
echo "🦀 Starting Rust backend..."
cd backend
cargo run &
BACKEND_PID=$!
cd ..

# 4. Ensure we clean up the background backend process when this script exits
trap "echo -e '\n🛑 Stopping backend (PID: $BACKEND_PID)...'; kill $BACKEND_PID; exit" SIGINT SIGTERM EXIT

# 5. Start the Expo server
echo "📱 Starting Expo development server..."
npx expo start -c

# Wait for the backend process in the background (so the script doesn't exit immediately if expo stops)
wait $BACKEND_PID
