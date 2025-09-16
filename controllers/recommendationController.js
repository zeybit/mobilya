const Product = require('../models/productModel');
const axios = require('axios');
const openCartKeywordManager = require('../utils/openkeyword'); // Yeni OpenCart filter manager
require('dotenv').config();

// Veritabanından alınan gerçek kategori mapping'i
const categoryMapping = {
    'bahçe': '214',
    'gardrop': '215', 
    'yatak odası': '216',
    'koltuk': '217'
};

// Ters mapping - ID'den kategori adına
const categoryIdToName = {
    '214': 'bahçe',
    '215': 'gardrop',
    '216': 'yatak odası', 
    '217': 'koltuk'
};

// Genişletilmiş kategori eşleştirmeleri
const categoryAliases = {
    'bahçe': ['214', 'bahçe', 'garden', 'bahçe takımları'],
    'garden': ['214', 'bahçe', 'garden', 'bahçe takımları'],
    'gardrop': ['215', 'gardrop', 'wardrobe', 'dolap'],
    'wardrobe': ['215', 'gardrop', 'wardrobe', 'dolap'],
    'dolap': ['215', 'gardrop', 'wardrobe', 'dolap'],
    'yatak odası': ['216', 'yatak odası', 'bedroom', 'yatak odası mobilyaları'],
    'bedroom': ['216', 'yatak odası', 'bedroom', 'yatak odası mobilyaları'],
    'yatak': ['216', 'yatak odası', 'bedroom', 'yatak odası mobilyaları'],
    'koltuk': ['217', 'koltuk', 'sofa', 'koltuk takımları'],
    'sofa': ['217', 'koltuk', 'sofa', 'koltuk takımları'],
    'oturma odası': ['217', 'koltuk', 'sofa', 'koltuk takımları'],
    'living room': ['217', 'koltuk', 'sofa', 'koltuk takımları']
};

// Bütçe parse fonksiyonu   
function parseBudget(budgetStr) {
    if (!budgetStr) return null;        
    const cleaned = budgetStr.replace(/[^\d\-—]/g, '').replace(/—/g, '-');
    const parts = cleaned.split('-').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) return null;
    const numbers = parts.map(p => parseInt(p)).filter(n => !isNaN(n) && n > 0);        
    if (numbers.length === 0) return null;
    return Math.max(...numbers);
}

// Oda boyutu standardizasyonu ve sınıflandırması
const ROOM_SIZE_STANDARDS = {
    'küçük': { min: 0, max: 25, standardSizes: ['3x4', '3x5', '4x4', '4x5'], description: '12-25 m² arası' },
    'small': { min: 0, max: 25, standardSizes: ['3x4', '3x5', '4x4', '4x5'], description: '12-25 m² arası' },
    'orta': { min: 25, max: 50, standardSizes: ['4x6', '5x6', '5x7', '6x7'], description: '25-50 m² arası' },
    'medium': { min: 25, max: 50, standardSizes: ['4x6', '5x6', '5x7', '6x7'], description: '25-50 m² arası' },
    'büyük': { min: 50, max: 200, standardSizes: ['6x8', '7x9', '8x8', '8x10'], description: '50 m² ve üzeri' },
    'large': { min: 50, max: 200, standardSizes: ['6x8', '7x9', '8x8', '8x10'], description: '50 m² ve üzeri' }
};

function calculateRoomSizeFromDimensions(width, depth, height) {
    if (height && height > 0) {
        const volumeM3 = width * depth * height;
        if (volumeM3 <= 75) return 'küçük';
        if (volumeM3 <= 150) return 'orta';
        return 'büyük';
    } else {
        const areaM2 = width * depth;
        if (areaM2 <= 25) return 'küçük';
        if (areaM2 <= 50) return 'orta';
        return 'büyük';
    }
}

function parseRoomSizeToArea(roomSizeStr) {
    if (!roomSizeStr) return null;
    const normalized = roomSizeStr.toLowerCase().trim();
    const standards = ROOM_SIZE_STANDARDS[normalized];
    if (standards) {
        return (standards.min + standards.max) / 2;
    }
    return null;
}

