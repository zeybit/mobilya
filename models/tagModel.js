const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Etiket adı zorunludur'],
        unique: true,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'Tag'
});

module.exports = mongoose.model('Tag', tagSchema); 