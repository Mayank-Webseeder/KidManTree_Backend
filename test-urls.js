const {
  getFileUrl,
  getThumbnailUrl,
  getAudioUrl,
} = require("./src/utils/fileUrl");

// Test the file URL generation
console.log("=== File URL Tests ===");

// Test thumbnail URL
const thumbnailPath = "uploads/thumbnails/thumb_1759728265751_zveaejbp35q.png";
console.log("Thumbnail Path:", thumbnailPath);
console.log("Thumbnail URL:", getThumbnailUrl(thumbnailPath));

// Test audio URL
const audioPath = "uploads/audios/audio_1759251728277_2f964nzwpju.mp3";
console.log("Audio Path:", audioPath);
console.log("Audio URL:", getAudioUrl(audioPath));

// Test video URL
const videoPath = "uploads/videos/reel_1759251728277_2f964nzwpju.mp4";
console.log("Video Path:", videoPath);
console.log("Video URL:", getFileUrl(videoPath));

console.log("\n=== Expected URLs ===");
console.log("Production (api.manmitr.com):");
console.log(
  "- Thumbnail: https://api.manmitr.com/uploads/thumbnails/thumb_1759728265751_zveaejbp35q.png"
);
console.log(
  "- Audio: https://api.manmitr.com/uploads/audios/audio_1759251728277_2f964nzwpju.mp3"
);
console.log(
  "- Video: https://api.manmitr.com/uploads/videos/reel_1759251728277_2f964nzwpju.mp4"
);

console.log("\nDevelopment (kidmantree-backend-g2la.onrender.com):");
console.log(
  "- Thumbnail: https://kidmantree-backend-g2la.onrender.com/uploads/thumbnails/thumb_1759728265751_zveaejbp35q.png"
);
console.log(
  "- Audio: https://kidmantree-backend-g2la.onrender.com/uploads/audios/audio_1759251728277_2f964nzwpju.mp3"
);
console.log(
  "- Video: https://kidmantree-backend-g2la.onrender.com/uploads/videos/reel_1759251728277_2f964nzwpju.mp4"
);