function parseDimensionsFromText(text) {
    const result = {
        roomDimensions: null,
        productDimensions: null,
        roomSize: ''
    };
    
    // Boyut parsing mantığı aynı kalıyor
    const dimensionRegex = /(\d+(?:\.\d+)?)(?:cm)?\s*[x×*]\s*(\d+(?:\.\d+)?)(?:cm)?\s*(?:[x×*]\s*(\d+(?:\.\d+)?)(?:cm)?)?/g;
    const allMatches = [...text.matchAll(dimensionRegex)];
    
    if (allMatches.length > 0) {
        const match = allMatches[0];
        let dimensions = {
            width: parseFloat(match[1]),
            depth: parseFloat(match[2]),
            height: match[3] ? parseFloat(match[3]) : null
        };
        
        const hasCm = text.includes('cm');
        if (hasCm) {
            dimensions = {
                width: dimensions.width / 100,
                depth: dimensions.depth / 100,
                height: dimensions.height ? dimensions.height / 100 : null
            };
        }
        
        const area = dimensions.width * dimensions.depth;
        const isLikelyRoom = area > 15;
        
        if (isLikelyRoom) {
            result.roomDimensions = dimensions;
            result.roomSize = calculateRoomSizeFromDimensions(dimensions.width, dimensions.depth, dimensions.height);
        } else {
            result.productDimensions = dimensions;
        }
    }
    
    return result;
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

        console.log('Gelen sorgu:', userInput);

        // 1. AI ile ana özellik çıkarımı
        let extractedFeatures = await extractFeaturesWithAI(userInput);

        // 2. OpenCart filter ile ek/fine-tune özellik çıkarımı
        try {
            const ocFeatures = await extractFeaturesWithOpenCartFilters(userInput);
            // AI'dan gelen özellikleri, OpenCart ile bulduklarımızla birleştir (OpenCart bulursa ekle)
            Object.keys(ocFeatures).forEach(key => {
                if (
                    Array.isArray(ocFeatures[key]) && ocFeatures[key].length > 0
                ) {
                    // AI'da yoksa ekle, varsa birleştir
                    if (!Array.isArray(extractedFeatures[key])) {
                        extractedFeatures[key] = [];
                    }
                    ocFeatures[key].forEach(val => {
                        if (!extractedFeatures[key].includes(val)) {
                            extractedFeatures[key].push(val);
                        }
                    });
                } else if (
                    typeof ocFeatures[key] === 'string' && ocFeatures[key]
                ) {
                    if (!extractedFeatures[key]) {
                        extractedFeatures[key] = ocFeatures[key];
                    }
                } else if (
                    typeof ocFeatures[key] === 'number' && ocFeatures[key] != null
                ) {
                    if (!extractedFeatures[key]) {
                        extractedFeatures[key] = ocFeatures[key];
                    }
                } else if (
                    ocFeatures[key] != null && extractedFeatures[key] == null
                ) {
                    extractedFeatures[key] = ocFeatures[key];
                }
            });
        } catch (filterError) {
            console.log('OpenCart filter hatası:', filterError.message);
        }

        // Ürünleri getir - kategori ilişkisi dahil
        const products = await Product.getAllProducts();
        console.log('Bulunan ürün sayısı:', products.length);

        // Puanlama işlemi - OpenCart filter bilgileri dahil
        const scoredProductsRaw = await scoreProductsWithOpenCartFilters(products, extractedFeatures, userInput);
        const scoredProducts = scoredProductsRaw
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        console.log('Puanlanan ürün sayısı:', scoredProducts.length);
        
        // En iyi 5 sonucu döndür
        const recommendations = scoredProducts.slice(0, 5).map((p, i) => ({
            ...(p.product && typeof p.product.toObject === 'function' ? p.product.toObject() : p.product),
            isRecommended: i === 0,
            matchScore: p.score.toFixed(2),
            matchDetails: p.debugInfo,
            filterMatches: p.filterMatches || []
        }));

        if (recommendations.length === 0) {
            return res.status(200).json({ 
                message: 'Aradığınız kriterlerde ürün bulunamadı.',
                recommendations: [],
                extractedFeatures,
                suggestionMessage: `"${userInput}" için daha geniş arama yapın`,
                debug: {
                    totalProducts: products.length,
                    features: extractedFeatures
                }
            });
        }

        const msg = generateRecommendationMessage(extractedFeatures, userInput);

        res.status(200).json({
            recommendations,
            extractedFeatures,
            recommendationMessage: msg,
            totalFound: scoredProducts.length,
            debug: {
                totalProducts: products.length,
                scoredProducts: scoredProducts.length
            }
        });

    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ 
            message: 'Beklenmeyen hata oluştu.',
            error: error.message,
            recommendations: []
        });
    }
};

