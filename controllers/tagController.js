const Tag = require('../models/tagModel');

// Get all tags
exports.getTags = async (req, res) => {
    try {
        const tags = await Tag.find();
        res.status(200).json(tags);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single tag
exports.getTag = async (req, res) => {
    try {
        const tag = await Tag.findById(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: 'Etiket bulunamadı' });
        }
        res.status(200).json(tag);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create tag
exports.createTag = async (req, res) => {
    try {
        const tag = await Tag.create(req.body);
        res.status(201).json(tag);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update tag
exports.updateTag = async (req, res) => {
    try {
        const tag = await Tag.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!tag) {
            return res.status(404).json({ message: 'Etiket bulunamadı' });
        }
        res.status(200).json(tag);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete tag
exports.deleteTag = async (req, res) => {
    try {
        const tag = await Tag.findByIdAndDelete(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: 'Etiket bulunamadı' });
        }
        res.status(200).json({ message: 'Etiket başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 