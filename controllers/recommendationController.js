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
        'televizyon ünitesi': 'televizyon ünitesi', 'tv unit': 'televizyon ünitesi', 'tv stand': 'televizyon ünitesi'
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
You are a multilingual furniture assistant. Extract the following features from the user's search input, no matter which language is used (Turkish, English, etc):

Input: "${userInput}"

Extract these features:
- color: (product color, e.g. "beyaz", "white", "gri", "gray", "mavi", "blue")
- room: (room type, e.g. "oturma odası", "living room", "çocuk odası", "kids room", "bahçe", "garden")
- style: (style, e.g. "modern", "minimalist", "vintage", "industrial")
- productType: (product type, e.g. "koltuk", "sofa", "couch", "masa", "table")
- roomColor: (the color of the room, e.g. "beyaz", "white", "gri", "gray")
- roomSize: (the size of the room, e.g. "küçük", "small", "büyük", "large", "orta", "medium")
- budget: (budget or price range, e.g. "5000 TL", "$1000", "orta", "düşük", "yüksek", "low", "medium", "high")
- brand: (brand name if mentioned)
- material: (material, e.g. "ahşap", "wood", "metal", "fabric", "deri", "leather")
- quantity: (number of products, e.g. "2", "iki", "two")
- purpose: (intended use, e.g. "çalışmak için", "for working", "misafirler için", "for guests")

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
  "purpose": ""
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
        const material = features.material?.toLowerCase().trim() || '';

        return {
            colors: color ? [color] : [],
            styles: style ? [style] : [],
            rooms: room ? [room] : [],
            productTypes: productType ? [productType] : [],
            roomColors: roomColor ? [roomColor] : [],
            roomSize,
            budget,
            material,
            colorCompatibility: colorCompatibility[color] || []
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
            .filter(([key]) => input.includes(key))
            .map(([_, value]) => value);
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
            colorCompatibility: colors.length ? (colorCompatibility[colors[0]] || []) : []
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

function parseBudget(budgetStr) {
    if (!budgetStr) return null;
    // "25 bin", "25k", "25.000 TL" gibi varyasyonları da destekle
    let str = budgetStr.toLowerCase().replace(/tl|₺|\$/g, '').trim();
    str = str.replace(/,/g, '.');
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
    // Sadece rakam ve nokta
    let clean = str.replace(/[^0-9.]/g, '');
    if (!clean) return null;
    let num = parseFloat(clean);
    if (isNaN(num)) return null;
    return num;
}

function scoreProducts(products, features) {
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
        const prodMaterial = normalizeText(product.material || '');
        const prodRoomSize = normalizeText(product.roomSize || '');
        const prodBudget = normalizeText(product.budget || '');

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
                if (categoryMapping[normalizedRoom] === productCategoryId) {
                    return true;
                }
                const productCategoryName = normalizeText(product.category?.name || '');
                return productCategoryName === normalizedRoom;
            });
            if (match) { 
                score += 20;
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
                if (type.includes(' ')) {
                    return productName.includes(normalizedType) || 
                           productDesc.includes(normalizedType);
                }
                const words = productName.split(' ');
                return words.some(word => normalizeText(word) === normalizedType) || 
                       productName.includes(normalizedType) ||
                       productDesc.includes(normalizedType);
            });
            if (typeMatch) { score += 15; matchCount++; }
        }

        // Oda boyutu eşleşmesi
        if (features.roomSize) {
            totalCriteria++;
            const sizeMatch = prodRoomSize === normalizeText(features.roomSize) ||
                productName.includes(normalizeText(features.roomSize)) ||
                productDesc.includes(normalizeText(features.roomSize));
            if (sizeMatch) { score += 8; matchCount++; }
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
        if (features.material) {
            totalCriteria++;
            const materialMatch = prodMaterial === normalizeText(features.material) ||
                productName.includes(normalizeText(features.material)) ||
                productDesc.includes(normalizeText(features.material));
            if (materialMatch) { score += 8; matchCount++; }
        }

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