// OpenCart filter sistemini kullanan özellik çıkarımı
async function extractFeaturesWithOpenCartFilters(userInput) {
    const dimensions = parseDimensionsFromText(userInput);
    const input = userInput.toLowerCase();
    
    // OpenCart filter keyword mappings'i al
    const keywordMappings = await openCartKeywordManager.getKeywordMappings();
    console.log('KeywordMappings grupları:', Object.keys(keywordMappings));
    
    const features = {
        colors: [],
        styles: [],
        rooms: [],
        productTypes: [],
        materials: [],
        mirrorStatus: [], // yeni özellik
        roomSize: dimensions.roomSize || '',
        budget: '',
        warranty: '',
        doorCount: null,
        roomDimensions: dimensions.roomDimensions,
        productDimensions: dimensions.productDimensions,
        filterMatches: {} // OpenCart filter eşleşmeleri
    };
    
    // Her keyword kategorisini kontrol et
    for (const [groupName, mappings] of Object.entries(keywordMappings)) {
        for (const [keyword, mappedValue] of Object.entries(mappings)) {
            if (input.includes(keyword.toLowerCase()) || input.includes(mappedValue.toLowerCase())) {
                console.log(`Eşleşen keyword: ${keyword} -> ${mappedValue} (Grup: ${groupName})`);
                // Grup tipine göre features'e ekle
                if (groupName.includes('renk') || groupName.includes('color')) {
                    if (!features.colors.includes(mappedValue)) {
                        features.colors.push(mappedValue);
                        features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                        features.filterMatches[groupName].push({ keyword, mappedValue });
                    }
                } else if (groupName.includes('stil') || groupName.includes('style') || groupName.includes('tarz')) {
                    if (!features.styles.includes(mappedValue)) {
                        features.styles.push(mappedValue);
                        features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                        features.filterMatches[groupName].push({ keyword, mappedValue });
                    }
                } 
                // Malzeme grubu eşleşmesi DAHA ESNEK: "malzeme" kelimesini içeren her grup
                else if (groupName.includes('malzeme')) {
                    if (!features.materials.includes(mappedValue)) {
                        features.materials.push(mappedValue);
                        features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                        features.filterMatches[groupName].push({ keyword, mappedValue });
                    }
                } else if (groupName.includes('material')) {
                    if (!features.materials.includes(mappedValue)) {
                        features.materials.push(mappedValue);
                        features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                        features.filterMatches[groupName].push({ keyword, mappedValue });
                    }
                } else if (groupName.includes('ayna')) {
                    // Ayna durumu için özel alan
                    if (!features.mirrorStatus.includes(mappedValue)) {
                        features.mirrorStatus.push(mappedValue);
                        features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                        features.filterMatches[groupName].push({ keyword, mappedValue });
                    }
                } else if (groupName.includes('boyut') || groupName.includes('size') || groupName.includes('ebat')) {
                    // Boyut eşleşmeleri zaten parseDimensionsFromText'te yapılıyor
                    features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                    features.filterMatches[groupName].push({ keyword, mappedValue });
                } else if (groupName.includes('garanti')) {
                    // Garanti durumu için özel alan
                    if (!features.warranty || features.warranty === '') {
                        features.warranty = mappedValue;
                    }
                    features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                    features.filterMatches[groupName].push({ keyword, mappedValue });
                } else if (groupName.includes('kapak')) {
                    // Kapak sayısı için filterMatches'a ekle
                    features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                    features.filterMatches[groupName].push({ keyword, mappedValue });
                    // Kapak sayısı numeric ise ata, ancak inputta "kapak" kelimesiyle birlikte geçiyorsa ata
                    const num = parseInt(mappedValue);
                    // Sadece "kapak" kelimesiyle birlikte geçen sayıları ata
                    if (!isNaN(num) && (
                        input.match(new RegExp(`\\b${num}\\s*kapak\\b`)) // örn: "2 kapak"
                        || input.match(new RegExp(`\\bkapak\\s*${num}\\b`)) // örn: "kapak 2"
                    )) {
                        features.doorCount = num;
                    }
                }
                // Bütçe grubu için ek kontrol (ör: "bütçe", "tl", "lira", "₺" içeren keywordler)
                if (
                    groupName.includes('bütçe') ||
                    groupName.includes('price') ||
                    groupName.includes('fiyat') ||
                    groupName.includes('tl') ||
                    groupName.includes('lira') ||
                    groupName.includes('₺')
                ) {
                    // mappedValue sayısal ise ata
                    const num = parseInt(mappedValue.replace(/[^\d]/g, ''));
                    if (!isNaN(num) && num > 0) {
                        features.budget = num.toString();
                    }
                    features.filterMatches[groupName] = features.filterMatches[groupName] || [];
                    features.filterMatches[groupName].push({ keyword, mappedValue });
                }
                // Diğer kategoriler...
            }
        }
    }
    // Kapak sayısını bul
    const doorCountMatch = input.match(/(\d+)\s*kapak/i);
    if (doorCountMatch) {
        features.doorCount = parseInt(doorCountMatch[1]);
    }
    // Bütçe bul (doğrudan sayısal ifade)
    const budgetMatch = input.match(/(\d+(?:\.\d+)?(?:k|bin)?)\s*(?:tl|lira|₺)?/i);
    if (budgetMatch) {
        const num = parseInt(budgetMatch[1].replace(/[^\d]/g, ''));
        if (!isNaN(num) && num > 0) {
            features.budget = num.toString();
        }
    }
    
    // Oda türlerini bul (mevcut mantık)
    Object.entries(categoryAliases).forEach(([room, aliases]) => {
        // Normal eşleşme
        if (aliases.some(alias => input.includes(alias.toLowerCase()))) {
            if (!features.rooms.includes(room)) {
                features.rooms.push(room);
            }
        }
        // Fuzzy eşleşme: 1 harf hatalı ise de eşleşsin
        else {
            for (const alias of aliases) {
                const normAlias = alias.toLowerCase();
                if (
                    normAlias.length > 3 &&
                    input.split(' ').some(word =>
                        word.length === normAlias.length &&
                        levenshtein(word, normAlias) === 1
                    )
                ) {
                    if (!features.rooms.includes(room)) {
                        features.rooms.push(room);
                    }
                }
            }
        }
    });

    // Levenshtein mesafesi fonksiyonu (en kısa haliyle)
    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
    
    console.log('OpenCart Filter Features:', features);

    // Eğer rooms, productTypes, styles, materials, colors gibi anahtar alanlardan hiçbiri dolmadıysa
    // ve inputta en az bir kelime varsa, AI fallback'i tetikle
    if (
        !features.rooms.length &&
        !features.productTypes.length &&
        !features.styles.length &&
        !features.materials.length &&
        !features.colors.length &&
        input.split(' ').length > 0
    ) {
        console.log('OpenCart eşleşmesi yetersiz, AI fallback tetikleniyor...');
        // AI ile tekrar özellik çıkarımı
        const aiFeatures = await extractFeaturesWithAI(userInput);
        // Sadece boş olan alanları doldur
        Object.keys(aiFeatures).forEach(key => {
            if (
                (Array.isArray(features[key]) && features[key].length === 0 && Array.isArray(aiFeatures[key]) && aiFeatures[key].length > 0) ||
                (typeof features[key] === 'string' && !features[key] && aiFeatures[key]) ||
                (features[key] == null && aiFeatures[key] != null)
            ) {
                features[key] = aiFeatures[key];
            }
        });
    }

    return features;
}

