const mongoose = require('mongoose');

const musicCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        minlength: 2,
        maxlength: 100
    },
    thumbnailPath: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('MusicCategory', musicCategorySchema);


