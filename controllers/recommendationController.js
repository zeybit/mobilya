const Product = require('../models/productModel');
const axios = require('axios');
require('dotenv').config();

// Move categoryMapping to module scope so it can be accessed by all functions
const categoryMapping = {
    'çocuk odası': '68237650d79c9eb5f5520d62',
    'bahçe': '68237650d79c9eb5f5520d63',
    'çalışma odası': '68237650d79c9eb5f5520d64',
    'oturma odası': '68237650d79c9eb5f5520d65',
    'yatak odası': '68237650d79c9eb5f5520d66',
    'mutfak': '68237650d79c9eb5f5520d67',
    'yemek odası': '68237650d79c9eb5f5520d68'
};

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

// Oda boyutu standardizasyonu ve sınıflandırması (Veritabanına uygun - 3 sınıf)
const ROOM_SIZE_STANDARDS = {
    'küçük': { min: 0, max: 25, standardSizes: ['3x4', '3x5', '4x4', '4x5'], description: '12-25 m² arası' }, // Küçük odalar: 12-25 m²
    'small': { min: 0, max: 25, standardSizes: ['3x4', '3x5', '4x4', '4x5'], description: '12-25 m² arası' },
    'orta': { min: 25, max: 50, standardSizes: ['4x6', '5x6', '5x7', '6x7'], description: '25-50 m² arası' }, // Orta odalar: 25-50 m²
    'medium': { min: 25, max: 50, standardSizes: ['4x6', '5x6', '5x7', '6x7'], description: '25-50 m² arası' },
    'büyük': { min: 50, max: 200, standardSizes: ['6x8', '7x9', '8x8', '8x10'], description: '50 m² ve üzeri' }, // Büyük odalar: 50+ m²
    'large': { min: 50, max: 200, standardSizes: ['6x8', '7x9', '8x8', '8x10'], description: '50 m² ve üzeri' }
};

// Oda boyutlarından hacim ve sınıf hesaplama fonksiyonu (3 sınıf: küçük, orta, büyük)
function calculateRoomSizeFromDimensions(width, depth, height) {
    // Genişlik, derinlik ve yükseklik ile hacim hesapla (metre cinsinden)
    // Eğer yükseklik yoksa, alan bazlı sınıflandırma yap
    
    if (height && height > 0) {
        // Hacim hesaplama (m³)
        const volumeM3 = width * depth * height;
        
        // Hacim bazlı sınıflandırma (3 sınıf)
        if (volumeM3 <= 75) return 'küçük';     // 75 m³'e kadar küçük oda
        if (volumeM3 <= 150) return 'orta';    // 150 m³'e kadar orta oda  
        return 'büyük';                        // 150 m³ üzeri büyük oda
    } else {
        // Alan bazlı sınıflandırma (m²) - 3 sınıf
        const areaM2 = width * depth;
        
        if (areaM2 <= 25) return 'küçük';     // 25 m²'ye kadar küçük
        if (areaM2 <= 50) return 'orta';      // 50 m²'ye kadar orta
        return 'büyük';                       // 50 m² üzeri büyük
    }
}

// Oda boyutu string'ini metre kareleye çevirme
function parseRoomSizeToArea(roomSizeStr) {
    if (!roomSizeStr) return null;
    
    const normalized = roomSizeStr.toLowerCase().trim();
    const standards = ROOM_SIZE_STANDARDS[normalized];
    
    if (standards) {
        // Ortalama değer döndür
        return (standards.min + standards.max) / 2;
    }
    return null;
}

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

        // Bahçe kategorisindeki ürünleri kontrol et
        const gardenCategoryId = categoryMapping['bahçe'];
        const gardenProducts = products.filter(p => 
            p.category && 
            (p.category.toString() === gardenCategoryId || 
             (p.category._id && p.category._id.toString() === gardenCategoryId) ||
             (p.category.name && p.category.name.toLowerCase().includes('bahçe')))
        );
        console.log(`Bahçe kategorisindeki ürün sayısı: ${gardenProducts.length}`);
        if (gardenProducts.length === 0) {
            console.log('Kategori ID kontrolü:', categoryMapping['bahçe']);
            console.log('Mevcut kategori örnekleri:', products.slice(0, 3).map(p => ({
                name: p.name,
                categoryId: p.category && p.category._id ? p.category._id.toString() : p.category,
                categoryName: p.category && p.category.name ? p.category.name : 'N/A'
            })));
        }

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

