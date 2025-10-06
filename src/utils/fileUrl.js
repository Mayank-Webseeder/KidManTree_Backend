const path = require("path");

/**
 * Generate proper file URLs for different environments
 * @param {string} filePath - The file path from uploads directory
 * @returns {string} - Complete URL to access the file
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;

  // Remove leading slash if present
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

  // Get base URL based on environment
  const baseUrl = getBaseUrl();

  // Construct full URL
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Get base URL based on environment
 * @returns {string} - Base URL for the current environment
 */
const getBaseUrl = () => {
  const env = process.env.NODE_ENV;
  const port = process.env.PORT || 8000;

  // Production URLs
  if (env === "production") {
    // Check if we're on Render
    if (process.env.RENDER) {
      return "https://kidmantree-backend-g2la.onrender.com";
    }
    // Check if we're on your custom domain
    if (process.env.CUSTOM_DOMAIN) {
      return "https://api.manmitr.com";
    }
    // Default production URL
    return "https://kidmantree-backend-g2la.onrender.com";
  }

  // Development URL
  return `http://localhost:${port}`;
};

/**
 * Generate thumbnail URL for music categories
 * @param {string} thumbnailPath - Thumbnail file path
 * @returns {string} - Complete thumbnail URL
 */
const getThumbnailUrl = (thumbnailPath) => {
  return getFileUrl(thumbnailPath);
};

/**
 * Generate audio URL for music files
 * @param {string} audioPath - Audio file path
 * @returns {string} - Complete audio URL
 */
const getAudioUrl = (audioPath) => {
  return getFileUrl(audioPath);
};

/**
 * Generate video URL for reels
 * @param {string} videoPath - Video file path
 * @returns {string} - Complete video URL
 */
const getVideoUrl = (videoPath) => {
  return getFileUrl(videoPath);
};

/**
 * Generate podcast thumbnail URL
 * @param {string} thumbnailPath - Podcast thumbnail path
 * @returns {string} - Complete podcast thumbnail URL
 */
const getPodcastThumbnailUrl = (thumbnailPath) => {
  return getFileUrl(thumbnailPath);
};

/**
 * Generate profile image URL
 * @param {string} imagePath - Profile image path
 * @returns {string} - Complete profile image URL
 */
const getProfileImageUrl = (imagePath) => {
  return getFileUrl(imagePath);
};

module.exports = {
  getFileUrl,
  getBaseUrl,
  getThumbnailUrl,
  getAudioUrl,
  getVideoUrl,
  getPodcastThumbnailUrl,
  getProfileImageUrl,
};
