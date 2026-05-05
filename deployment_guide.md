# Deployment Guide: Team Task Manager on Railway

This guide outlines the steps to deploy your full-stack application on [Railway.app](https://railway.app).

## 1. Prerequisites
- A [Railway.app](https://railway.app) account.
- Your project pushed to a GitHub repository.

## 2. Backend Deployment (Server)
The server uses Fastify and likely connects to a CouchDB (Nano) database.

### Setup on Railway:
1. **New Project** -> **Deploy from GitHub repo**.
2. Select your repository.
3. In the **Settings** for the server service:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build` (Ensure you have a build script in `server/package.json`)
   - **Start Command**: `npm start`
4. **Environment Variables**:
   - `PORT`: `3000` (Railway will assign this automatically, but good to set as a reference)
   - `COUCHDB_URL`: The URL to your production CouchDB instance.
   - `JWT_SECRET`: A long random string.
   - `COOKIE_SECRET`: A long random string.
   - `NODE_ENV`: `production`

## 3. Frontend Deployment (Client)
The client is a Vite-based React app.

### Setup on Railway:
1. **New Service** -> **Deploy from GitHub repo**.
2. Select the same repository.
3. In the **Settings** for the client service:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Install Command**: `npm install`
4. **Environment Variables**:
   - `VITE_API_URL`: The public URL of your deployed **Server** (e.g., `https://your-server-production.up.railway.app/api/v1`)

## 4. Database Setup
If you are using CouchDB:
- You can deploy CouchDB as a Docker image on Railway or use a managed service.
- If you use a Railway CouchDB template, make sure to update the `COUCHDB_URL` in your Server settings.

## 5. Important Notes
- **CORS**: Ensure your server's CORS configuration allows requests from your deployed frontend URL.
- **Port**: The server is already configured to use `process.env.PORT`, which is perfect for Railway.