IMPORTANT PREPROCESSING:
First, fix common text issues in Turkish:
- "o da" → "oda" (room)
- "odaboyutu" → "oda boyutu"
- "oda boyut" → "oda boyutu" 
- Apply fuzzy matching for room-related terms

Extract these features:
- color: (product color, e.g. "beyaz", "white", "gri", "gray", "mavi", "blue")
- room: (room type, e.g. "oturma odası", "living room", "çocuk odası", "kids room", "bahçe", "garden")
- style: (style, e.g. "modern", "minimalist", "vintage", "industrial")
- productType: (product type, e.g. "koltuk", "sofa", "couch", "masa", "table", "furniture" should be ignored as it's too generic)
- roomColor: (the color of the room, e.g. "beyaz", "white", "gri", "gray")
- roomSize: (the descriptive size of the room - ONLY these values: "küçük", "small", "orta", "medium", "büyük", "large")
- budget: (budget or price range, e.g. "5000 TL", "$1000", "orta", "düşük", "yüksek", "low", "medium", "high")
- brand: (brand name if mentioned)
- material: (material type, e.g. "ahşap", "wood", "metal", "fabric", "deri", "leather", "cam", "glass", "mdf", "plastik", "plastic", "kadife", "velvet", "mermer", "marble")
- quantity: (number of products, e.g. "2", "iki", "two")
- purpose: (intended use, e.g. "çalışmak için", "for working", "misafirler için", "for guests")
- warranty: (warranty period, e.g. "1 yıl", "2 yıl", "3 yıl", "1 year", "2 years", "3 years")
- productDimensions: (product dimensions - ONLY if dimensions are mentioned WITHOUT room keywords. Convert to METERS format like "2.0x1.5x0.8")
- roomDimensions: (room dimensions - ONLY if explicitly mentioned with room keywords or context. Convert to METERS format like "4.0x3.0x2.5")

CRITICAL DIMENSION RULES:
1. ROOM DIMENSIONS ARE ALREADY IN METERS - DO NOT CONVERT
2. Users will input room dimensions in meters (e.g. "oda boyutu: 4x5x2.5" means 4m x 5m x 2.5m)
3. PRIORITY ORDER for dimension extraction:
   a) If contains "oda boyutu", "room size", "oda ölçüsü", "room dimensions" → extract as roomDimensions DIRECTLY
   b) If contains "o da boyutu" (typo for "oda boyutu") → extract as roomDimensions DIRECTLY
   c) If contains room context words like "oda", "odanın", "room" near dimensions → extract as roomDimensions DIRECTLY
   d) If contains product name + dimensions → extract as productDimensions (may need conversion)
   e) If standalone dimensions without clear context → analyze surrounding words for hints
4. NEVER extract the same dimensions for both productDimensions and roomDimensions
5. When in doubt about context, prefer roomDimensions if any room-related words are present

ROOM SIZE CLASSIFICATION (Based on database - 3 categories only):
- "küçük"/"small": rooms 12-25 m² (e.g. single bedrooms, small studies)
- "orta"/"medium": rooms 25-50 m² (e.g. master bedrooms, living rooms in apartments)
- "büyük"/"large": rooms 50+ m² (e.g. large living rooms, open plan areas, luxury spaces)

