const Product = require('../models/productModel');
const axios = require('axios');
require('dotenv').config();

const keywordMappings = {
    renk: {
        beyaz: 'beyaz', white: 'beyaz',
        siyah: 'siyah', black: 'siyah',
        gri: 'gri', gray: 'gri', grey: 'gri',
        kahverengi: 'kahverengi', brown: 'kahverengi',
        bej: 'bej', beige: 'bej',
        mavi: 'mavi', blue: 'mavi',
        kırmızı: 'kırmızı', red: 'kırmızı',
        yeşil: 'yeşil', green: 'yeşil',
        altın: 'altın', gold: 'altın'
    },
    stil: {
        modern: 'modern',
        klasik: 'klasik', classic: 'klasik',
        minimalist: 'minimalist',
        vintage: 'vintage',
        scandinav: 'scandinav', scandinavian: 'scandinav',
        rustik: 'rustik', rustic: 'rustik',
        bohem: 'bohem', bohemian: 'bohem',
        endüstriyel: 'endüstriyel', industrial: 'endüstriyel'
    },
    oda: {
        oturma: 'oturma odası', living: 'oturma odası', 'living room': 'oturma odası',
        yatak: 'yatak odası', bedroom: 'yatak odası', 'bed room': 'yatak odası',
        mutfak: 'mutfak', kitchen: 'mutfak',
        çalışma: 'çalışma odası', study: 'çalışma odası', 'study room': 'çalışma odası',
        yemek: 'yemek odası', dining: 'yemek odası', 'dining room': 'yemek odası',
        çocuk: 'çocuk odası', child: 'çocuk odası', kids: 'çocuk odası', 'kids room': 'çocuk odası',
        bahçe: 'bahçe', garden: 'bahçe'
    },
    ürün: {
        koltuk: 'koltuk', couch: 'koltuk', sofa: 'koltuk',
        kanepe: 'kanepe', settee: 'kanepe',
        sandalye: 'sandalye', chair: 'sandalye',
        masa: 'masa', table: 'masa',
        gardırop: 'gardırop', wardrobe: 'gardırop',
        yatak: 'yatak', bed: 'yatak',
        dolap: 'dolap', cupboard: 'dolap', closet: 'dolap',
        sehpa: 'sehpa', coffee: 'sehpa', 'coffee table': 'sehpa',
        kitaplık: 'kitaplık', bookshelf: 'kitaplık',
        raf: 'raf', shelf: 'raf',
        komodin: 'komodin', nightstand: 'komodin',
        puf: 'puf', pouf: 'puf', ottoman: 'puf',
        'televizyon ünitesi': 'televizyon ünitesi', 'tv unit': 'televizyon ünitesi', 'tv stand': 'televizyon ünitesi',
        'tv ünitesi': 'televizyon ünitesi', 'tv': 'televizyon ünitesi', 'televizyon': 'televizyon ünitesi'
    },
    genel: {
        // Bu kelimeler çok genel olduğu için ürün tipi olarak kullanılmamalı
        furniture: '', mobilya: '', ürün: '', product: ''
    },
    malzeme: {
        // Malzeme türleri - hem Türkçe hem İngilizce
        mdf: 'mdf', 'mdf lake': 'mdf',
        cam: 'cam', glass: 'cam',
        ahşap: 'ahşap', wood: 'ahşap', wooden: 'ahşap',
        kadife: 'kadife', velvet: 'kadife',
        metal: 'metal', metalik: 'metal',
        deri: 'deri', leather: 'deri',
        kumaş: 'kumaş', fabric: 'kumaş', textile: 'kumaş',
        plastik: 'plastik', plastic: 'plastik',
        mermer: 'mermer', marble: 'mermer',
        granit: 'granit', granite: 'granit',
        seramik: 'seramik', ceramic: 'seramik',
        laminat: 'laminat', laminate: 'laminat',
        lake: 'lake', 'lake boya': 'lake'
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

        let extractedFeatures;
        try {
            extractedFeatures = await extractFeaturesWithAI(userInput);
            console.log('Çıkarılan özellikler (AI):', extractedFeatures); // Debug log
        } catch (aiError) {
            console.log('AI hatası, fallback kullanılıyor:', aiError.message);
            // AI çalışmadığında direkt keyword mapping kullan
            const input = userInput.toLowerCase();
            extractedFeatures = {
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
                    .filter(([key, val]) => input.includes(key) && val !== '')
                    .map(([_, val]) => val),
                material: Object.entries(keywordMappings.malzeme)
                    .filter(([key]) => input.includes(key))
                    .map(([_, value]) => value),
                colorCompatibility: []
            };
            console.log('Fallback özellikler:', extractedFeatures);
        }
        // Tüm ürünleri getir (stok kontrolü kaldırıldı)
        const products = await Product.find({}).populate('category').populate('tags');
        console.log('Bulunan ürün sayısı:', products.length); // Debug log

        const scoredProducts = scoreProducts(products, extractedFeatures, userInput)
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
                const rescoredProducts = scoreProducts(products, directFeatures, userInput)
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
            // Kullanıcıdan alınan özellikleri birleştirerek mesaj oluştur
            let notFoundMsg = 'Aradığınız kriterlerde ürün bulunamadı.';
            if (extractedFeatures.colors.length && extractedFeatures.productTypes.length && extractedFeatures.budget) {
                notFoundMsg = `Belirttiğiniz bütçede (${extractedFeatures.budget}) ${extractedFeatures.colors[0]} ${extractedFeatures.productTypes[0]} bulunamadı.`;
            } else if (extractedFeatures.budget && extractedFeatures.productTypes.length) {
                notFoundMsg = `Belirttiğiniz bütçede (${extractedFeatures.budget}) ${extractedFeatures.productTypes[0]} bulunamadı.`;
            } else if (extractedFeatures.budget) {
                notFoundMsg = `Belirttiğiniz bütçede (${extractedFeatures.budget}) ürün bulunamadı.`;
            }
            return res.status(200).json({ 
                message: notFoundMsg,
                recommendations: [],
                extractedFeatures,
                recommendationMessage: notFoundMsg,
                isExactMatch: false,
                colorCompatibility: []
            });
        }

        // Skorlanan ürünleri tam eşleşen ve önerilen olarak ayır
        // const exactMatches = scoredProducts.filter(...);
        // const recommended = scoredProducts.filter(...);

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
You are a multilingual furniture assistant. Extract the following features from the user's search input, no matter which language is used (Turkish, English, etc):

Input: "${userInput}"

Extract these features:
- color: (product color, e.g. "beyaz", "white", "gri", "gray", "mavi", "blue")
- room: (room type, e.g. "oturma odası", "living room", "çocuk odası", "kids room", "bahçe", "garden")
- style: (style, e.g. "modern", "minimalist", "vintage", "industrial")
- productType: (product type, e.g. "koltuk", "sofa", "couch", "masa", "table", "furniture" should be ignored as it's too generic)
- roomColor: (the color of the room, e.g. "beyaz", "white", "gri", "gray")
- roomSize: (the size of the room, e.g. "küçük", "small", "büyük", "large", "orta", "medium")
- budget: (budget or price range, e.g. "5000 TL", "$1000", "orta", "düşük", "yüksek", "low", "medium", "high")
- brand: (brand name if mentioned)
- material: (material type, e.g. "ahşap", "wood", "metal", "fabric", "deri", "leather", "cam", "glass", "mdf", "plastik", "plastic", "kadife", "velvet", "mermer", "marble")
- quantity: (number of products, e.g. "2", "iki", "two")
- purpose: (intended use, e.g. "çalışmak için", "for working", "misafirler için", "for guests")
- warranty: (warranty period, e.g. "1 yıl", "2 yıl", "3 yıl", "1 year", "2 years", "3 years")

IMPORTANT RULES:
1. If the input contains "furniture", "ürün", "mobilya" without specific product type, leave productType empty
2. If the input contains "living room furniture", extract "living room" as room and leave productType empty
3. If the input contains "oturma odası ürünü", extract "oturma odası" as room and leave productType empty
4. If the input contains "modern furniture", extract "modern" as style and leave productType empty
5. Only extract specific product types like "koltuk", "sofa", "couch", "masa", "table", "chair", etc.

Return only a valid JSON like this:
{
  "color": "",
  "room": "",
  "style": "",
  "productType": "",
  "roomColor": "",
  "roomSize": "",
  "budget": "",
  "brand": "",
  "material": "",
  "quantity": "",
  "purpose": "",
  "warranty": ""
}

If a feature is not present, leave it as an empty string.
Return only the JSON, no explanation.
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
        const features = JSON.parse(jsonText);

        // Normalize LLM output using keywordMappings
        function normalizeLLMValue(val, map) {
            if (!val) return '';
            val = val.toLowerCase().trim();
            return map[val] || val;
        }

        const color = normalizeLLMValue(features.color, keywordMappings.renk);
        const style = normalizeLLMValue(features.style, keywordMappings.stil);
        const productType = normalizeLLMValue(features.productType, keywordMappings.ürün);
        const room = normalizeLLMValue(features.room, keywordMappings.oda);
        const roomColor = normalizeLLMValue(features.roomColor, keywordMappings.renk);
        const roomSize = features.roomSize?.toLowerCase().trim() || '';
        const budget = features.budget?.toLowerCase().trim() || '';
        const material = normalizeLLMValue(features.material, keywordMappings.malzeme);
        const warranty = features.warranty?.toLowerCase().trim() || '';

        // Oda boyutu (en x boy x yükseklik) gibi bir formatı yakala
        let roomDimensions = null;
        // Türkçe ve İngilizce varyasyonları destekle
        const roomSizeRegex = /(oda boyutu|room size|oda ölçüsü|room dimensions)\s*[:=\-]?\s*(\d{2,4})[x×](\d{2,4})(?:[x×](\d{2,4}))?/i;
        const match = userInput.match(roomSizeRegex);
        if (match) {
            roomDimensions = {
                width: parseInt(match[2], 10),
                depth: parseInt(match[3], 10),
                height: match[4] ? parseInt(match[4], 10) : undefined
            };
        }

        return {
            colors: color ? [color] : [],
            styles: style ? [style] : [],
            rooms: room ? [room] : [],
            productTypes: productType ? [productType] : [],
            roomColors: roomColor ? [roomColor] : [],
            roomSize,
            budget,
            material: material ? [material] : [],
            warranty,
            colorCompatibility: colorCompatibility[color] || [],
            roomDimensions
        };
    } catch (error) {
        console.error('LLM/AI Hatası:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        // Fallback: eski keywordMappings tabanlı çıkarım
        const input = userInput.toLowerCase();
        const colors = Object.entries(keywordMappings.renk)
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);
        const styles = Object.entries(keywordMappings.stil)
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);
        const rooms = Object.entries(keywordMappings.oda)
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);
        const productTypes = Object.entries(keywordMappings.ürün)
            .filter(([key, val]) => input.includes(key) && val !== '') // Boş değerleri filtrele
            .map(([_, val]) => val);
        // Basit fallback, diğer yeni alanlar boş döner
        return {
            colors,
            styles,
            rooms,
            productTypes,
            roomColors: [],
            roomSize: '',
            budget: '',
            material: '',
            warranty: '',
            colorCompatibility: colors.length ? (colorCompatibility[colors[0]] || []) : []
        };
    }
}

