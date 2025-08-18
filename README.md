# Mobilya Öneri Sistemi

Yapay zeka destekli mobilya öneri sistemi. Kullanıcıların doğal dilde yaptığı aramalar için uygun mobilya önerilerini sunar.

## 🚀 Özellikler

- **Yapay Zeka Destekli Arama**: Google Gemini AI ile doğal dil işleme
- **Sesli Arama**: Web Speech API ile gerçek zamanlı sesli komut desteği
- **Akıllı Filtreleme**: Renk, stil, oda tipi, malzeme, bütçe bazlı filtreleme
- **Oda Boyutu Uyumluluğu**: Ürün boyutlarını oda ölçüleri ile karşılaştırma
- **Renk Uyumluluğu**: Oda rengi ile ürün rengi uyumluluğu kontrolü
- **Çoklu Dil Desteği**: Türkçe ve İngilizce arama desteği
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu arayüz

## 🛠️ Teknolojiler

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- Google Generative AI (Gemini)
- Natural Language Processing
- RESTful API

### Frontend
- HTML/CSS/JavaScript
- Web Speech API

## 📦 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- MongoDB (v5.0 veya üzeri)
- Google AI API anahtarı

### Kurulum Adımları

1. **Repository'yi klonlayın:**
```bash
git clone https://github.com/yourusername/mobilya.git
cd mobilya
```

2. **Node.js bağımlılıklarını yükleyin:**
```bash
npm install
```

3. **Ortam değişkenlerini ayarlayın:**
`.env` dosyasını oluşturun (.env.example dosyasını referans alabilirsiniz)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mobilya
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
NODE_ENV=development
```

4. **Uygulamayı başlatın:**
```bash
# Production için
npm start

# Development için
npm run dev
```

## 📊 API Endpoints

### Ürünler
- `GET /api/products` - Tüm ürünleri listele
- `GET /api/products/:id` - Belirli ürünü getir
- `GET /api/products/category/:categoryId` - Kategoriye göre ürünleri getir
- `GET /api/products/tag/:tagId` - Etikete göre ürünleri getir
- `POST /api/products` - Yeni ürün ekle
- `PUT /api/products/:id` - Ürün güncelle
- `DELETE /api/products/:id` - Ürün sil

### Öneriler
- `GET /api/recommendations?query=search_term` - AI destekli ürün önerileri

### Kategoriler
- `GET /api/categories` - Tüm kategoriler
- `GET /api/categories/:id` - Belirli kategoriyi getir
- `POST /api/categories` - Yeni kategori ekle
- `PUT /api/categories/:id` - Kategori güncelle
- `DELETE /api/categories/:id` - Kategori sil

### Etiketler
- `GET /api/tags` - Tüm etiketler
- `GET /api/tags/:id` - Belirli etiketi getir
- `POST /api/tags` - Yeni etiket ekle
- `PUT /api/tags/:id` - Etiket güncelle
- `DELETE /api/tags/:id` - Etiket sil

## 🧠 AI Özellikleri

### Doğal Dil İşleme
- Türkçe ve İngilizce sorguları anlama
- Renk, stil, malzeme çıkarımı
- Bütçe ve boyut analizi
- Oda tipi ve boyutu tespiti

### Sesli Arama
- Gerçek zamanlı ses tanıma
- Konuşma metni dönüşümü
- Boyut formatlarını otomatik düzenleme
- Hem Türkçe hem İngilizce dil desteği

### Arama Örnekleri
```
"beyaz modern koltuk"
"3x4 metrelik oda için masa"
"ahşap çalışma masası"
"5000 TL altında yatak odası mobilyası"
"oda boyutu: 4x5 metre için kanepe"
```

## 📁 Proje Yapısı

```
mobilya/
├── controllers/          # API kontrolcüleri
│   ├── categoryController.js
│   ├── productController.js
│   ├── recommendationController.js
│   └── tagController.js
├── models/               # MongoDB şemaları
│   ├── categoryModel.js
│   ├── productModel.js
│   └── tagModel.js
├── routes/               # API rotaları
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── recommendationRoutes.js
│   └── tagRoutes.js
├── utils/                # Yardımcı fonksiyonlar
│   └── db.js
├── public/               # Statik dosyalar
│   └── js/
│       └── realtimeSpeechToText.js
├── uploads/              # Yüklenen dosyalar
├── app.js                # Express uygulaması
├── server.js             # Sunucu başlatma
├── package.json          # Node.js bağımlılıkları
└── .env                  # Ortam değişkenleri (git'te yok)
```

## 📊 Kullanılan NPM Paketleri

### Ana Bağımlılıklar
- `express`: Web framework
- `mongoose`: MongoDB ORM
- `@google/generative-ai`: Google AI entegrasyonu
- `cors`: Cross-Origin Resource Sharing
- `dotenv`: Ortam değişkenleri yönetimi
- `natural`: Doğal dil işleme
- `multer`: Dosya upload
- `axios`: HTTP client

### Development Bağımlılıkları
- `nodemon`: Development server auto-restart

## ⚙️ Ses Tanıma Kütüphanesi

`realtimeSpeechToText.js` modülü ile gerçek zamanlı ses tanıma özellikleri:

- WebSocket bağlantısıyla sürekli ses tanıma
- Konuşurken anlık metin oluşturma
- Boyut formatlarını (örn. "beş metre dört") standart formata (5x4) dönüştürme
- Hata durumlarına karşı Web Speech API yedekleme mekanizması
- Kullanımı kolay JavaScript sınıfı

```javascript
// Örnek kullanım
const speechToText = new RealtimeSpeechToText({
  serverUrl: 'ws://localhost:5000',
  onTranscription: (text, isFinal) => {
    console.log(`Tanınan metin: ${text}`);
  }
});
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

## ⚠️ Önemli Notlar

- `.env` dosyasını GitHub'a pushlamamaya dikkat edin
- Google AI API anahtarınızı güvenli tutun
- MongoDB bağlantı stringinizi production'da güvenli saklayın
- Web tarayıcısında mikrofon izni gerektirir

## 🔧 Sorun Giderme

### MongoDB Bağlantı Sorunu
```bash
# MongoDB servisinin çalıştığından emin olun
sudo systemctl status mongod
# veya Windows için
net start MongoDB
```

### Google AI API Hatası
```bash
# .env dosyasında GOOGLE_AI_API_KEY değişkeninin doğru olduğundan emin olun
# Google AI Studio'dan yeni anahtar alabilirsiniz
```

### Sesli Tanıma Çalışmıyor
```bash
# Tarayıcı konsolunda hata mesajlarını kontrol edin
# Tarayıcının mikrofon iznine sahip olduğundan emin olun
# WebSocket sunucusunun çalıştığını doğrulayın
```