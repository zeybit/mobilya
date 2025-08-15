const mongoose = require('mongoose');
const Product = require('./models/productModel'); // yolunu kendi projen göre değiştir
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('Bağlantı hatası:', err));

const renkler = ['beyaz', 'siyah', 'gri', 'kahverengi', 'bej', 'mavi', 'kırmızı', 'yeşil', 'altın'];
const malzemeler = ['ahşap', 'metal', 'cam', 'plastik', 'mdf', 'sunta'];
const moduleCounts = ['2+1', '3+3', '3+3+1+1', '3+1', '4+1', '1+1'];
const stilEtiketleri = ['modern', 'klasik', 'rustik', 'bohem', 'vintage'];

async function updateProducts() {
  const products = await Product.find();

  for (let product of products) {
    let updateData = {};

    // Renk
    if (!product.color) {
      updateData.color = renkler[Math.floor(Math.random() * renkler.length)];
    }

    // Malzeme tipi
    if (!product.materialType) {
      updateData.materialType = malzemeler[Math.floor(Math.random() * malzemeler.length)];
    }

    // Kapak sayısı
    if (!product.doorCount) {
      updateData.doorCount = Math.floor(Math.random() * 4) + 1; // 1-4 kapak
    }

    // Ölçüler
    if (!product.width) {
      updateData.width = Math.floor(Math.random() * 200) + 50; // cm
    }
    if (!product.depth) {
      updateData.depth = Math.floor(Math.random() * 80) + 30;
    }
    if (!product.height) {
      updateData.height = Math.floor(Math.random() * 200) + 100;
    }

    // Extra Attributes
    if (!product.extraAttributes) {
      updateData.extraAttributes = {};
    }
    if (!product.extraAttributes?.moduleCount) {
      if (!updateData.extraAttributes) updateData.extraAttributes = {};
      updateData.extraAttributes.moduleCount = moduleCounts[Math.floor(Math.random() * moduleCounts.length)];
    }
    if (!product.extraAttributes?.roomSize) {
      if (!updateData.extraAttributes) updateData.extraAttributes = {};
      updateData.extraAttributes.roomSize = ['küçük', 'orta', 'büyük'][Math.floor(Math.random() * 3)];
    }
    if (!product.extraAttributes?.garantiSuresi) {
      if (!updateData.extraAttributes) updateData.extraAttributes = {};
      updateData.extraAttributes.garantiSuresi = `${Math.floor(Math.random() * 4) + 1} yıl`;
    }

    // Eğer tag'ler boşsa rastgele stil etiketi ekle
    if (!product.tags || product.tags.length === 0) {
      updateData.tags = []; // string olarak stil isimleri de koyabilirsin eğer Tag modeli yoksa
    }

    if (Object.keys(updateData).length > 0) {
      try {
        const result = await Product.findByIdAndUpdate(
          product._id, 
          updateData, 
          { new: true, runValidators: true }
        );
        if (result) {
          console.log(`Güncellendi: ${result.name}`);
        } else {
          console.log(`Ürün bulunamadı: ${product.name}`);
        }
      } catch (error) {
        console.log(`Hata - ürün güncellenemedi: ${product.name} - ${error.message}`);
      }
    }
  }

  mongoose.disconnect();
}

updateProducts();