EXAMPLES:
- "oda boyutu: 4x5x2.5" → roomDimensions: "4.0x5.0x2.5", productDimensions: "" (DIRECT - already meters)
- "oda boyutu 25x40x20" → roomDimensions: "25.0x40.0x20.0", productDimensions: "" (DIRECT - already meters)
- "o da boyutu 3.5x4x2.8" → roomDimensions: "3.5x4.0x2.8", productDimensions: "" (fixing typo, DIRECT)
- "beyaz koltuk oda boyutu: 6x8" → roomDimensions: "6.0x8.0", productDimensions: "" (DIRECT)
- "200x100 masa" → productDimensions: "2.0x1.0", roomDimensions: "" (product dimension, convert cm to m)
- "küçük oda için koltuk" → roomSize: "küçük", roomDimensions: "", productDimensions: ""
- "150x80x75 masa orta boyutta oda" → productDimensions: "1.5x0.8x0.75", roomSize: "orta"
- "300x200 oda için masa" → roomDimensions: "300.0x200.0", productDimensions: "" (room context, DIRECT)

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
  "warranty": "",
  "productDimensions": "",
  "roomDimensions": ""
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
        const budget = features.budget?.toLowerCase().trim() || '';
        const material = normalizeLLMValue(features.material, keywordMappings.malzeme);
        const warranty = features.warranty?.toLowerCase().trim() || '';

        // Oda boyutu normalize et
        let roomSize = '';
        if (features.roomSize) {
            const normalizedRoomSize = features.roomSize.toLowerCase().trim();
            // roomSize mapping (3 sınıf sadece)
            const roomSizeMap = {
                'küçük': 'küçük', 'small': 'küçük',
                'orta': 'orta', 'medium': 'orta',
                'büyük': 'büyük', 'large': 'büyük'
                // 'çok büyük' kaldırıldı - veritabanında yok
            };
            roomSize = roomSizeMap[normalizedRoomSize] || '';
        }

        // Boyut çıkarma fonksiyonu (değerleri direkt metre olarak kabul eder)
        function parseDimensionsToMeters(dimensionStr) {
            if (!dimensionStr) return null;
            
            const dimMatch = dimensionStr.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?/i);
            if (dimMatch) {
                let width = parseFloat(dimMatch[1]);
                let depth = parseFloat(dimMatch[2]);
                let height = dimMatch[3] ? parseFloat(dimMatch[3]) : undefined;

                // Değerleri direkt metre olarak kabul et (cm'den çevirme yok)
                // Kullanıcı zaten "oda boyutu: 4x5x2.5" şeklinde metre cinsinden girecek
                
                return {
                    width: Math.round(width * 100) / 100, // 2 ondalık basamak
                    depth: Math.round(depth * 100) / 100,
                    height: height ? Math.round(height * 100) / 100 : undefined
                };
            }
            return null;
        }

        // AI'dan gelen boyut bilgilerini işle
        let productDimensions = null;
        let roomDimensions = null;

        // Önce AI çıkarımını kontrol et
        if (features.roomDimensions && features.productDimensions) {
            console.warn('AI hem ürün hem oda boyutu çıkardı, kontrol ediliyor...');
            
            const hasRoomKeywords = /\b(oda boyutu|room size|oda ölçüsü|room dimensions)\s*[:=\-]/i.test(userInput);
            
            if (hasRoomKeywords) {
                roomDimensions = parseDimensionsToMeters(features.roomDimensions);
                productDimensions = null;
                console.log('Oda boyutu anahtar kelimesi bulundu, sadece oda boyutu kullanılıyor');
            } else {
                productDimensions = parseDimensionsToMeters(features.productDimensions);
                roomDimensions = null;
                console.log('Oda boyutu anahtar kelimesi bulunamadı, sadece ürün boyutu kullanılıyor');
            }
        } else if (features.roomDimensions) {
            roomDimensions = parseDimensionsToMeters(features.roomDimensions);
        } else if (features.productDimensions) {
            productDimensions = parseDimensionsToMeters(features.productDimensions);
        }

        // Eğer AI başarısız olursa, regex ile fallback yap
        if (!productDimensions && !roomDimensions) {
            console.log('AI boyut çıkarımı başarısız, regex fallback çalıştırılıyor...');
            
            // Önce "o da boyutu" typo'sunu düzelt
            let correctedInput = userInput
                .replace(/\bo\s+da\s+boyutu/gi, 'oda boyutu')
                .replace(/\bodaboyutu/gi, 'oda boyutu')
                .replace(/\boda\s+boyut\b/gi, 'oda boyutu');
            
            console.log('Düzeltilmiş input:', correctedInput);
            
            // Önce oda boyutu anahtar kelimelerini ara (düzeltilmiş metinde)
            const roomSizePatterns = [
                /(oda boyutu|room size|oda ölçüsü|room dimensions)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?/gi,
                // Oda kontekstli boyutlar için ek pattern
                /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(oda|room|odanın|odası)/gi
            ];
            
            let foundRoomDimensions = false;
            for (const pattern of roomSizePatterns) {
                const match = correctedInput.match(pattern);
                if (match) {
                    // İlk pattern için (oda boyutu: 300x400)
                    if (pattern.source.includes('oda boyutu')) {
                        let width = parseFloat(match[2]);
                        let depth = parseFloat(match[3]);
                        let height = match[4] ? parseFloat(match[4]) : undefined;

                        // Değerleri direkt metre olarak kabul et (çevirme yok)
                        // Kullanıcı "oda boyutu: 4x5x2.5" şeklinde metre cinsinden girecek
                        
                        roomDimensions = {
                            width: Math.round(width * 100) / 100,
                            depth: Math.round(depth * 100) / 100,
                            height: height ? Math.round(height * 100) / 100 : undefined
                        };
                        foundRoomDimensions = true;
                        console.log('Regex ile oda boyutu bulundu (metre):', roomDimensions);
                        break;
                    }
                    // İkinci pattern için (300x400 oda)
                    else {
                        let width = parseFloat(match[1]);
                        let depth = parseFloat(match[2]);
                        let height = match[3] ? parseFloat(match[3]) : undefined;

                        // Değerleri direkt metre olarak kabul et (çevirme yok)
                        
                        roomDimensions = {
                            width: Math.round(width * 100) / 100,
                            depth: Math.round(depth * 100) / 100,
                            height: height ? Math.round(height * 100) / 100 : undefined
                        };
                        foundRoomDimensions = true;
                        console.log('Regex ile kontekst oda boyutu bulundu (metre):', roomDimensions);
                        break;
                    }
                }
            }
            
            // Oda boyutu bulunamadıysa, ürün boyutu ara
            if (!foundRoomDimensions) {
                const productSizePatterns = [
                    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(cm|mm|m)?/gi
                ];
                
                for (const pattern of productSizePatterns) {
                    const match = userInput.match(pattern);
                    if (match) {
                        const fullMatch = match[0];
                        const dimensions = fullMatch.match(/(\d+(?:\.\d+)?)/g);
                        if (dimensions && dimensions.length >= 2) {
                            let width = parseFloat(dimensions[0]);
                            let depth = parseFloat(dimensions[1]);
                            let height = dimensions[2] ? parseFloat(dimensions[2]) : undefined;

                            // Birim kontrolü ve dönüşüm
                            const unit = match[4] || '';
                            if (unit === 'm') {
                                // Zaten metre cinsinden
                            } else if (unit === 'mm') {
                                width = width / 1000;
                                depth = depth / 1000;
                                if (height) height = height / 1000;
                            } else {
                                // Birim belirtilmemişse, büyük değerler cm kabul edilir
                                if (width > 50) width = width / 100;
                                if (depth > 50) depth = depth / 100;
                                if (height && height > 10) height = height / 100;
                            }

                            productDimensions = {
                                width: Math.round(width * 100) / 100,
                                depth: Math.round(depth * 100) / 100,
                                height: height ? Math.round(height * 100) / 100 : undefined
                            };
                            console.log('Regex ile ürün boyutu bulundu (metre):', productDimensions);
                            break;
                        }
                    }
                }
            }
        }

        // Eğer roomSize belirtilmemişse ama roomDimensions varsa, boyuttan hesapla
        if (!roomSize && roomDimensions) {
            // Hacim veya alan hesaplama (metre cinsinden)
            if (roomDimensions.height) {
                const volumeM3 = roomDimensions.width * roomDimensions.depth * roomDimensions.height;
                roomSize = calculateRoomSizeFromDimensions(roomDimensions.width, roomDimensions.depth, roomDimensions.height);
                console.log(`Oda boyutu hacimden hesaplandı: ${volumeM3.toFixed(1)} m³ → ${roomSize}`);
            } else {
                const areaM2 = roomDimensions.width * roomDimensions.depth;
                roomSize = calculateRoomSizeFromDimensions(roomDimensions.width, roomDimensions.depth, 0);
                console.log(`Oda boyutu alandan hesaplandı: ${areaM2.toFixed(1)} m² → ${roomSize}`);
            }
        }

        console.log('Final boyut kontrolü (metre):', { 
            productDimensions, 
            roomDimensions,
            roomSize,
            originalInput: userInput,
            aiProductDims: features.productDimensions,
            aiRoomDims: features.roomDimensions
        });

        // Çifte kontrol
        if (productDimensions && roomDimensions) {
            console.warn('Hala her iki boyut da mevcut, oda boyutu öncelikli tutulacak');
            productDimensions = null;
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
            roomDimensions,
            productDimensions
        };

    } catch (error) {
        console.error('LLM/AI Hatası:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // Fallback: regex ile ayrıştırma
        const input = userInput.toLowerCase();
        
        // Önce "o da boyutu" typo'sunu düzelt
        let correctedInput = userInput
            .replace(/\bo\s+da\s+boyutu/gi, 'oda boyutu')
            .replace(/\bodaboyutu/gi, 'oda boyutu')
            .replace(/\boda\s+boyut\b/gi, 'oda boyutu')
            .toLowerCase();
        
        console.log('Fallback - Düzeltilmiş input:', correctedInput);
        
        let productDimensions = null;
        let roomDimensions = null;
        let roomSize = '';

        // Oda boyutu sınıflandırması (3 sınıf sadece)
        const roomSizeKeywords = {
            'küçük': 'küçük', 'small': 'küçük',
            'orta': 'orta', 'medium': 'orta',
            'büyük': 'büyük', 'large': 'büyük'
            // 'çok büyük' kaldırıldı - veritabanında yok
        };

        for (const [key, value] of Object.entries(roomSizeKeywords)) {
            if (correctedInput.includes(key)) {
                roomSize = value;
                break;
            }
        }
        
        // Fallback boyut çıkarımı - düzeltilmiş input kullan, değerleri direkt metre olarak kabul et
        const roomSizeRegex = /(oda boyutu|room size|oda ölçüsü|room dimensions)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?/i;
        const roomMatch = correctedInput.match(roomSizeRegex);
        if (roomMatch) {
            let width = parseFloat(roomMatch[2]); // Direkt metre olarak kabul et
            let depth = parseFloat(roomMatch[3]);
            let height = roomMatch[4] ? parseFloat(roomMatch[4]) : undefined;
            
            roomDimensions = {
                width: Math.round(width * 100) / 100,
                depth: Math.round(depth * 100) / 100,
                height: height ? Math.round(height * 100) / 100 : undefined
            };
            console.log('Fallback: Oda boyutu bulundu (metre):', roomDimensions);
        }
        
        // Oda kontekstli boyutlar için ek kontrol
        if (!roomDimensions) {
            const contextRoomRegex = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(oda|room|odanın|odası)/i;
            const contextMatch = correctedInput.match(contextRoomRegex);
            if (contextMatch) {
                let width = parseFloat(contextMatch[1]); // Direkt metre olarak kabul et
                let depth = parseFloat(contextMatch[2]); 
                let height = contextMatch[3] ? parseFloat(contextMatch[3]) : undefined;
                
                roomDimensions = {
                    width: Math.round(width * 100) / 100,
                    depth: Math.round(depth * 100) / 100,
                    height: height ? Math.round(height * 100) / 100 : undefined
                };
                console.log('Fallback: Kontekst oda boyutu bulundu (metre):', roomDimensions);
            }
        }
        
        return {
            colors: Object.entries(keywordMappings.renk)
                .filter(([key]) => correctedInput.includes(key))
                .map(([_, value]) => value),
            styles: Object.entries(keywordMappings.stil)
                .filter(([key]) => correctedInput.includes(key))
                .map(([_, value]) => value),
            rooms: Object.entries(keywordMappings.oda)
                .filter(([key]) => correctedInput.includes(key))
                .map(([_, value]) => value),
            productTypes: Object.entries(keywordMappings.ürün)
                .filter(([key, val]) => correctedInput.includes(key) && val !== '')
                .map(([_, val]) => val),
            roomColors: [],
            roomSize,
            budget: '',
            material: [],
            warranty: '',
            colorCompatibility: [],
            productDimensions,
            roomDimensions
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
    features.material = features.material || [];
    features.roomDimensions = features.roomDimensions || null;
    features.productDimensions = features.productDimensions || null;

    function isProductMatchingDimensions(product, searchDimensions) {
        if (!searchDimensions) return true;
        if (!product.width || !product.depth) return true;
        
        const tolerance = 0.5; // 50cm tolerans (metre cinsinden)
        
        // Ürün boyutlarını metre cinsine çevir (cm'den)
        const productDims = [
            (product.width || 0) / 100,
            (product.depth || 0) / 100,
            (product.height || 0) / 100
        ].filter(d => d > 0).sort((a, b) => a - b);
        
        // Arama boyutları zaten metre cinsinde
        const searchDims = [
            searchDimensions.width || 0,
            searchDimensions.depth || 0,
            searchDimensions.height || 0
        ].filter(d => d > 0).sort((a, b) => a - b);
        
        console.log('Boyut karşılaştırması (metre):', {
            productDims,
            searchDims,
            productOriginal: { width: product.width/100, depth: product.depth/100, height: product.height/100 },
            searchOriginal: searchDimensions
        });
        
        // Boyut kontrolü (metre cinsinden)
        if (productDims.length !== searchDims.length) {
            const minLength = Math.min(productDims.length, searchDims.length);
            if (minLength < 2) return true;
            
            for (let i = 0; i < Math.min(2, minLength); i++) {
                if (Math.abs(productDims[i] - searchDims[i]) > tolerance) {
                    return false;
                }
            }
            return true;
        }
        
        for (let i = 0; i < productDims.length; i++) {
            if (Math.abs(productDims[i] - searchDims[i]) > tolerance) {
                console.log(`Boyut uyumsuzluğu: ${productDims[i].toFixed(2)}m vs ${searchDims[i].toFixed(2)}m, fark: ${Math.abs(productDims[i] - searchDims[i]).toFixed(2)}m`);
                return false;
            }
        }
        
        console.log('Boyut eşleşmesi başarılı!');
        return true;
    }

    function isProductFitToRoom(product, roomDimensions) {
        if (!roomDimensions) return true;
        if (!product.width || !product.depth) return true;
        
        // Ürün boyutlarını metre cinsine çevir
        const productWidthM = product.width / 100;
        const productDepthM = product.depth / 100;
        const productHeightM = product.height ? product.height / 100 : 0;
        
        if (productWidthM > roomDimensions.width || productDepthM > roomDimensions.depth) return false;
        if (roomDimensions.height && productHeightM && productHeightM > roomDimensions.height) return false;
        return true;
    }

    // RoomSize eşleşmesi için geliştirilmiş kontrol
    function isProductSuitableForRoomSize(product, roomSize) {
        if (!roomSize) return true;
        
        // Ürünün roomSize bilgisi extraAttributes'da mı var?
        const productRoomSize = product.extraAttributes?.roomSize;
        if (!productRoomSize) return true; // Ürünün roomSize bilgisi yoksa her odaya uygun kabul et
        
        // Normalize both values
        const normalizedProductRoomSize = productRoomSize.toLowerCase().trim();
        const normalizedSearchRoomSize = roomSize.toLowerCase().trim();
        
        // Direct match
        if (normalizedProductRoomSize === normalizedSearchRoomSize) return true;
        
        // Cross-language match (3 sınıf sadece)
        const roomSizeMapping = {
            'küçük': ['küçük', 'small'],
            'orta': ['orta', 'medium'],  
            'büyük': ['büyük', 'large']
            // 'çok büyük' kaldırıldı - veritabanında yok
        };
        
        for (const [key, values] of Object.entries(roomSizeMapping)) {
            if (values.includes(normalizedSearchRoomSize) && values.includes(normalizedProductRoomSize)) {
                return true;
            }
        }
        
        // Esneklik için: bir seviye yukarı/aşağı da kabul edilebilir (3 sınıf)
        const sizeHierarchy = ['küçük', 'orta', 'büyük'];
        const englishSizeHierarchy = ['small', 'medium', 'large'];
        
        const searchIndex = Math.max(
            sizeHierarchy.indexOf(normalizedSearchRoomSize),
            englishSizeHierarchy.indexOf(normalizedSearchRoomSize)
        );
        
        const productIndex = Math.max(
            sizeHierarchy.indexOf(normalizedProductRoomSize),
            englishSizeHierarchy.indexOf(normalizedProductRoomSize)
        );
        
        // Eğer her ikisi de geçerli indekslerse, 1 seviye fark kabul edilebilir
        if (searchIndex !== -1 && productIndex !== -1) {
            return Math.abs(searchIndex - productIndex) <= 1;
        }
        
        return false;
    }

    const scoredProducts = products.map(product => {
        // Oda uygunluk kontrolü
        if (features.roomDimensions && !isProductFitToRoom(product, features.roomDimensions)) {
            return { product, score: 0 };
        }
        
        // Ürün boyutu kontrolü
        if (features.productDimensions && !isProductMatchingDimensions(product, features.productDimensions)) {
            return { product, score: 0 };
        }

        let score = 0, matchCount = 0, totalCriteria = 0;
        const text = (product.name + ' ' + product.description).toLowerCase();
        const prodColor = normalizeText(product.color || '');
        const productName = normalizeText(product.name);
        const productDesc = normalizeText(product.description);
        const prodMaterial = normalizeText(product.materialType || '');

        // Boyut eşleşmesi için bonus puan
        if (features.productDimensions) {
            totalCriteria++;
            if (isProductMatchingDimensions(product, features.productDimensions)) {
                score += 50; // Boyut eşleşmesi için yüksek puan
                matchCount++;
            }
        }

        // Renk eşleşmesi
        if (features.colors.length > 0) {
            totalCriteria++;
            for (const color of features.colors) {
                if (prodColor === color || text.includes(color)) {
                    score += 25;
                    matchCount++;
                    break;
                }
            }
        }

        // Stil eşleşmesi
        if (features.styles.length > 0) {
            totalCriteria++;
            for (const style of features.styles) {
                if (text.includes(style)) {
                    score += 20;
                    matchCount++;
                    break;
                }
            }
        }

        // Ürün tipi eşleşmesi
        if (features.productTypes.length > 0) {
            totalCriteria++;
            for (const type of features.productTypes) {
                if (productName.includes(type) || productDesc.includes(type)) {
                    score += 30;
                    matchCount++;
                    break;
                }
            }
        }

        // Oda eşleşmesi
        if (features.rooms.length > 0) {
            totalCriteria++;
            let roomMatched = false;
            
            for (const room of features.rooms) {
                // Debug: Log room category matching attempts
                console.log(`Oda eşleşme kontrolü: "${room}", categoryId: ${categoryMapping[room]}`);
                
                const categoryId = categoryMapping[room];
                
                if (categoryId && product.category && 
                    (product.category.toString() === categoryId || 
                     (product.category._id && product.category._id.toString() === categoryId))) {
                    score += 25;
                    matchCount++;
                    roomMatched = true;
                    console.log(`Oda eşleşmesi bulundu: ${product.name} - ${room}`);
                    break;
                }
                
                // Kategori ID'si yerine kategori adını da kontrol et
                if (product.category && product.category.name && 
                    product.category.name.toLowerCase().includes(room.toLowerCase())) {
                    score += 25;
                    matchCount++;
                    roomMatched = true;
                    console.log(`Oda adı eşleşmesi bulundu: ${product.name} - ${product.category.name}`);
                    break;
                }
                
                // Ayrıca ürün adı ve açıklamasında da ara
                if (productName.includes(room) || productDesc.includes(room)) {
                    score += 20; // Tam kategori eşleşmesinden biraz daha düşük puan
                    matchCount++;
                    roomMatched = true;
                    console.log(`Ürün adı/açıklamasında oda eşleşmesi: ${product.name} - ${room}`);
                    break;
                }
            }
            
            // Debug: Log if no match was found
            if (!roomMatched) {
                console.log(`Oda eşleşmesi bulunamadı: ${product.name}, aranan: ${features.rooms[0]}`);
                console.log(`Ürün kategori: ${product.category && product.category.name ? product.category.name : product.category}`);
            }
        }

        // Malzeme eşleşmesi
        if (features.material.length > 0) {
            totalCriteria++;
            for (const material of features.material) {
                if (prodMaterial.includes(material) || text.includes(material)) {
                    score += 15;
                    matchCount++;
                    break;
                }
            }
        }

        // Oda boyutu (roomSize) kontrolü - YENİ EKLENEN
        if (features.roomSize) {
            totalCriteria++;
            if (isProductSuitableForRoomSize(product, features.roomSize)) {
                score += 20; // Oda boyutu eşleşmesi için puan
                matchCount++;
            }
        }

        // Bütçe kontrolü
        if (features.budget) {
            const budgetNum = parseBudget(features.budget);
            if (budgetNum && budgetNum > 0) {
                totalCriteria++;
                if (product.price <= budgetNum) {
                    score += 20;
                    matchCount++;
                } else if (product.price <= budgetNum * 1.2) {
                    score += 10; // %20 tolerans
                    matchCount += 0.5;
                }
            }
        }

        // Renk uyumluluğu bonusu
        if (features.colorCompatibility.length > 0) {
            for (const compatibleColor of features.colorCompatibility) {
                if (prodColor === compatibleColor) {
                    score += 5;
                    break;
                }
            }
        }

        // Eşleşme oranına göre final skor
        const matchRatio = totalCriteria > 0 ? matchCount / totalCriteria : 0;
        const finalScore = score * (1 + matchRatio);

        return { product, score: finalScore, matchCount, totalCriteria, matchRatio };
    });

    // Skor bilgilerini logla
    const nonZeroScores = scoredProducts.filter(item => item.score > 0);
    console.log(`Puanlanan ürün sayısı: ${nonZeroScores.length}`);
    nonZeroScores.forEach((item, index) => {
        if (index < 3) { // İlk 3 ürünün detayını göster
            console.log(`Ürün ${index + 1}: ${item.product.name}, Skor: ${item.score.toFixed(2)}, Eşleşme: ${item.matchCount}/${item.totalCriteria}`);
        }
    });

    return scoredProducts.sort((a, b) => b.score - a.score);
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
