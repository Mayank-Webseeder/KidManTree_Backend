const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MusicCategory',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 150
    },
    genre: {
        type: String,
        trim: true,
        maxlength: 100
    },
    audioPath: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

musicSchema.index({ category: 1, title: 1 });

module.exports = mongoose.model('Music', musicSchema);


