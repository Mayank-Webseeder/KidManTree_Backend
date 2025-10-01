const mongoose = require('mongoose');

const podcastSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    time: {
        type: String,
        trim: true
    },
    thumbnailPath: {
        type: String,
        required: true
    },
    youtubeLink: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Podcast', podcastSchema);


