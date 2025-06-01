const Product = require('../models/productModel');
const axios = require('axios');
require('dotenv').config();

const keywordMappings = {
    renk: {
        beyaz: 'beyaz', siyah: 'siyah', gri: 'gri', kahverengi: 'kahverengi',
        bej: 'bej', mavi: 'mavi', kırmızı: 'kırmızı', yeşil: 'yeşil', altın: 'altın'
    },
    stil: {
        modern: 'modern', klasik: 'klasik', minimalist: 'minimalist', vintage: 'vintage',
        scandinav: 'scandinav', rustik: 'rustik', bohem: 'bohem', endüstriyel: 'endüstriyel'
    },
    oda: {
        oturma: 'oturma odası', yatak: 'yatak odası', mutfak: 'mutfak',
        çalışma: 'çalışma odası', yemek: 'yemek odası'
    },
    ürün: {
        koltuk: 'koltuk', kanepe: 'kanepe', sandalye: 'sandalye', masa: 'masa',
        gardırop: 'gardırop', yatak: 'yatak', dolap: 'dolap', sehpa: 'sehpa',
        kitaplık: 'kitaplık', raf: 'raf', komodin: 'komodin', puf: 'puf',
        "televizyon ünitesi": 'televizyon ünitesi'
    }
};

const colorCompatibility = {
    beyaz: ['beyaz', 'bej', 'kahverengi', 'mavi', 'siyah', 'yeşil'],
    siyah: ['beyaz', 'gri', 'kırmızı', 'altın'],
    gri: ['gri'],
    kahverengi: ['bej', 'beyaz', 'gri', 'yeşil'],
    bej: ['kahverengi', 'beyaz', 'gri', 'mavi'],
    mavi: ['beyaz', 'gri', 'bej', 'kahverengi'],
    kırmızı: ['siyah', 'beyaz', 'gri'],
    yeşil: ['beyaz', 'kahverengi', 'gri'],
    altın: ['siyah', 'beyaz', 'gri']
};

