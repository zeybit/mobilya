const Product = require('../models/productModel');
const axios = require('axios');
require('dotenv').config();

// Anahtar kelimeler ve eşleşen özellikler
const keywordMappings = {
    // Renkler
    'renk': {
        'beyaz': 'beyaz',
        'siyah': 'siyah',
        'gri': 'gri',
        'kahverengi': 'kahverengi',
        'bej': 'bej',
        'mavi': 'mavi',
        'kırmızı': 'kırmızı',
        'yeşil': 'yeşil',
        'altın': 'altın'
    },
    // Stiller
    'stil': {
        'modern': 'Modern',
        'klasik': 'Klasik',
        'minimalist': 'Minimalist',
        'vintage': 'Vintage',
        'scandinav': 'Scandinav',
        'rustik': 'Rustik',
        'bohem': 'Bohem',
        'endüstriyel': 'Endüstriyel'
    },
    // Oda türleri
    'oda': {
        'oturma': 'Oturma Odası',
        'yatak': 'Yatak Odası',
        'mutfak': 'Mutfak',
        'çalışma': 'Çalışma Odası',
        'yemek': 'Yemek Odası'
    },
    // Ürün türleri
    'ürün': {
        'koltuk': 'koltuk',
        'kanepe': 'kanepe',
        'sandalye': 'sandalye',
        'masa': 'masa',
        'gardırop': 'gardırop',
        'yatak': 'yatak',
        'dolap': 'dolap',
        'sehpa': 'sehpa',
        'kitaplık': 'kitaplık',
        'raf': 'raf',
        'komodin': 'komodin',
        'puf': 'puf',
        'televizyon ünitesi': 'televizyon ünitesi'
    }
};

// Renk uyumluluk matrisi
const colorCompatibility = {
    'beyaz': ['gri', 'bej', 'kahverengi', 'mavi', 'siyah', 'yeşil'],
    'siyah': ['beyaz', 'gri', 'kırmızı', 'altın'],
    'gri': ['beyaz', 'siyah', 'mavi', 'kırmızı', 'yeşil'],
    'kahverengi': ['bej', 'beyaz', 'gri', 'yeşil'],
    'bej': ['kahverengi', 'beyaz', 'gri', 'mavi'],
    'mavi': ['beyaz', 'gri', 'bej', 'kahverengi'],
    'kırmızı': ['siyah', 'beyaz', 'gri'],
    'yeşil': ['beyaz', 'kahverengi', 'gri'],
    'altın': ['siyah', 'beyaz', 'gri']
};

