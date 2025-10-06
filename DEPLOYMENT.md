# Deployment Guide

## Server URLs

### Production Servers

- **Primary Production**: `https://api.manmitr.com`
- **Development/Backup**: `https://kidmantree-backend-g2la.onrender.com`

### Local Development

- **Local Server**: `http://localhost:8000`

## File Upload URLs

### Music Files

- **Thumbnails**: `{server_url}/uploads/thumbnails/{filename}`
- **Audio Files**: `{server_url}/uploads/audios/{filename}`

### Reels

- **Videos**: `{server_url}/uploads/videos/{filename}`

### Podcasts

- **Thumbnails**: `{server_url}/uploads/podcast_thumbnails/{filename}`

### Profile Images

- **Profile Images**: `{server_url}/uploads/profile_images/{filename}`

## Example URLs

### Production (api.manmitr.com)

```
Music Thumbnail: https://api.manmitr.com/uploads/thumbnails/thumb_1759251581154_zpkaxs8t54.jpeg
Audio File: https://api.manmitr.com/uploads/audios/audio_1759251728277_2f964nzwpju.mp3
Reel Video: https://api.manmitr.com/uploads/videos/reel_1759251728277_2f964nzwpju.mp4
```

### Development (kidmantree-backend-g2la.onrender.com)

```
Music Thumbnail: https://kidmantree-backend-g2la.onrender.com/uploads/thumbnails/thumb_1759251581154_zpkaxs8t54.jpeg
Audio File: https://kidmantree-backend-g2la.onrender.com/uploads/audios/audio_1759251728277_2f964nzwpju.mp3
Reel Video: https://kidmantree-backend-g2la.onrender.com/uploads/videos/reel_1759251728277_2f964nzwpju.mp4
```

## Deployment Steps

### 1. Environment Variables

Set these environment variables on your deployment platform:

```bash
NODE_ENV=production
PORT=8000
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
```

### 2. Uploads Directory

The server will automatically create the uploads directory structure on startup:

- `/uploads/thumbnails/`
- `/uploads/audios/`
- `/uploads/videos/`
- `/uploads/podcast_thumbnails/`
- `/uploads/profile_images/`
- `/uploads/documents/`

### 3. Static File Serving

Files are served statically at the `/uploads` endpoint, so:

- File path: `uploads/thumbnails/image.jpg`
- Accessible at: `https://your-domain.com/uploads/thumbnails/image.jpg`

### 4. Manual Setup (if needed)

If uploads directories don't exist, run:

```bash
npm run setup-uploads
```

## Testing File URLs

### Test with curl:

```bash
# Test thumbnail access
curl -I https://api.manmitr.com/uploads/thumbnails/thumb_1759251581154_zpkaxs8t54.jpeg

# Test audio access
curl -I https://api.manmitr.com/uploads/audios/audio_1759251728277_2f964nzwpju.mp3
```

### Test with browser:

Visit the URLs directly in your browser to verify file access.

## Troubleshooting

### Files not found (404)

1. Check if uploads directory exists on server
2. Verify file permissions
3. Ensure static file serving is configured
4. Check file path in database matches actual file location

### CORS issues

1. Verify CORS configuration in `app.js`
2. Add your frontend domain to allowed origins
3. Check if credentials are properly configured

### Environment-specific URLs

Use the `getFileUrl()` utility function in your controllers to generate proper URLs based on the current environment.