exports.getProductRecommendations = async (req, res) => {
    try {
        const userInput = (req.query.query || '').toLowerCase().trim();
        if (!userInput) {
            return res.status(400).json({ 
                message: 'Lütfen bir arama sorgusu girin',
                recommendations: []
            });
        }

        // Çok kısa girdiler için minimum uzunluk kontrolü
        if (userInput.length < 2) {
            return res.status(200).json({
                message: 'Lütfen daha detaylı bir arama yapın',
                recommendations: [],
                extractedFeatures: {
                    colors: [],
                    roomColors: [],
                    styles: [],
                    rooms: [],
                    productTypes: [],
                    colorCompatibility: []
                },
                recommendationMessage: 'Lütfen daha detaylı bir arama yapın.',
                isExactMatch: false,
                colorCompatibility: []
            });
        }

        console.log('Gelen sorgu:', userInput); // Debug log

        const extractedFeatures = await extractFeaturesWithAI(userInput);
        console.log('Çıkarılan özellikler:', extractedFeatures); // Debug log

        const products = await Product.find().populate('category').populate('tags');
        console.log('Bulunan ürün sayısı:', products.length); // Debug log

        const scoredProducts = scoreProducts(products, extractedFeatures)
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((p, i) => ({ ...p.product.toObject(), isRecommended: i === 0 }));

        console.log('Puanlanan ürün sayısı:', scoredProducts.length); // Debug log

        // Eğer sonuç yoksa, özellikleri tekrar kontrol et
        if (scoredProducts.length === 0) {
            // Kullanıcı girdisinden direkt özellik çıkarma
            const input = userInput.toLowerCase();
            const directFeatures = {
                colors: Object.entries(keywordMappings.renk)
                    .filter(([key]) => input.includes(key))
                    .map(([_, value]) => value),
                roomColors: [],
                styles: Object.entries(keywordMappings.stil)
                    .filter(([key]) => input.includes(key))
                    .map(([_, value]) => value),
                rooms: Object.entries(keywordMappings.oda)
                    .filter(([key]) => input.includes(key))
                    .map(([_, value]) => value),
                productTypes: Object.entries(keywordMappings.ürün)
                    .filter(([key]) => input.includes(key))
                    .map(([_, value]) => value),
                colorCompatibility: []
            };

            console.log('Direkt özellik çıkarma sonuçları:', directFeatures); // Debug log

            // Eğer AI'dan gelen özellikler boşsa, direkt çıkarılan özellikleri kullan
            if (extractedFeatures.colors.length === 0 && 
                extractedFeatures.styles.length === 0 && 
                extractedFeatures.productTypes.length === 0) {
                const rescoredProducts = scoreProducts(products, directFeatures)
                    .filter(p => p.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((p, i) => ({ ...p.product.toObject(), isRecommended: i === 0 }));

                if (rescoredProducts.length > 0) {
                    const msg = generateRecommendationMessage(directFeatures);
                    return res.status(200).json({
                        recommendations: rescoredProducts,
                        extractedFeatures: directFeatures,
                        recommendationMessage: msg,
                        isExactMatch: directFeatures.colors.length > 0,
                        colorCompatibility: directFeatures.colorCompatibility
                    });
                }
            }
        }

        if (scoredProducts.length === 0) {
            return res.status(200).json({ 
                message: 'Aramanıza uygun ürün bulunamadı',
                recommendations: [],
                extractedFeatures,
                recommendationMessage: 'Üzgünüz, aramanıza uygun ürün bulunamadı.',
                isExactMatch: false,
                colorCompatibility: []
            });
        }

        const msg = generateRecommendationMessage(extractedFeatures);

        res.status(200).json({
            recommendations: scoredProducts,
            extractedFeatures,
            recommendationMessage: msg,
            isExactMatch: extractedFeatures.colors.length > 0,
            colorCompatibility: extractedFeatures.colorCompatibility
        });

    } catch (error) {
        console.error('Hata detayları:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
        });

        if (error.response?.status === 503) {
            return res.status(503).json({ 
                message: 'Sistem yoğun, lütfen tekrar deneyin.',
                error: 'API_OVERLOAD',
                recommendations: []
            });
        }

        if (error.response?.status) {
            return res.status(error.response.status).json({ 
                message: 'Hata oluştu. Lütfen tekrar deneyin.',
                error: 'API_ERROR',
                recommendations: []
            });
        }

        res.status(500).json({ 
            message: 'Beklenmeyen hata oluştu.',
            error: 'INTERNAL_ERROR',
            recommendations: []
        });
    }
};