// Ürün önerisi oluştur
exports.getProductRecommendations = async (req, res) => {
    try {
        const userInput = req.query.query;
        if (!userInput) {
            return res.status(400).json({ message: 'Lütfen bir arama sorgusu girin' });
        }

        // Gemini ile özellikleri çıkar
        const extractedFeatures = await extractFeaturesWithAI(userInput);

        // Ürünleri getir
        const products = await Product.find()
            .populate('category')
            .populate('tags');
        
        // Ürünleri puanla ve sırala
        const scoredProducts = scoreProducts(products, extractedFeatures)
            .filter(product => product.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((product, index) => ({
                ...product.product.toObject(),
                isRecommended: index === 0
            }));

        if (scoredProducts.length === 0) {
            return res.status(404).json({ message: 'Aramanıza uygun ürün bulunamadı' });
        }

        // Öneri mesajı oluştur
        let recommendationMessage = null;
        if (extractedFeatures.colors.length > 0 && extractedFeatures.productTypes.length > 0) {
            recommendationMessage = `İstediğiniz ${extractedFeatures.colors[0]} ${extractedFeatures.productTypes[0]} için öneriler:`;
        }

        res.status(200).json({
            recommendations: scoredProducts,
            extractedFeatures: extractedFeatures,
            recommendationMessage: recommendationMessage,
            isExactMatch: extractedFeatures.colors.length > 0
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Gemini ile özellikleri çıkar
async function extractFeaturesWithAI(userInput) {
    try {
        const prompt = `Bir mobilya mağazasında müşterilere ürün tavsiye ediyorsun. Kullanıcı şu girdiyi verdi: "${userInput}".

Kullanıcının isteğine uygun olarak aşağıdaki özellikleri çıkar:
1. Kategori (örn: Oturma Odası, Yatak Odası, Mutfak, Çalışma Odası, Yemek Odası)
2. Renk (SADECE TEK RENK SEÇ):
   - Eğer kullanıcı spesifik bir renk belirttiyse (örn: "beyaz koltuk", "mavi masa"), o rengi kullan
   - Sadece şu renklerden birini seç: beyaz, siyah, gri, kahverengi, bej, mavi, kırmızı, yeşil, altın
   - Birden fazla renk yazma, sadece en uygun olanı seç
3. Stil (örn: Modern, Klasik, Minimalist, Vintage, Scandinav, Rustik, Bohem, Endüstriyel)
4. Ürün Türü (örn: koltuk, kanepe, sandalye, masa, gardırop, yatak, dolap, sehpa, kitaplık, raf, komodin, puf, televizyon ünitesi)

Sadece JSON formatında yanıt ver:
{
    "category": "kategori adı",
    "color": "renk",
    "style": "stil",
    "productType": "ürün türü"
}`;

        console.log('Gemini API isteği gönderiliyor...');
        console.log('API Key:', process.env.GOOGLE_AI_API_KEY ? 'Mevcut' : 'Eksik');

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Gemini API yanıtı alındı');
        const text = response.data.candidates[0].content.parts[0].text;
        console.log('API Yanıtı:', text);

        // Markdown formatındaki JSON'ı temizle
        const jsonText = text.replace(/```json\n|\n```/g, '').trim();
        const features = JSON.parse(jsonText);

        // Renk kontrolü ve düzeltmesi
        let color = features.color;

        if (color) {
            // Virgülle ayrılmış renkleri temizle
            color = color.split(',')[0].trim().toLowerCase();
            
            // Geçerli renk kontrolü
            const validColors = ['beyaz', 'siyah', 'gri', 'kahverengi', 'bej', 'mavi', 'kırmızı', 'yeşil', 'altın'];
            if (!validColors.includes(color)) {
                color = null;
            }
        }

        return {
            colors: color ? [color] : [],
            styles: features.style ? [features.style] : [],
            rooms: features.category ? [features.category] : [],
            productTypes: features.productType ? [features.productType] : []
        };

    } catch (error) {
        console.error('Gemini API Hatası Detayları:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw new Error(`Gemini API Hatası: ${error.message}`);
    }
}

// Ürünleri puanla
function scoreProducts(products, features) {
    return products.map(product => {
        let score = 0;

        // Kategori eşleşmesi - en önemli kriter
        if (features.rooms.length > 0) {
            if (features.rooms.includes(product.category.name)) {
                score += 10; // Kategori eşleşmesine daha yüksek puan
            } else {
                return { product, score: 0 }; // Farklı kategorideki ürünleri direkt eliyoruz
            }
        }

        // Etiket eşleşmesi
        product.tags.forEach(tag => {
            if (features.styles.includes(tag.name)) {
                score += 2;
            }
        });

        // Ürün adı ve açıklamasında eşleşme
        const productText = (product.name + ' ' + product.description).toLowerCase();
        
        // Renk eşleşmesi
        features.colors.forEach(requestedColor => {
            const requestedColorLower = requestedColor.toLowerCase();
            const productColor = product.color?.toLowerCase() || '';
            
            // Eğer ürünün rengi yoksa, açıklamada renk araması yap
            if (!productColor) {
                const colorInDescription = Object.keys(colorCompatibility).find(color => 
                    productText.includes(color.toLowerCase())
                );
                
                if (colorInDescription) {
                    // Spesifik renk isteği için sadece tam eşleşmeyi kabul et
                    if (colorInDescription === requestedColorLower) {
                        score += 5;
                    } else {
                        return { product, score: 0 }; // Farklı renkteki ürünleri direkt eliyoruz
                    }
                }
            } else {
                // Spesifik renk isteği için sadece tam eşleşmeyi kabul et
                if (productColor === requestedColorLower) {
                    score += 5;
                } else {
                    return { product, score: 0 }; // Farklı renkteki ürünleri direkt eliyoruz
                }
            }
        });

        // Ürün türü eşleşmesi
        features.productTypes.forEach(type => {
            if (productText.includes(type.toLowerCase())) {
                score += 3;
            }
        });

        return { product, score };
    });
}
