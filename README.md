# Mobilya Projesi

Bu proje, mobilya satış ve yönetim sistemi için geliştirilmiş bir web uygulamasıdır.

## Özellikler

- Ürün yönetimi
- Kullanıcı yönetimi
- Sipariş takibi
- Stok kontrolü

## Kurulum

1. Projeyi klonlayın:
```bash
git clone [repo-url]
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Gerekli ortam değişkenlerini ayarlayın:
```bash
cp .env.example .env
```

4. `.env` dosyasını düzenleyin ve aşağıdaki değişkenleri ayarlayın:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mobilya
JWT_SECRET=your_jwt_secret
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

5. MongoDB'yi kurun ve çalıştırın:
   - MongoDB'yi [buradan](https://www.mongodb.com/try/download/community) indirin ve kurun
   - MongoDB servisini başlatın

6. Frontend bağımlılıklarını yükleyin:
```bash
cd frontend
npm install
```

7. Uygulamayı başlatın:
```bash
# Backend'i başlatmak için (ana dizinde)
npm start

# Frontend'i başlatmak için (frontend dizininde)
cd frontend
npm run dev 
```

## Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB (v4.4 veya üzeri)
- npm veya yarn
- Google AI API anahtarı (Gemini API için)

## Teknolojiler

- Node.js
- Express.js
- MongoDB
- React.js

## Lisans

MIT 