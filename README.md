# Mobilya Öneri Sistemi

Yapay zeka destekli mobilya öneri sistemi. Kullanıcıların doğal dilde yaptığı aramalar için uygun mobilya önerilerini sunar.

## 🚀 Özellikler

- **Yapay Zeka Destekli Arama**: Google Gemini AI ile doğal dil işleme
- **Sesli Arama**: Web Speech API ile sesli komut desteği
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
git clone https://github.com/zeybit/mobilya.git
cd mobilya
```

2. **Node.js bağımlılıklarını yükleyin:**
```bash
npm install
```

3. **Ortam değişkenlerini ayarlayın:**
```bash
# .env dosyası oluşturun ve aşağıdaki değişkenleri ekleyin
```

`.env` dosyası içeriği:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mobilya
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
NODE_ENV=development
```

4. **MongoDB'yi başlatın:**
```bash
# MongoDB servisini başlatın
mongod
```

5. **Uygulamayı başlatın:**
```bash
# Production için
npm start

# Development için
npm run dev
```

## 🎯 API Endpoints

### Ürünler
- `GET /api/products` - Tüm ürünleri listele
- `GET /api/products/:id` - Belirli ürünü getir
- `POST /api/products` - Yeni ürün ekle
- `PUT /api/products/:id` - Ürün güncelle
- `DELETE /api/products/:id` - Ürün sil

### Öneriler
- `GET /api/recommendations?query=search_term` - AI destekli ürün önerileri

### Kategoriler
- `GET /api/categories` - Tüm kategoriler
- `POST /api/categories` - Yeni kategori ekle

### Etiketler
- `GET /api/tags` - Tüm etiketler
- `POST /api/tags` - Yeni etiket ekle

## 🧠 AI Özellikleri

### Doğal Dil İşleme
- Türkçe ve İngilizce sorguları anlama
- Renk, stil, malzeme çıkarımı
- Bütçe ve boyut analizi

### Arama Örnekleri
```
"beyaz modern koltuk"
"3+3+1 koltuk takımı oda: 400x300"
"ahşap çalışma masası"
"5000 TL altında yatak odası"
```

## 📁 Proje Yapısı

```
mobilya/
├── controllers/          # API kontrolcüleri
│   ├── categoryController.js
│   ├── productController.js
│   ├── recommendationController.js
│   └── tagController.js
├── models/              # MongoDB şemaları
│   ├── categoryModel.js
│   ├── productModel.js
│   └── tagModel.js
├── routes/              # API rotaları
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── recommendationRoutes.js
│   └── tagRoutes.js
├── utils/               # Yardımcı fonksiyonlar
│   └── db.js
├── public/              # Statik dosyalar
│   └── js/
│       └── realtimeSpeechToText.js
├── app.js              # Express uygulaması
├── server.js           # Sunucu başlatma
├── package.json        # Node.js bağımlılıkları
└── .env               # Ortam değişkenleri (git'te yok)
```

## 🚀 Deployment

### Heroku
```bash
# Heroku CLI ile
heroku create mobilya-app
heroku config:set GOOGLE_AI_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongodb_uri
git push heroku backend:main
```

### Docker
```bash
# Docker build
docker build -t mobilya-app .
docker run -p 5000:5000 mobilya-app
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

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

## 📝 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📧 İletişim

Proje: [https://github.com/zeybit/mobilya](https://github.com/zeybit/mobilya)

## ⚠️ Önemli Notlar

- `.env` dosyasını GitHub'a pushlamamaya dikkat edin
- `node_modules/` klasörü otomatik olarak git'ten hariç tutulur
- Google AI API anahtarınızı güvenli tutun
- MongoDB bağlantı stringinizi production'da güvenli saklayın

## 🔧 Troubleshooting

### MongoDB Bağlantı Sorunu
```bash
# MongoDB servisinin çalıştığından emin olun
sudo systemctl status mongod
# veya Windows için
net start MongoDB
```

### Port Çakışması
```bash
# Farklı port kullanmak için .env dosyasında PORT değişkenini güncelleyin
PORT=3001
```

### API Anahtar Hatası
```bash
# .env dosyasında GOOGLE_AI_API_KEY değişkeninin doğru olduğundan emin olun
# Google AI Studio'dan yeni anahtar alabilirsiniz
```