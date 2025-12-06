#!/bin/bash

# LLM Council - Start script

echo "Starting LLM Council..."
echo ""

# Build for Vercel deployment (frontend only - backend needs separate host like Render)
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "Building frontend for Vercel..."
cd frontend
npm ci
npm run build

echo "Build complete. Deploy frontend to Vercel with 'vercel --prod'."
echo "Backend must be deployed separately (Render/Heroku) as Vercel doesn't support persistent Python servers."
echo "Set NEXT_PUBLIC_API_URL to your backend URL in Vercel env vars."


echo ""
echo "✓ LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