async function extractFeaturesWithAI(userInput) {
    try {
        const prompt = `
Kullanıcının ürün arama girdisini analiz et ve aşağıdaki özellikleri çıkar:

Input: "${userInput}"

Önemli Kurallar:
1. Renk belirtilmişse, bunun ürün rengi mi yoksa oda rengi mi olduğunu belirle:
   - Eğer renk ürünle ilgiliyse (örn: "mavi koltuk", "beyaz masa") -> color alanına ekle
   - Eğer renk oda ile ilgiliyse (örn: "mavi evime", "beyaz odama") -> roomColor alanına ekle
2. Stil belirtilmişse mutlaka çıkar (örn: "modern", "klasik", "minimalist")
3. Ürün türü belirtilmişse mutlaka çıkar (örn: "koltuk", "dolap", "masa")
4. Oda türü belirtilmişse çıkar (örn: "oturma odası", "mutfak", "yatak odası", "çocuk odası", "çalışma odası", "bahçe")

Önemli Not: Oda türlerini tam olarak belirtilen şekilde çıkar:
- "çocuk odası"
- "çalışma odası"
- "bahçe"
- "oturma odası"
- "yatak odası"
- "mutfak"
- "yemek odası"

Sadece aşağıdaki gibi saf ve geçerli bir JSON döndür:

{
  "color": "",
  "roomColor": "",
  "room": "",
  "style": "",
  "productType": "",
  "compatibleColors": [],
  "reasoning": ""
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
        const features = JSON.parse(jsonText);

        // Renk kontrolü ve normalizasyonu
        let color = features.color?.toLowerCase().trim() || '';
        let roomColor = features.roomColor?.toLowerCase().trim() || '';

        // Eğer renk keywordMappings'de yoksa, kullanıcı girdisinde ara
        if (!keywordMappings.renk[color]) {
            const colorMatch = Object.entries(keywordMappings.renk).find(([key]) => 
                userInput.toLowerCase().includes(key + ' koltuk') || 
                userInput.toLowerCase().includes(key + ' masa') ||
                userInput.toLowerCase().includes(key + ' dolap')
            );
            if (colorMatch) {
                color = colorMatch[1];
            } else {
                color = '';
            }
        }

        // Oda rengi kontrolü
        if (!keywordMappings.renk[roomColor]) {
            const roomColorMatch = Object.entries(keywordMappings.renk).find(([key]) => 
                userInput.toLowerCase().includes(key + ' evime') || 
                userInput.toLowerCase().includes(key + ' odama') ||
                userInput.toLowerCase().includes(key + ' eve')
            );
            if (roomColorMatch) {
                roomColor = roomColorMatch[1];
            } else {
                roomColor = '';
            }
        }

        // Stil kontrolü ve normalizasyonu
        let style = features.style?.toLowerCase().trim() || '';
        if (!keywordMappings.stil[style]) {
            const styleMatch = Object.entries(keywordMappings.stil).find(([key]) => 
                userInput.toLowerCase().includes(key)
            );
            if (styleMatch) {
                style = styleMatch[1];
            } else {
                style = '';
            }
        }

        // Ürün türü kontrolü ve normalizasyonu
        let productType = features.productType?.toLowerCase().trim() || '';
        if (!keywordMappings.ürün[productType]) {
            const productMatch = Object.entries(keywordMappings.ürün).find(([key]) => 
                userInput.toLowerCase().includes(key)
            );
            if (productMatch) {
                productType = productMatch[1];
            } else {
                productType = '';
            }
        }

        // Oda türü kontrolü ve normalizasyonu
        let room = features.room?.toLowerCase().trim() || '';
        const validRooms = [
            'çocuk odası',
            'çalışma odası',
            'bahçe',
            'oturma odası',
            'yatak odası',
            'mutfak',
            'yemek odası'
        ];

        if (!validRooms.includes(room)) {
            const roomMatch = validRooms.find(validRoom => 
                userInput.toLowerCase().includes(validRoom)
            );
            if (roomMatch) {
                room = roomMatch;
            } else {
                room = '';
            }
        }

        // Eğer oda rengi belirtilmişse, uyumlu renkleri ekle
        let compatibleColors = [];
        if (roomColor) {
            compatibleColors = colorCompatibility[roomColor] || [];
        }

        return {
            colors: color ? [color] : [],
            roomColors: roomColor ? [roomColor] : [],
            styles: style ? [style] : [],
            rooms: room ? [room] : [],
            productTypes: productType ? [productType] : [],
            colorCompatibility: compatibleColors
        };

    } catch (error) {
        console.error('Gemini API Hatası:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        // Hata durumunda kullanıcı girdisinden özellikleri çıkarmaya çalış
        const input = userInput.toLowerCase();
        
        // Ürün rengi kontrolü
        const colors = Object.entries(keywordMappings.renk)
            .filter(([key]) => 
                input.includes(key + ' koltuk') || 
                input.includes(key + ' masa') ||
                input.includes(key + ' dolap')
            )
            .map(([_, value]) => value);

        // Oda rengi kontrolü
        const roomColors = Object.entries(keywordMappings.renk)
            .filter(([key]) => 
                input.includes(key + ' evime') || 
                input.includes(key + ' odama') ||
                input.includes(key + ' eve')
            )
            .map(([_, value]) => value);

        const styles = Object.entries(keywordMappings.stil)
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);

        // Oda türü kontrolü
        const validRooms = [
            'çocuk odası',
            'çalışma odası',
            'bahçe',
            'oturma odası',
            'yatak odası',
            'mutfak',
            'yemek odası'
        ];
        const rooms = validRooms.filter(room => input.includes(room));

        const productTypes = Object.entries(keywordMappings.ürün)
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);

        // Oda rengi için uyumlu renkleri bul
        let compatibleColors = [];
        if (roomColors.length > 0) {
            compatibleColors = colorCompatibility[roomColors[0]] || [];
        }

        return {
            colors,
            roomColors,
            styles,
            rooms,
            productTypes,
            colorCompatibility: compatibleColors
        };
    }
}

function normalizeText(text) {
    return text.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c')
        .trim();
}

function scoreProducts(products, features) {
    // features objesi undefined veya null ise boş bir obje kullan
    features = features || {};
    
    // Tüm özellikleri varsayılan boş array'lerle başlat
    features.colors = features.colors || [];
    features.roomColors = features.roomColors || [];
    features.styles = features.styles || [];
    features.rooms = features.rooms || [];
    features.productTypes = features.productTypes || [];
    features.colorCompatibility = features.colorCompatibility || [];

    // Kategori eşleştirme için mapping
    const categoryMapping = {
        'çocuk odası': '68237650d79c9eb5f5520d62',
        'bahçe': '68237650d79c9eb5f5520d63',
        'çalışma odası': '68237650d79c9eb5f5520d64',
        'oturma odası': '68237650d79c9eb5f5520d65',
        'yatak odası': '68237650d79c9eb5f5520d66',
        'mutfak': '68237650d79c9eb5f5520d67',
        'yemek odası': '68237650d79c9eb5f5520d68'
    };

    return products.map(product => {
        let score = 0, matchCount = 0, totalCriteria = 0;
        const text = (product.name + ' ' + product.description).toLowerCase();
        const prodColor = normalizeText(product.color || '');
        const productName = normalizeText(product.name);
        const productDesc = normalizeText(product.description);

        // Ürün rengi eşleşmesi
        if (features.colors.length) {
            totalCriteria++;
            const colorMatch = features.colors.some(color => {
                const normalizedColor = normalizeText(color);
                return prodColor === normalizedColor || 
                       productName.includes(normalizedColor) ||
                       productDesc.includes(normalizedColor);
            });
            if (colorMatch) { 
                score += 30;
                matchCount++; 
            }
        }

        // Oda rengi uyumluluğu kontrolü
        if (features.roomColors.length) {
            totalCriteria++;
            const roomColor = features.roomColors[0];
            const compatibleColors = features.colorCompatibility || [];
            
            // Ürün rengi oda rengiyle uyumlu mu kontrol et
            const isCompatible = compatibleColors.some(compatibleColor => {
                const normalizedCompatibleColor = normalizeText(compatibleColor);
                return prodColor === normalizedCompatibleColor || 
                       productName.includes(normalizedCompatibleColor) ||
                       productDesc.includes(normalizedCompatibleColor);
            });

            if (isCompatible) {
                score += 25;
                matchCount++;
            }
        }

        // Kategori eşleşmesi
        if (features.rooms.length) {
            totalCriteria++;
            const productCategoryId = product.category?._id?.toString();
            const match = features.rooms.some(room => {
                const normalizedRoom = normalizeText(room);
                // Önce kategori ID'si ile eşleştirme yap
                if (categoryMapping[normalizedRoom] === productCategoryId) {
                    return true;
                }
                // Sonra kategori adı ile eşleştirme yap
                const productCategoryName = normalizeText(product.category?.name || '');
                return productCategoryName === normalizedRoom;
            });
            if (match) { 
                score += 20; // Kategori eşleşmesi için puanı artırdım
                matchCount++; 
            }
        }

        // Stil eşleşmesi
        if (features.styles.length) {
            totalCriteria++;
            const styleMatch = product.tags?.some(tag =>
                features.styles.some(style => 
                    normalizeText(tag.name) === normalizeText(style)
                )
            ) || features.styles.some(style => 
                productName.includes(normalizeText(style)) ||
                productDesc.includes(normalizeText(style))
            );
            if (styleMatch) { score += 12; matchCount++; }
        }

        // Ürün türü eşleşmesi
        if (features.productTypes.length) {
            totalCriteria++;
            const typeMatch = features.productTypes.some(type => {
                const normalizedType = normalizeText(type);
                // Bileşik ürün türü kontrolü (örn: "köşe koltuk")
                if (type.includes(' ')) {
                    return productName.includes(normalizedType) || 
                           productDesc.includes(normalizedType);
                }
                // Tek kelimelik ürün türü kontrolü
                const words = productName.split(' ');
                return words.some(word => normalizeText(word) === normalizedType) || 
                       productName.includes(normalizedType) ||
                       productDesc.includes(normalizedType);
            });
            if (typeMatch) { score += 15; matchCount++; }
        }

        // Hiç kriter yoksa
        if (!totalCriteria) return { product, score: 0 };

        // Eşleşme yoksa
        if (!matchCount) return { product, score: 0 };

        // Çoklu kriter kontrolü
        const hasAllRequiredMatches = () => {
            // Ürün rengi kontrolü
            if (features.colors.length) {
                const hasColor = features.colors.some(color => {
                    const normalizedColor = normalizeText(color);
                    return prodColor === normalizedColor || 
                           productName.includes(normalizedColor) ||
                           productDesc.includes(normalizedColor);
                });
                if (!hasColor) return false;
            }

            // Ürün türü kontrolü
            if (features.productTypes.length) {
                const hasType = features.productTypes.some(type => {
                    const normalizedType = normalizeText(type);
                    if (type.includes(' ')) {
                        return productName.includes(normalizedType) || 
                               productDesc.includes(normalizedType);
                    }
                    const words = productName.split(' ');
                    return words.some(word => normalizeText(word) === normalizedType) || 
                           productName.includes(normalizedType) ||
                           productDesc.includes(normalizedType);
                });
                if (!hasType) return false;
            }

            // Stil kontrolü
            if (features.styles.length) {
                const hasStyle = product.tags?.some(tag =>
                    features.styles.some(style => 
                        normalizeText(tag.name) === normalizeText(style)
                    )
                ) || features.styles.some(style => 
                    productName.includes(normalizeText(style)) ||
                    productDesc.includes(normalizeText(style))
                );
                if (!hasStyle) return false;
            }

            return true;
        };

        // Eğer gerekli eşleşmeler yoksa ürünü ele
        if (!hasAllRequiredMatches()) {
            return { product, score: 0 };
        }

        // Bonus puan: Tüm kriterler eşleşiyorsa
        if (matchCount === totalCriteria) {
            score += 10;
        }

        return { product, score: Math.round(score * (matchCount / totalCriteria)) };
    });
}

function generateRecommendationMessage(f) {
    if (f.colors.length && f.productTypes.length) {
        return `İstediğiniz ${f.colors[0]} ${f.productTypes[0]} için öneriler:`;
    }
    if (f.styles.length && f.colors.length) {
        return `${f.styles[0]} stilde ${f.colors[0]} renkli ürünler için öneriler:`;
    }
    if (f.styles.length) {
        return `${f.styles[0]} stildeki ürünler için öneriler:`;
    }
    if (f.rooms.length) {
        return `${f.rooms[0]} için öneriler:`;
    }
    if (f.colors.length) {
        return `${f.colors[0]} renkli ürünler için öneriler:`;
    }
    return 'Sizin için önerilen ürünler:';
}
