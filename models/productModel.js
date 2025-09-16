const pool = require('../utils/db');

// Base URL ve image path konfigürasyonu
const IMAGE_CONFIG = {
    baseUrl: process.env.IMAGE_BASE_URL || 'https://dekorbaz.com',
    cachePath: '/image/cache/',
    defaultSize: '600x600'
};

// Image URL builder fonksiyonu
function buildImageUrl(imagePath, size = IMAGE_CONFIG.defaultSize) {
    if (!imagePath || imagePath.trim() === '') {
        return null;
    }
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    let cleanPath = imagePath.trim();
    if (!cleanPath.startsWith('catalog/')) {
        cleanPath = 'catalog/' + cleanPath;
    }
    const lastDotIndex = cleanPath.lastIndexOf('.');
    let pathWithoutExt, extension;
    if (lastDotIndex > 0) {
        pathWithoutExt = cleanPath.substring(0, lastDotIndex);
        extension = cleanPath.substring(lastDotIndex);
    } else {
        pathWithoutExt = cleanPath;
        extension = '.png';
    }
    const encodedPath = encodeURIComponent(pathWithoutExt).replace(/%2F/g, '/');
    const finalUrl = `${IMAGE_CONFIG.baseUrl}${IMAGE_CONFIG.cachePath}${encodedPath}-${size}${extension}`;
    return finalUrl;
}

// Multiple image sizes için helper
function buildImageUrls(imagePath) {
    if (!imagePath) return {};
    return {
        thumbnail: buildImageUrl(imagePath, '300x300'),
        medium: buildImageUrl(imagePath, '600x600'),
        large: buildImageUrl(imagePath, '1000x1000'),
        original: `${IMAGE_CONFIG.baseUrl}/image/${imagePath}`
    };
}

// Helper: fetch attributes for a product (attribute name ile birlikte)
async function getProductAttributes(productId) {
    // Attribute adı için join ekle
    const [rows] = await pool.query(
        `SELECT pa.attribute_id, ad.name as attribute_name, pa.text
         FROM oc_product_attribute pa
         JOIN oc_attribute_description ad ON pa.attribute_id = ad.attribute_id
         WHERE pa.product_id = ? AND pa.language_id = 5 AND ad.language_id = 5`,
        [productId]
    );
    // Hem id, hem isimle obje oluştur
    const attrObj = {};
    const extraAttributes = {};
    for (const row of rows) {
        attrObj[row.attribute_id] = row.text;
        if (row.attribute_name) {
            extraAttributes[row.attribute_name] = row.text;
        }
    }
    return { attrObj, extraAttributes };
}

// Updated getProductImages function
async function getProductImages(productId, mainImage) {
    const [rows] = await pool.query(
        'SELECT image FROM oc_product_image WHERE product_id = ? ORDER BY sort_order ASC, product_image_id ASC',
        [productId]
    );
    const images = [];
    const imageUrls = [];
    if (mainImage && mainImage.trim()) {
        const mainImageUrl = buildImageUrl(mainImage);
        if (mainImageUrl) {
            images.push(mainImage);
            imageUrls.push(mainImageUrl);
        }
    }
    for (const row of rows) {
        if (row.image && !images.includes(row.image)) {
            const imageUrl = buildImageUrl(row.image);
            if (imageUrl) {
                images.push(row.image);
                imageUrls.push(imageUrl);
            }
        }
    }
    return {
        originalPaths: images,
        urls: imageUrls,
        urlsWithSizes: images.map(img => buildImageUrls(img)).filter(Boolean)
    };
}

// YENI: Kategoriler dahil ürünleri getir
async function getAllProductsWithCategories() {
    console.log('Kategoriler dahil ürünler getiriliyor...');
    
    const query = `
        SELECT 
            p.*,
            pd.name as product_name,
            pd.description as product_description,
            ptc.category_id,
            cd.name as category_name
        FROM oc_product p
        LEFT JOIN oc_product_description pd ON p.product_id = pd.product_id AND pd.language_id = 5
        LEFT JOIN oc_product_to_category ptc ON p.product_id = ptc.product_id  
        LEFT JOIN oc_category_description cd ON ptc.category_id = cd.category_id AND cd.language_id = 5
        WHERE p.status = 1
    `;
    
    const [rows] = await pool.query(query);
    console.log(`Veritabanından ${rows.length} ürün bulundu`);
    
    // Kategori dağılımını logla
    const categoryStats = {};
    rows.forEach(row => {
        const catId = row.category_id || 'NULL';
        const catName = row.category_name || 'NULL';
        const key = `${catId}-${catName}`;
        categoryStats[key] = (categoryStats[key] || 0) + 1;
    });
    console.log('Kategori dağılımı:', categoryStats);
    
    const products = await Promise.all(rows.map(async (p) => {
    const { attrObj, extraAttributes } = await getProductAttributes(p.product_id);
    const imageData = await getProductImages(p.product_id, p.image);
    
    // Ürün adı ve açıklaması için joined verileri kullan
    if (p.product_name) p.name = p.product_name;
    if (p.product_description) p.description = p.product_description;
    
    // Frontend'in beklediği category objesi formatını oluştur
    if (p.category_id) {
        p.category = {
            _id: p.category_id,
            name: p.category_name || 'Kategori Yok',
            description: p.category_name || ''
        };
    } else {
        p.category = null;
    }
    
    // Eski alanları da koru (geriye dönük uyumluluk için)
    p.category_id = p.category_id;
    p.category_name = p.category_name;
    
    p.attributes = attrObj;
    p.extraAttributes = extraAttributes;
    p.images = imageData.urls;
    p.imageDetails = imageData.urlsWithSizes;
    p.originalImagePaths = imageData.originalPaths;
    
    return p;
}));
    
    console.log('İşlenmiş ürünler hazır');
    return products;
}