function normalizeText(text) {
    // Güvenli tip kontrolü
    if (!text || typeof text !== 'string') return '';
    
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

function parseBudget(budgetStr) {
    if (!budgetStr) return null;
    
    // "25 bin", "25k", "25.000 TL" gibi varyasyonları da destekle
    let str = budgetStr.toLowerCase().replace(/tl|₺|\$/g, '').trim();
    
    // Türkçe binlik ayırıcı (nokta) için özel işlem
    // "25.000" -> "25000" (nokta binlik ayırıcı olarak kullanılmışsa)
    if (str.includes('.')) {
        // Nokta sayısını kontrol et - eğer birden fazla nokta varsa veya son noktadan sonra 3 rakam varsa binlik ayırıcıdır
        const parts = str.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            // Eğer son kısım 3 rakamdan oluşuyorsa (25.000 gibi) binlik ayırıcıdır
            if (lastPart.length === 3 && /^\d{3}$/.test(lastPart)) {
                // Binlik ayırıcı olarak kullanılan noktaları kaldır
                str = str.replace(/\./g, '');
            } else {
                // Ondalık sayı olarak kabul et (25.5 gibi)
                str = str.replace(/,/g, '.');
            }
        }
    } else {
        // Nokta yoksa virgülü noktaya çevir (İngilizce format)
        str = str.replace(/,/g, '.');
    }
    
    // "bin" veya "k" varsa çarpan uygula
    if (str.includes('bin')) {
        str = str.replace(/[^0-9.]/g, '');
        let num = parseFloat(str);
        if (!isNaN(num)) return num * 1000;
    }
    if (str.includes('k')) {
        str = str.replace(/[^0-9.]/g, '');
        let num = parseFloat(str);
        if (!isNaN(num)) return num * 1000;
    }
    
    // Sadece rakam ve nokta (ondalık için)
    let clean = str.replace(/[^0-9.]/g, '');
    if (!clean) return null;
    let num = parseFloat(clean);
    if (isNaN(num)) return null;
    return num;
}

