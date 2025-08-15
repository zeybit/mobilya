
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
- Python (ML işlemleri için)

### Frontend
- React.js
- HTML/CSS/JavaScript
- Web Speech API

## 📦 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- Python (v3.8 veya üzeri)
- MongoDB (v5.0 veya üzeri)
- Google AI API anahtarı

### Backend Kurulumu

1. **Repository'yi klonlayın:**
```bash
git clone https://github.com/zeybit/mobilya.git
cd mobilya
```

2. **Node.js bağımlılıklarını yükleyin:**
```bash
npm install
```

3. **Python sanal ortamı oluşturun:**
```bash
python -m venv venv
# Windows için
venv\Scripts\activate
# macOS/Linux için
source venv/bin/activate
```

4. **Python bağımlılıklarını yükleyin:**
```bash
pip install -r requirements.txt
```

5. **Ortam değişkenlerini ayarlayın:**
```bash
# .env dosyası oluşturun ve aşağıdaki değişkenleri ekleyin
```

`.env` dosyası içeriği:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mobilya
JWT_SECRET=your_jwt_secret_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
NODE_ENV=development
```

6. **MongoDB'yi başlatın:**
```bash
# MongoDB servisini başlatın
mongod
```

7. **Uygulamayı başlatın:**
```bash
# Backend için (ana dizinde)
npm start

# Frontend için (eğer ayrı dizin varsa)
cd frontend
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
├── models/              # MongoDB şemaları
├── routes/              # API rotaları
├── utils/               # Yardımcı fonksiyonlar
├── public/              # Statik dosyalar
├── venv/               # Python sanal ortamı (git'te yok)
├── app.js              # Express uygulaması
├── server.js           # Sunucu
├── requirements.txt    # Python bağımlılıkları
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
docker run -p 3000:3000 mobilya-app
```

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
- `venv/` klasörü otomatik olarak git'ten hariç tutulur
- Python ML kütüphaneleri büyük olduğu için local kurulum gereklidir
- Google AI API anahtarınızı güvenli tutun