// Updated getAllProducts function - Artık kategori bilgisi dahil
async function getAllProducts() {
    // Yeni fonksiyonu kullan
    return await getAllProductsWithCategories();
}

// Updated getProductById function - Kategori bilgisi dahil
async function getProductById(id) {
    const query = `
        SELECT 
            p.*,
            pd.name as product_name,
            pd.description as product_description,
            ptc.category_id,
            cd.name as category_name
        FROM oc_product p
        LEFT JOIN oc_product_description pd ON p.product_id = pd.product_id AND pd.language_id = 5
        LEFT JOIN oc_product_to_category ptc ON p.product_id = ptc.product_id  
        LEFT JOIN oc_category_description cd ON ptc.category_id = cd.category_id AND cd.language_id = 5
        WHERE p.product_id = ?
    `;
    
    const [rows] = await pool.query(query, [id]);
    if (!rows[0]) return undefined;
    
    const product = rows[0];
    const { attrObj, extraAttributes } = await getProductAttributes(product.product_id);
    const imageData = await getProductImages(product.product_id, product.image);
    
    // Ürün adı ve açıklaması için joined verileri kullan
    if (product.product_name) product.name = product.product_name;
    if (product.product_description) product.description = product.product_description;
    
    // Frontend'in beklediği category objesi formatını oluştur
    if (product.category_id) {
        product.category = {
            _id: product.category_id,
            name: product.category_name || 'Kategori Yok',
            description: product.category_name || ''
        };
    } else {
        product.category = null;
    }
    
    // Eski alanları da koru (geriye dönük uyumluluk için)
    product.category_id = product.category_id;
    product.category_name = product.category_name;
    
    product.attributes = attrObj;
    product.extraAttributes = extraAttributes;
    product.images = imageData.urls;
    product.imageDetails = imageData.urlsWithSizes;
    product.originalImagePaths = imageData.originalPaths;
    
    return product;
}

// Create a new product
async function createProduct(data) {
    const { model, sku = '', upc = '', ean = '', jan = '', isbn = '', mpn = '', location = '', quantity = 0, stock_status_id = 0, image = '', manufacturer_id = 0, shipping = 1, price = 0, points = 0, tax_class_id = 0, date_available = null, weight = 0, weight_class_id = 0, length = 0, width = 0, height = 0, length_class_id = 0, subtract = 1, minimum = 1, sort_order = 0, status = 1, viewed = 0 } = data;
    const [result] = await pool.query(
        'INSERT INTO oc_product (model, sku, upc, ean, jan, isbn, mpn, location, quantity, stock_status_id, image, manufacturer_id, shipping, price, points, tax_class_id, date_available, weight, weight_class_id, length, width, height, length_class_id, subtract, minimum, sort_order, status, viewed, date_added, date_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [model, sku, upc, ean, jan, isbn, mpn, location, quantity, stock_status_id, image, manufacturer_id, shipping, price, points, tax_class_id, date_available, weight, weight_class_id, length, width, height, length_class_id, subtract, minimum, sort_order, status, viewed]
    );
    return { id: result.insertId };
}

// Update a product
async function updateProduct(id, data) {
    const { model, sku, upc, ean, jan, isbn, mpn, location, quantity, stock_status_id, image, manufacturer_id, shipping, price, points, tax_class_id, date_available, weight, weight_class_id, length, width, height, length_class_id, subtract, minimum, sort_order, status, viewed } = data;
    await pool.query(
        'UPDATE oc_product SET model=?, sku=?, upc=?, ean=?, jan=?, isbn=?, mpn=?, location=?, quantity=?, stock_status_id=?, image=?, manufacturer_id=?, shipping=?, price=?, points=?, tax_class_id=?, date_available=?, weight=?, weight_class_id=?, length=?, width=?, height=?, length_class_id=?, subtract=?, minimum=?, sort_order=?, status=?, viewed=?, date_modified=NOW() WHERE product_id=?',
        [model, sku, upc, ean, jan, isbn, mpn, location, quantity, stock_status_id, image, manufacturer_id, shipping, price, points, tax_class_id, date_available, weight, weight_class_id, length, width, height, length_class_id, subtract, minimum, sort_order, status, viewed, id]
    );
    return { id };
}

// Delete a product
async function deleteProduct(id) {
    await pool.query('DELETE FROM oc_product WHERE product_id = ?', [id]);
    return { id };
}

module.exports = {
    getAllProducts,
    getAllProductsWithCategories, // Yeni metod
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    buildImageUrl,
    buildImageUrls
};