function scoreProducts(products, features, userInput = '') {
    features = features || {};
    features.colors = features.colors || [];
    features.roomColors = features.roomColors || [];
    features.styles = features.styles || [];
    features.rooms = features.rooms || [];
    features.productTypes = features.productTypes || [];
    features.colorCompatibility = features.colorCompatibility || [];
    features.roomSize = features.roomSize || '';
    features.budget = features.budget || '';
    features.material = features.material || '';
    features.roomDimensions = features.roomDimensions || null; // {width, depth, height}

    const categoryMapping = {
        'çocuk odası': '68237650d79c9eb5f5520d62',
        'bahçe': '68237650d79c9eb5f5520d63',
        'çalışma odası': '68237650d79c9eb5f5520d64',
        'oturma odası': '68237650d79c9eb5f5520d65',
        'yatak odası': '68237650d79c9eb5f5520d66',
        'mutfak': '68237650d79c9eb5f5520d67',
        'yemek odası': '68237650d79c9eb5f5520d68'
    };

    function isProductFitToRoom(product, roomDimensions) {
        if (!roomDimensions) return true;
        if (!product.width || !product.depth) return true;
        if (product.width > roomDimensions.width || product.depth > roomDimensions.depth) return false;
        if (roomDimensions.height && product.height && product.height > roomDimensions.height) return false;
        return true;
    }

    return products.map(product => {
        // Oda uygunluk kontrolü (en başta uygunsuzsa skor 0)
        if (features.roomDimensions && !isProductFitToRoom(product, features.roomDimensions)) {
            return { product, score: 0 };
        }

        let score = 0, matchCount = 0, totalCriteria = 0;
        const text = (product.name + ' ' + product.description).toLowerCase();
        const prodColor = normalizeText(product.color || '');
        const productName = normalizeText(product.name);
        const productDesc = normalizeText(product.description);
        const prodMaterial = normalizeText(product.material || '');
        const prodRoomSize = normalizeText(product.roomSize || '');
        const prodBudget = normalizeText(product.budget || '');

        // Ürün rengi eşleşmesi - Gelişmiş optimizasyon
        if (features.colors.length) {
            totalCriteria++;
            let colorMatch = false;
            let exactColorMatch = false;
            
            for (const color of features.colors) {
                const normalizedColor = normalizeText(color);
                
                // Ürün rengi ile tam eşleşme
                if (prodColor === normalizedColor) {
                    colorMatch = true;
                    exactColorMatch = true;
                    break;
                }
                
                // Ürün adında renk geçiyor
                if (productName.includes(normalizedColor)) {
                    colorMatch = true;
                    exactColorMatch = true;
                    break;
                }
                
                // Açıklamada renk geçiyor
                if (productDesc.includes(normalizedColor)) {
                    colorMatch = true;
                    break;
                }
            }
            
            if (colorMatch) {
                if (exactColorMatch) {
                    score += 35; // Tam renk eşleşmesi için yüksek puan
                } else {
                    score += 20; // Açıklamada geçen renk için düşük puan
                }
                matchCount++;
            }
        }

        // Oda rengi uyumluluğu kontrolü
        if (features.roomColors.length) {
            totalCriteria++;
            const roomColor = features.roomColors[0];
            const compatibleColors = features.colorCompatibility || [];
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

        // Kategori eşleşmesi - Gelişmiş optimizasyon
        if (features.rooms.length) {
            totalCriteria++;
            const productCategoryId = product.category?._id?.toString();
            const productCategoryName = normalizeText(product.category?.name || '');
            
            const match = features.rooms.some(room => {
                const normalizedRoom = normalizeText(room);
                if (categoryMapping[normalizedRoom] === productCategoryId) {
                    return true;
                }
                return productCategoryName === normalizedRoom;
            });
            
            if (match) { 
                score += 20;
                matchCount++; 
            }
        }
        
        // Ürün tipi ile kategori uyumluluğu bonus puanı
        if (features.productTypes.length && product.category?.name) {
            const productType = features.productTypes[0];
            const categoryName = product.category.name.toLowerCase();
            
            // Ürün tipi ile kategori uyumluluğu kontrolü
            const typeCategoryCompatibility = {
                'koltuk': ['oturma odası', 'salon'],
                'kanepe': ['oturma odası', 'salon'],
                'sofa': ['oturma odası', 'salon'],
                'couch': ['oturma odası', 'salon'],
                'yatak': ['yatak odası'],
                'bed': ['yatak odası'],
                'komodin': ['yatak odası'],
                'nightstand': ['yatak odası'],
                'gardırop': ['yatak odası'],
                'wardrobe': ['yatak odası'],
                'masa': ['çalışma odası', 'yemek odası', 'mutfak'],
                'table': ['çalışma odası', 'yemek odası', 'mutfak'],
                'sandalye': ['çalışma odası', 'yemek odası', 'mutfak'],
                'chair': ['çalışma odası', 'yemek odası', 'mutfak']
            };
            
            const compatibleCategories = typeCategoryCompatibility[productType] || [];
            if (compatibleCategories.some(cat => categoryName.includes(cat))) {
                score += 5; // Uyumlu kategori bonus puanı
            }
        }

        // Stil eşleşmesi - Gelişmiş optimizasyon
        if (features.styles.length) {
            totalCriteria++;
            let styleMatch = false;
            let exactStyleMatch = false;
            
            for (const style of features.styles) {
                const normalizedStyle = normalizeText(style);
                
                // Tag'larda tam eşleşme
                if (product.tags?.some(tag => normalizeText(tag.name) === normalizedStyle)) {
                    styleMatch = true;
                    exactStyleMatch = true;
                    break;
                }
                
                // Ürün adında tam eşleşme
                if (productName.includes(normalizedStyle)) {
                    styleMatch = true;
                    exactStyleMatch = true;
                    break;
                }
                
                // Açıklamada eşleşme
                if (productDesc.includes(normalizedStyle)) {
                    styleMatch = true;
                    break;
                }
            }
            
            if (styleMatch) {
                if (exactStyleMatch) {
                    score += 15; // Tam stil eşleşmesi için yüksek puan
                } else {
                    score += 8; // Açıklamada geçen stil için düşük puan
                }
                matchCount++;
            }
        }

        // Malzeme eşleşmesi - Yeni eklenen
        if (features.material && features.material.length > 0) {
            totalCriteria++;
            let materialMatch = false;
            let exactMaterialMatch = false;
            
            for (const material of features.material) {
                const normalizedMaterial = normalizeText(material);
                
                // materialType alanında tam eşleşme
                if (product.materialType && normalizeText(product.materialType) === normalizedMaterial) {
                    materialMatch = true;
                    exactMaterialMatch = true;
                    break;
                }
                
                // Ürün adında malzeme geçiyor
                if (productName.includes(normalizedMaterial)) {
                    materialMatch = true;
                    exactMaterialMatch = true;
                    break;
                }
                
                // Açıklamada malzeme geçiyor
                if (productDesc.includes(normalizedMaterial)) {
                    materialMatch = true;
                    break;
                }
                
                // Extra attributes'ta malzeme geçiyor
                if (product.extraAttributes && product.extraAttributes.materialType) {
                    const extraMaterial = normalizeText(product.extraAttributes.materialType);
                    if (extraMaterial === normalizedMaterial) {
                        materialMatch = true;
                        exactMaterialMatch = true;
                        break;
                    }
                }
            }
            
            if (materialMatch) {
                if (exactMaterialMatch) {
                    score += 25; // Tam malzeme eşleşmesi için yüksek puan
                } else {
                    score += 15; // Açıklamada geçen malzeme için düşük puan
                }
                matchCount++;
            }
        }

        // Ürün tipi eşleşmesi - Gelişmiş optimizasyon
        if (features.productTypes.length) {
            totalCriteria++;
            let typeMatch = false;
            let exactProductTypeMatch = false;
            
            for (const type of features.productTypes) {
                const normalizedType = normalizeText(type);
                
                // Tam ürün tipi eşleşmesi (ürün adında tam olarak geçiyor)
                if (productName.toLowerCase().includes(normalizedType)) {
                    typeMatch = true;
                    exactProductTypeMatch = true;
                    break;
                }
                
                // Ürün adında kelime bazında eşleşme
                const productWords = productName.toLowerCase().split(' ');
                if (productWords.includes(normalizedType)) {
                    typeMatch = true;
                    exactProductTypeMatch = true;
                    break;
                }
                
                // Açıklamada eşleşme (daha düşük öncelik)
                if (productDesc.toLowerCase().includes(normalizedType)) {
                    typeMatch = true;
                    break;
                }
            }
            
            if (typeMatch) {
                if (exactProductTypeMatch) {
                    score += 25; // Tam ürün tipi eşleşmesi için yüksek puan
                } else {
                    score += 10; // Açıklamada geçen ürün tipi için düşük puan
                }
                matchCount++;
            }
            

        }

        // Oda boyutu eşleşmesi
        if (features.roomSize) {
            totalCriteria++;
            const normalizedRoomSize = normalizeText(features.roomSize);
            const productRoomSize = normalizeText(product.roomSize || '');
            const extraRoomSize = normalizeText(product.extraAttributes?.roomSize || '');
            
            // Büyük oda için küçük/orta ürünleri ele
            if (normalizedRoomSize === 'büyük') {
                const productSize = extraRoomSize || productRoomSize;
                if (productSize === 'küçük' || productSize === 'orta') {
                    return { product, score: 0 }; // Bu ürünü ele
                }
            }
            
            // Küçük oda için büyük ürünleri ele
            if (normalizedRoomSize === 'küçük') {
                const productSize = extraRoomSize || productRoomSize;
                if (productSize === 'büyük') {
                    return { product, score: 0 }; // Bu ürünü ele
                }
            }
            
            const sizeMatch = prodRoomSize === normalizedRoomSize ||
                extraRoomSize === normalizedRoomSize ||
                productName.includes(normalizedRoomSize) ||
                productDesc.includes(normalizedRoomSize);
                
            if (sizeMatch) { 
                score += 15; // Oda boyutu eşleşmesi için daha yüksek puan
                matchCount++; 
            }
        }

        // Bütçe eşleşmesi
        if (features.budget) {
            totalCriteria++;
            const parsedBudget = parseBudget(features.budget);
            let budgetMatch = false;
            if (parsedBudget && product.price) {
                budgetMatch = product.price <= parsedBudget;
            } else {
                budgetMatch = prodBudget === normalizeText(features.budget) ||
                    productName.includes(normalizeText(features.budget)) ||
                    productDesc.includes(normalizeText(features.budget));
            }
            if (budgetMatch) { score += 8; matchCount++; }
        }

        // Malzeme eşleşmesi
        if (features.material && Array.isArray(features.material) && features.material.length > 0) {
            totalCriteria++;
            let materialMatch = false;
            
            for (const material of features.material) {
                if (material && typeof material === 'string') {
                    const normalizedMaterial = normalizeText(material);
                    if (prodMaterial === normalizedMaterial ||
                        productName.includes(normalizedMaterial) ||
                        productDesc.includes(normalizedMaterial)) {
                        materialMatch = true;
                        break;
                    }
                }
            }
            
            if (materialMatch) { 
                score += 8; 
                matchCount++; 
            }
        }

        // Garanti süresi eşleşmesi
        if (features.warranty || (userInput && (userInput.includes('garanti') || userInput.includes('warranty')))) {
            totalCriteria++;
            let requestedGaranti = '';
            
            // AI'dan gelen warranty bilgisini kontrol et
            if (features.warranty) {
                const warrantyMatch = features.warranty.match(/(\d+)\s*yıl/);
                if (warrantyMatch) {
                    requestedGaranti = warrantyMatch[1];
                }
            }
            
            // Eğer AI'dan gelmediyse userInput'tan çıkar
            if (!requestedGaranti) {
                const garantiMatch = userInput.match(/(\d+)\s*yıl/);
                if (garantiMatch) {
                    requestedGaranti = garantiMatch[1];
                }
            }
            
            if (requestedGaranti) {
                const productGaranti = product.extraAttributes?.garantiSuresi || '';
                const productGarantiMatch = productGaranti.match(/(\d+)\s*yıl/);
                
                if (productGarantiMatch && productGarantiMatch[1] === requestedGaranti) {
                    score += 20; // Garanti süresi eşleşmesi için yüksek puan
                    matchCount++;
                } else if (productGarantiMatch) {
                    // Garanti süresi eşleşmiyorsa ürünü ele
                    return { product, score: 0 };
                }
            }
        }

        // Arama sorgusundaki kelimeler ürün adı/açıklamasında geçiyorsa ekstra puan
        if (userInput) {
            const queryWords = userInput.split(/\s+/).map(w => w.trim().toLowerCase()).filter(Boolean);
            const allInNameOrDesc = queryWords.every(word =>
                productName.includes(word) || productDesc.includes(word)
            );
            if (allInNameOrDesc) {
                score += 20;
                matchCount++;
            }
            // Arama sorgusu ürün adı/açıklamasında bir alt string olarak geçiyorsa ekstra puan
            const normalizedQuery = userInput.trim().toLowerCase();
            if (productName.includes(normalizedQuery) || productDesc.includes(normalizedQuery)) {
                score += 20;
                matchCount++;
            }
        }

        // Arama sorgusunda moduleCount gibi bir ifade varsa ve ürünün moduleCount'u ile eşleşiyorsa ekstra puan
        if (userInput) {
            // Regex ile 1+1, 3+3+1+1 gibi ifadeleri bul
            const moduleCountMatch = userInput.match(/\d(\+\d)+/g);
            if (moduleCountMatch) {
                const moduleCountQuery = moduleCountMatch[0];
                // Ürünün moduleCount'u hem ana alan hem extraAttributes içinde olabilir
                const productModuleCount = (product.moduleCount || (product.extraAttributes && product.extraAttributes.moduleCount) || '').toString().toLowerCase();
                if (productModuleCount === moduleCountQuery) {
                    score += 20;
                    matchCount++;
                }
            }
        }

        // Arama sorgusunda X kapaklı gibi bir ifade varsa ve ürünün doorCount'u ile eşleşiyorsa ekstra puan
        if (userInput) {
            const doorCountMatch = userInput.match(/(\d+)\s*kapaklı/);
            if (doorCountMatch) {
                const doorCountQuery = parseInt(doorCountMatch[1], 10);
                const productDoorCount = Number(product.doorCount || (product.extraAttributes && product.extraAttributes.doorCount));
                if (productDoorCount === doorCountQuery) {
                    score += 20;
                    matchCount++;
                }
            }
        }

        // Ürün tipi kontrolü (zorunlu değil, sadece varsa kontrol et)
        if (features.productTypes.length) {
            const typeMatch = features.productTypes.some(type => {
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
            if (typeMatch) {
                score += 15; // Ürün tipi eşleşmesi için puan
                matchCount++;
            }
            // Ürün tipi eşleşmiyorsa skor 0 yapmıyoruz, diğer kriterlere göre değerlendiriyoruz
        }

        // Bütçe kontrolü: Eğer bütçe varsa ve ürün fiyatı bütçeden yüksekse, ürünü eliyoruz
        if (features.budget) {
            const parsedBudget = parseBudget(features.budget);
            if (parsedBudget && product.price && product.price > parsedBudget) {
                return { product, score: 0 };
            }
        }

        // Eğer sadece moduleCount eşleşmesi varsa ve başka kriter yoksa, yine de skoru sıfırdan büyük döndür
        if (!totalCriteria && score > 0) return { product, score };
        if (!totalCriteria) return { product, score: 0 };
        if (!matchCount) return { product, score: 0 };
        return { product, score: Math.round(score * (matchCount / totalCriteria)) };
    });
}

function generateRecommendationMessage(f) {
    let msg = '';
    if (f.colors && f.colors.length && f.productTypes && f.productTypes.length) {
        msg += `İstediğiniz ${f.colors[0]} ${f.productTypes[0]}`;
    } else if (f.styles && f.styles.length && f.colors && f.colors.length) {
        msg += `${f.styles[0]} stilde ${f.colors[0]} renkli ürünler`;
    } else if (f.styles && f.styles.length) {
        msg += `${f.styles[0]} stildeki ürünler`;
    } else if (f.rooms && f.rooms.length) {
        msg += `${f.rooms[0]} için ürünler`;
    } else if (f.colors && f.colors.length) {
        msg += `${f.colors[0]} renkli ürünler`;
    } else {
        msg += 'Sizin için önerilen ürünler';
    }
    if (f.roomColors && f.roomColors.length) {
        msg += ` (Oda rengi: ${f.roomColors[0]})`;
    }
    if (f.roomSize) {
        msg += `, oda boyutu: ${f.roomSize}`;
    }
    if (f.budget) {
        msg += `, bütçe: ${f.budget}`;
    }
    if (f.material) {
        msg += `, malzeme: ${f.material}`;
    }
    msg += ' için öneriler:';
    return msg;
}
