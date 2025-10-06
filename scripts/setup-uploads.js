const fs = require("fs");
const path = require("path");

// Create uploads directories if they don't exist
const createUploadsDirectories = () => {
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const directories = [
    uploadsRoot,
    path.join(uploadsRoot, "thumbnails"),
    path.join(uploadsRoot, "audios"),
    path.join(uploadsRoot, "videos"),
    path.join(uploadsRoot, "podcast_thumbnails"),
    path.join(uploadsRoot, "profile_images"),
    path.join(uploadsRoot, "documents"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`ℹ️  Directory already exists: ${dir}`);
    }
  });
};

// Run if called directly
if (require.main === module) {
  createUploadsDirectories();
}

module.exports = { createUploadsDirectories };