// OpenCart filter bilgilerini kullanarak ürün puanlama
async function scoreProductsWithOpenCartFilters(products, features, userInput = '') {
    console.log('OpenCart filter tabanlı puanlama başlıyor:', {
        productCount: products.length,
        features: features
    });

    const scoredProducts = await Promise.all(products.map(async (product, index) => {
        if (!product || !product.name) {
            return { product, score: 0, debugInfo: { error: 'Invalid product' }, filterMatches: [] };
        }

        // Ürünün filter bilgilerini al
        const productFilters = await openCartKeywordManager.getProductFilters(product.product_id);

        let score = 0;
        let matchCount = 0;
        let totalCriteria = 0;
        let debugInfo = { matches: [], checks: [], filterMatches: [] };
        let filterMatches = [];

        const productName = normalizeText(product.name || '');
        const productDescription = normalizeText(product.description || '');
        const combinedText = productName + ' ' + productDescription;

        // 1. OPENCART FILTER EŞLEŞMELERİ
        if (features.filterMatches && Object.keys(features.filterMatches).length > 0) {
            for (const [filterGroupName, matches] of Object.entries(features.filterMatches)) {
                totalCriteria++;
                let groupMatched = false;

                // Bu filter grubunda ürünün filterleri var mı kontrol et
                const normalizedGroupName = filterGroupName.toLowerCase();
                const productGroupFilters = productFilters[normalizedGroupName] || [];

                for (const match of matches) {
                    // Ürünün bu filter değerine sahip olup olmadığını kontrol et
                    const hasFilter = productGroupFilters.some(pf => 
                        pf.name.toLowerCase().includes(match.mappedValue.toLowerCase()) ||
                        match.mappedValue.toLowerCase().includes(pf.name.toLowerCase())
                    );

                    if (hasFilter) {
                        score += 50; // Yüksek puan - filter eşleşmesi
                        matchCount++;
                        groupMatched = true;
                        debugInfo.matches.push(`Filter eşleşmesi: ${filterGroupName} -> ${match.mappedValue}`);
                        filterMatches.push({
                            group: filterGroupName,
                            keyword: match.keyword,
                            value: match.mappedValue,
                            matchType: 'filter'
                        });
                        break;
                    }
                }

                debugInfo.checks.push(`Filter grup kontrolü ${filterGroupName}: ${groupMatched ? 'Eşleşti' : 'Eşleşmedi'}`);
            }
        }

        // 2. RENK EŞLEŞMESİ (Filter + Metin)
        if (features.colors && features.colors.length > 0) {
            totalCriteria++;
            let colorMatched = false;

            for (const color of features.colors) {
                const normalizedColor = normalizeText(color);
                
                // Filter'da renk kontrolü
                const colorFilters = productFilters['renk'] || productFilters['color'] || [];
                const hasColorFilter = colorFilters.some(cf => 
                    normalizeText(cf.name).includes(normalizedColor)
                );

                // Metin'de renk kontrolü
                const hasColorInText = combinedText.includes(normalizedColor) || 
                    normalizeText(product.color || '').includes(normalizedColor);

                if (hasColorFilter) {
                    score += 40;
                    colorMatched = true;
                    debugInfo.matches.push(`Renk (filter): ${color}`);
                    filterMatches.push({ group: 'renk', value: color, matchType: 'filter' });
                } else if (hasColorInText) {
                    score += 25;
                    colorMatched = true;
                    debugInfo.matches.push(`Renk (metin): ${color}`);
                    filterMatches.push({ group: 'renk', value: color, matchType: 'text' });
                }

                if (colorMatched) break;
            }

            if (colorMatched) matchCount++;
        }

        // 3. STİL EŞLEŞMESİ (Filter + Metin)
        if (features.styles && features.styles.length > 0) {
            totalCriteria++;
            let styleMatched = false;

            for (const style of features.styles) {
                const normalizedStyle = normalizeText(style);
                
                // Filter'da stil kontrolü
                const styleFilters = productFilters['stil'] || productFilters['style'] || productFilters['tarz'] || [];
                const hasStyleFilter = styleFilters.some(sf => 
                    normalizeText(sf.name).includes(normalizedStyle)
                );

                if (hasStyleFilter) {
                    score += 35;
                    styleMatched = true;
                    debugInfo.matches.push(`Stil (filter): ${style}`);
                    filterMatches.push({ group: 'stil', value: style, matchType: 'filter' });
                } else if (combinedText.includes(normalizedStyle)) {
                    score += 20;
                    styleMatched = true;
                    debugInfo.matches.push(`Stil (metin): ${style}`);
                    filterMatches.push({ group: 'stil', value: style, matchType: 'text' });
                }

                if (styleMatched) break;
            }

            if (styleMatched) matchCount++;
        }

        // 4. MALZEME EŞLEŞMESİ (Filter + Metin)
        if (features.materials && features.materials.length > 0) {
            totalCriteria++;
            let materialMatched = false;

            for (const material of features.materials) {
                const normalizedMaterial = normalizeText(material);
                
                // Filter'da malzeme kontrolü
                const materialFilters = productFilters['malzeme'] || productFilters['material'] || [];
                const hasMaterialFilter = materialFilters.some(mf => 
                    normalizeText(mf.name).includes(normalizedMaterial)
                );

                if (hasMaterialFilter) {
                    score += 30;
                    materialMatched = true;
                    debugInfo.matches.push(`Malzeme (filter): ${material}`);
                    filterMatches.push({ group: 'malzeme', value: material, matchType: 'filter' });
                } else if (combinedText.includes(normalizedMaterial) || 
                           normalizeText(product.materialType || '').includes(normalizedMaterial)) {
                    score += 15;
                    materialMatched = true;
                    debugInfo.matches.push(`Malzeme (metin): ${material}`);
                    filterMatches.push({ group: 'malzeme', value: material, matchType: 'text' });
                }

                if (materialMatched) break;
            }

            if (materialMatched) matchCount++;
        }

        // 5. BOYUT EŞLEŞMESİ (Filter tabanlı)
        if (features.productDimensions) {
            totalCriteria++;
            
            // Filter'da boyut kontrolü
            const sizeFilters = productFilters['boyut'] || productFilters['size'] || productFilters['ebat'] || [];
            let sizeMatched = false;
            
            const searchDimStr = `${features.productDimensions.width}x${features.productDimensions.depth}`;
            
            for (const sizeFilter of sizeFilters) {
                if (sizeFilter.name.toLowerCase().includes(searchDimStr.toLowerCase())) {
                    score += 45;
                    sizeMatched = true;
                    debugInfo.matches.push(`Boyut (filter): ${sizeFilter.name}`);
                    filterMatches.push({ group: 'boyut', value: sizeFilter.name, matchType: 'filter' });
                    break;
                }
            }
            
            if (sizeMatched) matchCount++;
        }

        // 6. DİĞER MEVCUT KONTROLER (Kategori, Bütçe, vb.)
        // Kategori eşleşmesi
        if (features.rooms && features.rooms.length > 0) {
            totalCriteria++;
            let roomMatched = false;
            
            for (const room of features.rooms) {
                const categoryId = categoryMapping[room];
                
                if (categoryId && product.category_id && 
                    product.category_id.toString() === categoryId) {
                    score += 40;
                    matchCount++;
                    roomMatched = true;
                    debugInfo.matches.push(`Kategori eşleşmesi: ${room}`);
                    filterMatches.push({ group: 'kategori', value: room, matchType: 'category' });
                    break;
                }
            }
        }

        // Bütçe kontrolü
        if (features.budget) {
            const budgetNum = parseBudget(features.budget);
            if (budgetNum && budgetNum > 0 && product.price) {
                totalCriteria++;
                if (product.price <= budgetNum) {
                    score += 30;
                    matchCount++;
                    debugInfo.matches.push(`Bütçe: ${product.price} <= ${budgetNum}`);
                    filterMatches.push({ group: 'bütçe', value: budgetNum, matchType: 'price' });
                }
            }
        }

        // Kapak sayısı kontrolü
        if (features.doorCount) {
            totalCriteria++;
            
            // Filter'da kapak sayısı kontrolü
            const doorFilters = productFilters['kapak sayısı'] || productFilters['door count'] || [];
            let doorMatched = false;
            
            for (const doorFilter of doorFilters) {
                const filterDoorCount = parseInt(doorFilter.name.match(/(\d+)/)?.[1]);
                if (filterDoorCount === features.doorCount) {
                    score += 35;
                    matchCount++;
                    doorMatched = true;
                    debugInfo.matches.push(`Kapak sayısı (filter): ${features.doorCount}`);
                    filterMatches.push({ group: 'kapak_sayısı', value: features.doorCount, matchType: 'filter' });
                    break;
                }
            }
            
            // Metin tabanlı kontrol (fallback)
            if (!doorMatched) {
                if (product.doorCount && product.doorCount === features.doorCount) {
                    score += 30;
                    matchCount++;
                    doorMatched = true;
                    debugInfo.matches.push(`Kapak sayısı (attribute): ${features.doorCount}`);
                }
            }
        }

        // Fallback - Direkt kelime eşleşmesi
        if (totalCriteria === 0 || score === 0) {
            const normalizedInput = normalizeText(userInput);
            const inputWords = normalizedInput.split(' ').filter(word => word.length > 1);
            for (const word of inputWords) {
                if (word === 'l') continue;
                if (productName.includes(word) || productDescription.includes(word)) {
                    score += 25;
                    matchCount++;
                    debugInfo.matches.push(`Direkt kelime: ${word}`);
                    filterMatches.push({ group: 'kelime', value: word, matchType: 'text' });
                }
            }
            if (inputWords.length > 0) {
                totalCriteria = 1;
                debugInfo.checks.push(`Fallback aktif, kelimeler: ${inputWords.join(', ')}`);
            }
        }

        // Final skor hesaplama
        const matchRatio = totalCriteria > 0 ? matchCount / totalCriteria : 0;
        const finalScore = score * (1 + matchRatio * 0.3);

        debugInfo.summary = {
            baseScore: score,
            finalScore: finalScore.toFixed(2),
            matchCount,
            totalCriteria,
            matchRatio: matchRatio.toFixed(2),
            filterMatchCount: filterMatches.length
        };

        if (finalScore > 0) {
            console.log(`✅ ${product.name}: ${finalScore.toFixed(2)} puan (${matchCount}/${totalCriteria}) [${filterMatches.length} filter]`);
        }

        return { 
            product, 
            score: finalScore, 
            matchCount, 
            totalCriteria, 
            matchRatio, 
            debugInfo,
            filterMatches
        };
    }));

    return scoredProducts;
}

