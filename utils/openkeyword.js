// opencartKeywordManager.js - Mevcut OpenCart filter yapısını kullanan keyword manager
const pool = require('../utils/db');

class OpenCartKeywordManager {
    constructor() {
        this.keywordCache = null;
        this.filterCache = null;
        this.lastCacheUpdate = null;
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 dakika cache
    }

    // Cache'i kontrol et ve gerekirse yenile
    async refreshCacheIfNeeded() {
        const now = Date.now();
        if (!this.keywordCache || !this.lastCacheUpdate || 
            (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
            
            console.log('OpenCart filter keyword cache yenileniyor...');
            await this.loadFiltersFromDatabase();
        }
    }

    // OpenCart filter sisteminden keyword'leri yükle
    async loadFiltersFromDatabase() {
        try {
            // Filter grupları ve filter değerlerini al
            const query = `
                SELECT 
                    fg.filter_group_id,
                    fgd.name as filter_group_name,
                    f.filter_id,
                    fd.name as filter_name
                FROM oc_filter_group fg
                JOIN oc_filter_group_description fgd ON fg.filter_group_id = fgd.filter_group_id
                JOIN oc_filter f ON fg.filter_group_id = f.filter_group_id
                JOIN oc_filter_description fd ON f.filter_id = fd.filter_id
                WHERE fgd.language_id = 5 AND fd.language_id = 5
                ORDER BY fgd.name, f.sort_order, fd.name
            `;
            
            const [rows] = await pool.query(query);
            
            // Filter gruplarına göre organize et
            const filterGroups = {};
            const keywordMappings = {};
            
            rows.forEach(row => {
                // Grup adını normalize et
                let groupName = row.filter_group_name.toLowerCase();
                // Türkçe karakterleri sadeleştir
                groupName = groupName
                    .replace(/ı/g, 'i')
                    .replace(/ğ/g, 'g')
                    .replace(/ü/g, 'u')
                    .replace(/ş/g, 's')
                    .replace(/ö/g, 'o')
                    .replace(/ç/g, 'c');

                const filterName = row.filter_name.toLowerCase();
                
                // Filter grubu cache'i
                if (!filterGroups[groupName]) {
                    filterGroups[groupName] = {
                        id: row.filter_group_id,
                        name: row.filter_group_name,
                        filters: []
                    };
                }
                filterGroups[groupName].filters.push({
                    id: row.filter_id,
                    name: row.filter_name,
                    normalizedName: filterName
                });
                
                // Keyword mapping oluştur
                if (!keywordMappings[groupName]) {
                    keywordMappings[groupName] = {};
                }
                // Direkt eşleşme
                keywordMappings[groupName][filterName] = row.filter_name;
                
                // Ek eşleşmeler ekle (manuel mapping'ler)
                this.addAdditionalMappings(keywordMappings, groupName, filterName, row.filter_name);
            });
            
            this.filterCache = filterGroups;
            this.keywordCache = keywordMappings;
            this.lastCacheUpdate = Date.now();
            
            console.log('OpenCart filter cache güncellendi:', Object.keys(filterGroups));
            console.log('Keyword mappings:', Object.keys(keywordMappings));
            
            return { filterGroups, keywordMappings };
            
        } catch (error) {
            console.error('OpenCart filter yükleme hatası:', error);
            // Hata durumunda fallback
            this.keywordCache = this.getDefaultKeywords();
            this.filterCache = {};
            return { filterGroups: {}, keywordMappings: this.keywordCache };
        }
    }

    // Ek keyword eşleşmeleri ekle
    addAdditionalMappings(keywordMappings, groupName, filterName, originalName) {
        // Renk eşleşmeleri
        if (groupName.includes('renk') || groupName.includes('color')) {
            const colorMappings = {
                'beyaz': ['white', 'ak'],
                'siyah': ['black', 'kara'],
                'gri': ['gray', 'grey'],
                'kahverengi': ['brown'],
                'mavi': ['blue'],
                'kırmızı': ['red'],
                'yeşil': ['green'],
                'altın': ['gold', 'golden']
            };
            
            Object.entries(colorMappings).forEach(([turkish, englishList]) => {
                if (filterName.includes(turkish)) {
                    englishList.forEach(eng => {
                        keywordMappings[groupName][eng] = originalName;
                    });
                }
                if (englishList.includes(filterName)) {
                    keywordMappings[groupName][turkish] = originalName;
                }
            });
        }
        
        // Boyut eşleşmeleri
        if (groupName.includes('boyut') || groupName.includes('size') || groupName.includes('ebat')) {
            const dimensionRegex = /(\d+)cm?\s*x\s*(\d+)cm?\s*(?:x\s*(\d+)cm?)?/i;
            const match = filterName.match(dimensionRegex);
            if (match) {
                const width = match[1];
                const depth = match[2];
                const height = match[3];
                
                // Farklı format varyasyonları ekle
                const variations = [
                    `${width}x${depth}`,
                    `${width} x ${depth}`,
                    `${width}*${depth}`,
                    `${width} * ${depth}`
                ];
                
                if (height) {
                    variations.push(
                        `${width}x${depth}x${height}`,
                        `${width} x ${depth} x ${height}`,
                        `${width}*${depth}*${height}`
                    );
                }
                
                variations.forEach(variation => {
                    keywordMappings[groupName][variation.toLowerCase()] = originalName;
                });
            }
        }
        
        // Stil eşleşmeleri
        if (groupName.includes('stil') || groupName.includes('style') || groupName.includes('tarz')) {
            const styleMappings = {
                'modern': ['contemporary', 'çağdaş'],
                'klasik': ['classic', 'traditional'],
                'minimalist': ['minimal', 'sade'],
                'rustik': ['rustic', 'köy'],
                'endüstriyel': ['industrial', 'sanayi'],
                'scandinav': ['scandinavian', 'nordic', 'İskandinav']
            };
            
            Object.entries(styleMappings).forEach(([main, alternatives]) => {
                if (filterName.includes(main)) {
                    alternatives.forEach(alt => {
                        keywordMappings[groupName][alt.toLowerCase()] = originalName;
                    });
                }
                alternatives.forEach(alt => {
                    if (filterName.includes(alt.toLowerCase())) {
                        keywordMappings[groupName][main] = originalName;
                    }
                });
            });
        }
        
        // Malzeme eşleşmeleri (daha esnek)
        if (groupName.includes('malzeme') || groupName.includes('material')) {
            const materialMappings = {
                'ahşap': ['wood', 'wooden', 'ağaç'],
                'metal': ['steel', 'çelik', 'demir'],
                'plastik': ['plastic'],
                'cam': ['glass'],
                'deri': ['leather'],
                'kumaş': ['fabric', 'textile', 'bez']
            };
            
            Object.entries(materialMappings).forEach(([turkish, englishList]) => {
                if (filterName.includes(turkish)) {
                    englishList.forEach(eng => {
                        keywordMappings[groupName][eng.toLowerCase()] = originalName;
                    });
                }
                englishList.forEach(eng => {
                    if (filterName.includes(eng.toLowerCase())) {
                        keywordMappings[groupName][turkish] = originalName;
                    }
                });
            });
        }
    }

    // Fallback için varsayılan keyword'ler
    getDefaultKeywords() {
        return {
            renk: {
                beyaz: 'Beyaz', white: 'Beyaz',
                siyah: 'Siyah', black: 'Siyah',
                gri: 'Gri', gray: 'Gri', grey: 'Gri'
            },
            stil: {
                modern: 'Modern',
                klasik: 'Klasik', classic: 'Klasik'
            },
            malzeme: {
                ahşap: 'Ahşap', wood: 'Ahşap',
                metal: 'Metal', steel: 'Metal'
            }
        };
    }

    // Keyword mapping'leri al
    async getKeywordMappings() {
        await this.refreshCacheIfNeeded();
        return this.keywordCache;
    }

    // Filter gruplarını al
    async getFilterGroups() {
        await this.refreshCacheIfNeeded();
        return this.filterCache;
    }

    // Belirli bir filter grubundaki filterleri al
    async getFiltersByGroup(groupName) {
        const filterGroups = await this.getFilterGroups();
        const normalizedGroupName = groupName.toLowerCase();
        return filterGroups[normalizedGroupName] || null;
    }

    // Ürünlerin filter değerlerini al
    async getProductFilters(productId) {
        try {
            const query = `
                SELECT 
                    fg.filter_group_id,
                    fgd.name as filter_group_name,
                    f.filter_id,
                    fd.name as filter_name
                FROM oc_product_filter pf
                JOIN oc_filter f ON pf.filter_id = f.filter_id
                JOIN oc_filter_group fg ON f.filter_group_id = fg.filter_group_id
                JOIN oc_filter_group_description fgd ON fg.filter_group_id = fgd.filter_group_id
                JOIN oc_filter_description fd ON f.filter_id = fd.filter_id
                WHERE pf.product_id = ? AND fgd.language_id = 5 AND fd.language_id = 5
                ORDER BY fgd.name, fd.name
            `;
            
            const [rows] = await pool.query(query, [productId]);
            
            const productFilters = {};
            rows.forEach(row => {
                const groupName = row.filter_group_name.toLowerCase();
                if (!productFilters[groupName]) {
                    productFilters[groupName] = [];
                }
                productFilters[groupName].push({
                    id: row.filter_id,
                    name: row.filter_name
                });
            });
            
            return productFilters;
            
        } catch (error) {
            console.error('Ürün filter bilgileri alınamadı:', error);
            return {};
        }
    }

    // Keyword'den filter ID'sini bul
    async findFilterIdByKeyword(keyword, filterGroupName = null) {
        const filterGroups = await this.getFilterGroups();
        const keywordMappings = await this.getKeywordMappings();
        
        const normalizedKeyword = keyword.toLowerCase().trim();
        
        // Belirli bir grup belirtilmişse sadece o grupta ara
        if (filterGroupName) {
            const normalizedGroupName = filterGroupName.toLowerCase();
            const group = filterGroups[normalizedGroupName];
            const mapping = keywordMappings[normalizedGroupName];
            
            if (group && mapping && mapping[normalizedKeyword]) {
                const targetName = mapping[normalizedKeyword];
                const filter = group.filters.find(f => 
                    f.name.toLowerCase() === targetName.toLowerCase()
                );
                return filter ? filter.id : null;
            }
        } else {
            // Tüm gruplarda ara
            for (const [groupName, mapping] of Object.entries(keywordMappings)) {
                if (mapping[normalizedKeyword]) {
                    const targetName = mapping[normalizedKeyword];
                    const group = filterGroups[groupName];
                    if (group) {
                        const filter = group.filters.find(f => 
                            f.name.toLowerCase() === targetName.toLowerCase()
                        );
                        if (filter) {
                            return { filterId: filter.id, groupName, filterName: filter.name };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    // Debug: Tüm filter yapısını görüntüle
    async debugFilterStructure() {
        const filterGroups = await this.getFilterGroups();
        const keywordMappings = await this.getKeywordMappings();
        
        console.log('=== OPENCART FILTER YAPISI ===');
        Object.entries(filterGroups).forEach(([groupName, group]) => {
            console.log(`\nGrup: ${group.name} (ID: ${group.id})`);
            group.filters.forEach(filter => {
                console.log(`  - ${filter.name} (ID: ${filter.id})`);
            });
        });
        
        console.log('\n=== KEYWORD MAPPINGS ===');
        Object.entries(keywordMappings).forEach(([groupName, mappings]) => {
            console.log(`\nGrup: ${groupName}`);
            Object.entries(mappings).forEach(([keyword, value]) => {
                console.log(`  ${keyword} -> ${value}`);
            });
        });
        
        return { filterGroups, keywordMappings };
    }

    // Cache'i temizle
    clearCache() {
        this.keywordCache = null;
        this.filterCache = null;
        this.lastCacheUpdate = null;
        console.log('OpenCart filter cache temizlendi');
    }

    // Ürünlerin hangi filterlere sahip olduğunu istatistik olarak al
    async getFilterStatistics() {
        try {
            const query = `
                SELECT 
                    fgd.name as filter_group_name,
                    fd.name as filter_name,
                    COUNT(pf.product_id) as product_count
                FROM oc_product_filter pf
                JOIN oc_filter f ON pf.filter_id = f.filter_id
                JOIN oc_filter_group fg ON f.filter_group_id = fg.filter_group_id
                JOIN oc_filter_group_description fgd ON fg.filter_group_id = fgd.filter_group_id
                JOIN oc_filter_description fd ON f.filter_id = fd.filter_id
                WHERE fgd.language_id = 5 AND fd.language_id = 5
                GROUP BY fg.filter_group_id, f.filter_id
                ORDER BY fgd.name, product_count DESC
            `;
            
            const [rows] = await pool.query(query);
            
            const statistics = {};
            rows.forEach(row => {
                const groupName = row.filter_group_name;
                if (!statistics[groupName]) {
                    statistics[groupName] = [];
                }
                statistics[groupName].push({
                    filterName: row.filter_name,
                    productCount: row.product_count
                });
            });
            
            return statistics;
            
        } catch (error) {
            console.error('Filter istatistikleri alınamadı:', error);
            return {};
        }
    }
}

// Singleton instance
const openCartKeywordManager = new OpenCartKeywordManager();

module.exports = openCartKeywordManager;