// Basit özellik çıkarımı (fallback)
function extractFeaturesBasic(userInput) {
    const input = userInput.toLowerCase();
    const dimensions = parseDimensionsFromText(userInput);
    
    // Kapak sayısını bul
    let doorCount = null;
    const doorCountMatch = input.match(/(\d+)\s*kapak/i);
    if (doorCountMatch) {
        doorCount = parseInt(doorCountMatch[1]);
    }

    return {
        colors: [],
        styles: [],
        rooms: [],
        productTypes: [],
        materials: [],
        roomColors: [],
        roomSize: dimensions.roomSize || '',
        budget: '',
        warranty: '',
        doorCount: doorCount,
        colorCompatibility: [],
        roomDimensions: dimensions.roomDimensions,
        productDimensions: dimensions.productDimensions,
        filterMatches: {}
    };
}

// AI özellik çıkarımı (geliştirilen)
async function extractFeaturesWithAI(userInput) {
    try {
        const dimensions = parseDimensionsFromText(userInput);
        const prompt = `
Kullanıcı girdisi: "${userInput}"

Bu girdiden şu özellikleri çıkar:
- productType: ürün türü (koltuk, masa, sandalye vs.)
- color: renk
- room: oda türü (oturma odası, yatak odası vs.)
- style: stil (modern, klasik vs.)
- budget: bütçe
- material: malzeme
- doorCount: kapak sayısı (sadece sayı olarak döndür, örn: 2, 3, 4. Eğer belirtilmemişse null)
- warranty: garanti süresi

Sadece JSON formatında yanıt ver:
{
  "productType": "",
  "color": "",
  "room": "",
  "style": "",
  "budget": "",
  "material": "",
  "doorCount": null,
  "warranty": ""
}
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
        const features = JSON.parse(jsonText);

        return {
            colors: features.color ? [features.color] : [],
            styles: features.style ? [features.style] : [],
            rooms: features.room ? [features.room] : [],
            productTypes: features.productType ? [features.productType] : [],
            materials: features.material ? [features.material] : [],
            roomColors: [],
            roomSize: dimensions.roomSize || '',
            budget: features.budget || '',
            warranty: features.warranty || '',
            doorCount: features.doorCount ? parseInt(features.doorCount) : null,
            colorCompatibility: [],
            roomDimensions: dimensions.roomDimensions,
            productDimensions: dimensions.productDimensions,
            filterMatches: {}
        };

    } catch (error) {
        console.error('AI Error:', error.message);
        return extractFeaturesBasic(userInput);
    }
}

function normalizeText(text) {
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

function generateRecommendationMessage(features, userInput) {
    let msg = '';
    if (features.colors && features.colors.length && features.productTypes && features.productTypes.length) {
        msg += `İstediğiniz ${features.colors[0]} ${features.productTypes[0]}`;
    } else if (features.styles && features.styles.length && features.colors && features.colors.length) {
        msg += `${features.styles[0]} stilde ${features.colors[0]} renkli ürünler`;
    } else if (features.styles && features.styles.length) {
        msg += `${features.styles[0]} stildeki ürünler`;
    } else if (features.rooms && features.rooms.length) {
        msg += `${features.rooms[0]} için ürünler`;
    } else if (features.colors && features.colors.length) {
        msg += `${features.colors[0]} renkli ürünler`;
    } else {
        msg += 'Sizin için önerilen ürünler';
    }
    
    if (features.roomSize) {
        msg += `, oda boyutu: ${features.roomSize}`;
    }
    if (features.budget) {
        msg += `, bütçe: ${features.budget}`;
    }
    if (features.materials && features.materials.length) {
        msg += `, malzeme: ${features.materials[0]}`;
    }
    if (features.mirrorStatus && features.mirrorStatus.length) {
        msg += `, ayna durumu: ${features.mirrorStatus[0]}`;
    }
    msg += ' için öneriler:';
    return msg;
}

// Debug endpoint - OpenCart filter yapısını görüntüle
exports.debugOpenCartFilters = async (req, res) => {
    try {
        const debug = await openCartKeywordManager.debugFilterStructure();
        const statistics = await openCartKeywordManager.getFilterStatistics();
        
        res.json({
            success: true,
            message: 'OpenCart filter yapısı',
            filterGroups: debug.filterGroups,
            keywordMappings: debug.keywordMappings,
            statistics: statistics,
            cacheInfo: {
                lastUpdate: openCartKeywordManager.lastCacheUpdate,
                cacheDuration: openCartKeywordManager.CACHE_DURATION
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Debug hatası',
            error: error.message
        });
    }
};

// Cache yenileme endpoint
exports.refreshFilterCache = async (req, res) => {
    try {
        openCartKeywordManager.clearCache();
        await openCartKeywordManager.getKeywordMappings();
        
        res.json({
            success: true,
            message: 'OpenCart filter cache başarıyla yenilendi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Cache yenileme hatası',
            error: error.message
        });
    }
};