'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: {
    _id: string;
    name: string;
    description: string;
  };
  tags: Array<{
    _id: string;
    name: string;
  }>;
  images: string[];
  stock: number;
  color: string;
  isRecommended?: boolean;
  width?: number;
  depth?: number;
  height?: number;
  doorCount?: number;
  capacity?: number;
  material?: string;
  materialType?: string;
  extraAttributes?: Record<string, any>;
}

interface ExtractedFeatures {
  colors: string[];
  styles: string[];
  rooms: string[];
  productTypes: string[];
  roomColors?: string[];
  roomSize?: string;
  budget?: string;
  brand?: string;
  material?: string[];
  quantity?: string;
  purpose?: string;
  warranty?: string;
  productDimensions?: {
    width: number;
    depth: number;
    height?: number;
  };
  doorCount?: number;

  roomDimensions?: {
    width: number;
    depth: number;
    height?: number;
  };
  mirrorStatus?: string[]; // yeni özellik
}

interface RecommendationResponse {
  recommendations: Product[];
  extractedFeatures: ExtractedFeatures;
  recommendationMessage: string | null;
  isExactMatch?: boolean;
}

// Güncellenmiş ImageSlider komponenti
const ImageSlider = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<{[key: number]: boolean}>({});
  const [imageLoading, setImageLoading] = useState<{[key: number]: boolean}>({});

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  // Image error handler
  const handleImageError = (index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }));
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  // Image load handler
  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
    setImageError(prev => ({ ...prev, [index]: false }));
  };

  // Image load start handler
  const handleImageLoadStart = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: true }));
  };

  // Image URL kontrol ve düzeltme fonksiyonu (artık backend'den gelecek ama yedek olarak)
  const getImageUrl = (img: string): string => {
    if (!img) return '';
    // Backend'den gelen URL'ler zaten hazır olmalı
    if (img.startsWith('http')) return img;
    // Fallback: Eğer hala path formatında geliyorsa
    if (img.startsWith('catalog/') || img.startsWith('/catalog/')) {
      const cleanPath = img.replace(/^\/+/, '');
      // Basit fallback URL oluştur
      return `https://dekorbaz.com/image/cache/${cleanPath}-600x600.png`;
    }
    return img.startsWith('/') ? img : '/' + img;
  };

  // Placeholder görseli
  const renderPlaceholder = () => (
    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
      <div className="text-center text-gray-400">
        <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm">Görsel yüklenemedi</span>
      </div>
    </div>
  );

  // Loading placeholder
  const renderLoading = () => (
    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <span className="text-sm text-gray-500">Görsel yükleniyor...</span>
      </div>
    </div>
  );

  if (!images || images.length === 0) {
    return renderPlaceholder();
  }

  return (
    <div className="relative group bg-gray-100">
      {/* Mevcut resim */}
      <div className="relative w-full h-48 overflow-hidden">
        {imageLoading[currentIndex] && renderLoading()}
        {imageError[currentIndex] && renderPlaceholder()}
        {!imageError[currentIndex] && (
          <img
            key={currentIndex}
            src={getImageUrl(images[currentIndex])}
            alt={`Ürün görseli ${currentIndex + 1}`}
            className={`w-full h-48 object-cover transition-opacity duration-200 ${
              imageLoading[currentIndex] ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => handleImageLoad(currentIndex)}
            onError={() => handleImageError(currentIndex)}
            onLoadStart={() => handleImageLoadStart(currentIndex)}
            loading="lazy"
          />
        )}
      </div>

      {/* Navigation buttons - sadece birden fazla resim varsa göster */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
            aria-label="Önceki görsel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
            aria-label="Sonraki görsel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          
          {/* Indicator dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`${index + 1}. görsele git`}
              />
            ))}
          </div>
          
          {/* Resim sayısı göstergesi */}
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

// Boyut gösterimi komponenti - Metre desteği ile geliştirildi
const DimensionDisplay = ({ 
  dimensions, 
  title, 
  className = "",
  unit = "m" // Yeni: Birim desteği
}: { 
  dimensions: { width: number; depth: number; height?: number }; 
  title: string;
  className?: string;
  unit?: string;
}) => (
  <div className={`bg-white p-3 rounded-lg shadow ${className}`}>
    <h3 className="font-semibold mb-2 text-gray-700">{title}</h3>
    <div className="text-sm text-gray-600">
      <div>Genişlik: {dimensions.width} {unit}</div>
      <div>Derinlik: {dimensions.depth} {unit}</div>
      {dimensions.height && <div>Yükseklik: {dimensions.height} {unit}</div>}
    </div>
    <div className="mt-1 text-xs text-blue-600 font-mono">
      {dimensions.width} × {dimensions.depth}{dimensions.height ? ` × ${dimensions.height}` : ''} {unit}
    </div>
    {unit === "m" && (
      <div className="mt-1 text-xs text-gray-500">
        Alan: {(dimensions.width * dimensions.depth).toFixed(1)} m²
      </div>
    )}
  </div>
);

export default function Home() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Web Speech API için state'ler
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Web Speech API desteğini kontrol et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Speech recognition (tek seferlik)
  const handleMicClick = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setSpeechSupported(false);
        alert(
            "Tarayıcınızda sesli arama desteklenmiyor.\n\n" +
            "Lütfen Google Chrome veya Chromium tabanlı bir tarayıcı kullanın.\n" +
            "Alternatif olarak, metin kutusunu kullanarak arama yapabilirsiniz."
        );
        return;
    }

    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'tr-TR';
        recognitionRef.current.interimResults = true; // Geçici sonuçları da al
        recognitionRef.current.maxAlternatives = 1;
        recognitionRef.current.continuous = false;
    }

    const recognition = recognitionRef.current;
    
    if (isListening) {
        recognition.stop();
        setIsListening(false);
        return;
    }

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Ses işleme fonksiyonu
        const processSpeechResult = (speechText: string) => {
            if (!speechText) return speechText;
            
            let processedText = speechText.toLowerCase().trim();
            
            // Sayı çeviri tablosu
            const numberMap: {[key: string]: string} = {
                'bir': '1', 'iki': '2', 'üç': '3', 'dört': '4', 'beş': '5',
                'altı': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'on': '10'
            };
            
            // Kelime sayıları rakama çevir
            for (const [word, number] of Object.entries(numberMap)) {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                processedText = processedText.replace(regex, number);
            }
            
            // "oda boyutu 5 4 2" kalıbını "oda boyutu: 5x4x2" formatına çevir
            processedText = processedText.replace(
                /(oda boyutu|room size|oda ölçüsü)\s+(\d+)\s+(\d+)(?:\s+(\d+))?/gi, 
                (match, prefix, w, d, h) => {
                    return h ? `${prefix}: ${w}x${d}x${h}` : `${prefix}: ${w}x${d}`;
                }
            );
            
            // Birleşik sayıları ayır (542 -> 5x4x2)
            processedText = processedText.replace(/\b(\d{3})\b/g, (match) => {
                if (match.length === 3) {
                    const digits = match.split('');
                    return `${digits[0]}x${digits[1]}x${digits[2]}`;
                }
                return match;
            });
            
            // Standalone "5 4 2" formatını "5x4x2" yap
            processedText = processedText.replace(
                /\b(\d+)\s+(\d+)(?:\s+(\d+))?\b/g,
                (match, w, d, h) => {
                    // Sadece makul boyut değerleri için (1-50 arası)
                    const width = parseInt(w);
                    const depth = parseInt(d);
                    const height = h ? parseInt(h) : null;
                    
                    if (width >= 1 && width <= 50 && depth >= 1 && depth <= 50) {
                        return height ? `${w}x${d}x${h}` : `${w}x${d}`;
                    }
                    return match;
                }
            );
            
            return processedText;
        };

        // Sonuçları işle
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += processSpeechResult(transcript);
            } else {
                interimTranscript += processSpeechResult(transcript);
            }
        }

        // Final sonuç varsa onu kullan, yoksa interim kullan
        if (finalTranscript) {
            setQuery(finalTranscript);
            setIsListening(false);
        } else if (interimTranscript) {
            setQuery(interimTranscript); // Gerçek zamanlı güncelleme
        }
    };

    recognition.onerror = (event: any) => {
        console.error('Ses tanıma hatası:', event.error);
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setData(null);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ query });
      const response = await axios.get(
        `http://localhost:5000/api/recommendations?${params.toString()}`,
        {
          timeout: 15000, // Timeout'u artırdık
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data && response.data.recommendations && response.data.extractedFeatures) {
        setData(response.data);
      } else if (response.data && response.data.message) {
        setError(response.data.message);
        setData(null);
      } else {
        setError('Beklenmeyen veri formatı');
        setData(null);
      }
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);

      if (error.code === 'ECONNABORTED') {
        setError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else if (error.response) {
        const errorMessage = error.response.data?.message || 'Sunucu hatası';
        setError(errorMessage);
      } else if (error.request) {
        setError('Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🪑 Mobilya Önerileri
        </h1>
        
        {/* Gelişmiş arama kutusu açıklaması */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <h3 className="font-bold text-lg mb-3 text-gray-800">🔍 Akıllı Arama Nasıl Kullanılır?</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">📝 Örnek Aramalar:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                <li>'Beyaz modern koltuk'</li>
                <li>'200x100x80 masa'</li>
                <li>'Ahşap yatak odası dolabı'</li>
                <li>'Minimalist 3+3+1 koltuk takımı'</li>
                <li>'5000 TL altında kahverengi sandalye'</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">📏 Boyut Belirtme:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                <li><strong>Ürün boyutu:</strong> '150x80x75 masa'</li>
                <li><strong>Oda boyutu:</strong> 'oda boyutu: 4x5x2.5' (metre)</li>
                <li><strong>İngilizce:</strong> 'room size: 5x6' (metre)</li>
                <li><strong>Karma:</strong> '2x1 masa oda boyutu: 5x4'</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border-l-4 border-blue-400">
            <p className="text-sm text-gray-600">
              <strong>💡 İpucu:</strong> Renk, stil, malzeme, oda türü, oda boyutu (küçük/orta/büyük) ve bütçe belirtebilirsiniz. 
              AI asistanımız sorgunuzu anlayarak en uygun önerileri getirecek.
            </p>
          </div>
          
          {/* Yeni: Oda boyutu sınıflandırması açıklaması */}
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">🏠 Oda Boyutu Sınıflandırması:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="text-green-700">
                <strong>Küçük:</strong> 12-25 m²<br/>
                <span className="text-xs text-green-600">Tek kişi yatak odası</span>
              </div>
              <div className="text-green-700">
                <strong>Orta:</strong> 25-50 m²<br/>
                <span className="text-xs text-green-600">Ana yatak odası, salon</span>
              </div>
              <div className="text-green-700">
                <strong>Büyük:</strong> 50+ m²<br/>
                <span className="text-xs text-green-600">Geniş salon, lüks alanlar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn: küçük oda için koltuk, 2x1 masa orta salon, büyük oda modern koltuk takımı"
            className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          
          {/* Sesli arama butonu */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`px-6 py-4 rounded-xl border transition-all duration-200 ${
              isListening 
                ? 'bg-red-100 border-red-400 text-red-600 animate-pulse shadow-lg' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:shadow-md'
            } flex items-center gap-2`}
            title={isListening ? "Dinlemeyi durdur" : "Sesli arama"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v6m0 0l4-4m-4 4L8 3m0 18v-6m0 0l4 4m-4-4l-4 4" />
            </svg>
            {isListening ? 'Durdur' : '🎤'}
          </button>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Aranıyor...
              </div>
            ) : (
              '🔍 Ara'
            )}
          </button>
        </div>

        {/* Tarayıcı desteği uyarısı */}
        {!speechSupported && (
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <p className="text-red-600">
              🚫 Tarayıcınızda sesli giriş desteklenmiyor.
            </p>
            <p className="text-sm text-red-500 mt-1">
              Lütfen <strong>Google Chrome</strong> veya Chromium tabanlı bir tarayıcı kullanın.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Ürünler aranıyor ve analiz ediliyor...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-6 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-lg">❌ {error}</p>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl">Henüz bir arama yapılmadı.</p>
            <p className="text-sm mt-2">Yukarıdaki arama kutusunu kullanarak mobilya arayın.</p>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Öneri Mesajı */}
            {data.recommendationMessage && (
              <div className={`p-6 rounded-xl border-l-4 ${
                data.isExactMatch 
                  ? 'bg-blue-50 border-blue-400 text-blue-800' 
                  : 'bg-green-50 border-green-400 text-green-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{data.isExactMatch ? '🎯' : '✨'}</span>
                  <p className="text-lg font-medium">{data.recommendationMessage}</p>
                </div>
              </div>
            )}

            {/* Çıkarılan Özellikler */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Analiz Edilen Özellikler</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Boyutlar - Öncelikli gösterim */}
                {(data.extractedFeatures.productDimensions || data.extractedFeatures.roomDimensions) && (
                  <div className="col-span-full mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.extractedFeatures.productDimensions && (
                        <DimensionDisplay
                          dimensions={data.extractedFeatures.productDimensions}
                          title="📏 Ürün Boyutları"
                          className="border-l-4 border-blue-400"
                          unit="m"
                        />
                      )}
                      {data.extractedFeatures.roomDimensions && (
                        <DimensionDisplay
                          dimensions={data.extractedFeatures.roomDimensions}
                          title="🏠 Oda Boyutları"
                          className="border-l-4 border-green-400"
                          unit="m"
                        />
                      )}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.colors.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🎨</span> Renkler
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.colors.map((color, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.styles.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>✨</span> Stiller
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.styles.map((style, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.rooms.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🏠</span> Odalar
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.rooms.map((room, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {room}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.productTypes.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🪑</span> Ürün Tipleri
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.productTypes.map((type, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.material && data.extractedFeatures.material.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🧱</span> Malzemeler
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.material.map((material, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.budget && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>💰</span> Bütçe
                    </h3>
                    <span className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                      {data.extractedFeatures.budget}
                    </span>
                  </div>
                )}

                {/* Yeni: Oda Boyutu Sınıfı */}
                {data.extractedFeatures.roomSize && (
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🏠</span> Oda Boyutu
                    </h3>
                    <div className="space-y-2">
                      <span className="px-3 py-1 bg-green-100 border border-green-300 rounded-full text-sm font-medium text-green-800 shadow-sm">
                        {data.extractedFeatures.roomSize === 'küçük' && '🏠 Küçük (12-25 m²)'}
                        {data.extractedFeatures.roomSize === 'orta' && '🏠 Orta (25-50 m²)'}
                        {data.extractedFeatures.roomSize === 'büyük' && '🏠 Büyük (50+ m²)'}
                        {!['küçük', 'orta', 'büyük'].includes(data.extractedFeatures.roomSize) && `🏠 ${data.extractedFeatures.roomSize}`}
                      </span>
                      <p className="text-xs text-green-600 mt-1">
                        {data.extractedFeatures.roomSize === 'küçük' && 'Tek kişilik yatak odası, küçük çalışma odası'}
                        {data.extractedFeatures.roomSize === 'orta' && 'Ana yatak odası, daire salon odası'}
                        {data.extractedFeatures.roomSize === 'büyük' && 'Geniş salon, açık mutfak-salon, lüks alanlar'}
                      </p>
                    </div>
                  </div>
                )}

                {data.extractedFeatures.mirrorStatus && data.extractedFeatures.mirrorStatus.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🪞</span> Ayna Durumu
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {data.extractedFeatures.mirrorStatus.map((status, index) => (
                        <span key={index} className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                          {status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.extractedFeatures.warranty && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🛡️</span> Garanti Durumu
                    </h3>
                    <span className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                      {data.extractedFeatures.warranty}
                    </span>
                  </div>
                )}

                {typeof data.extractedFeatures.doorCount === 'number' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🚪</span> Kapak Sayısı
                    </h3>
                    <span className="px-3 py-1 bg-white border rounded-full text-sm shadow-sm">
                      {data.extractedFeatures.doorCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ürün Önerileri */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <span>🛍️</span> Önerilen Ürünler 
                <span className="text-base text-gray-500 font-normal">({data.recommendations.length} adet)</span>
              </h2>
              
              {data.recommendations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-xl text-gray-600">Arama kriterlerinize uygun ürün bulunamadı.</p>
                  <p className="text-sm text-gray-500 mt-2">Lütfen farklı arama terimleri deneyin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8">
                  {data.recommendations.map((product) => (
                    <div key={product._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 relative">
                      {product.isRecommended && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10 shadow-lg">
                          ⭐ Önerilen
                        </div>
                      )}
                      {product.images && product.images.length > 0 && (
                        <ImageSlider images={product.images} />
                      )}
                      <div className="p-5">
                        <h3 className="text-xl font-semibold mb-2 text-gray-800">{product.name}</h3>
                        
                        
                        {/* Kategori ve Etiketler */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.category && typeof product.category === 'object' && product.category.name ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              Kategori Yok
                            </span>
                          )}
                          
                          {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                            product.tags.slice(0, 2).map((tag) => (
                              <span key={tag._id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                {tag.name}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Ürün Özellikleri */}
                        <div className="mb-4 space-y-2 text-sm">
                          {/* Boyutlar */}
                          {product.width && product.depth && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <span className="text-blue-600">📏</span>
                              <span className="font-medium">Boyutlar:</span>
                              <span className="font-mono text-gray-700">
                                {product.width} × {product.depth}{product.height ? ` × ${product.height}` : ''} cm
                              </span>
                            </div>
                          )}
                          
                          {/* Renk */}
                          {product.color && (
                            <div className="flex items-center gap-2">
                              <span>🎨</span>
                              <span className="font-medium">Renk:</span>
                              <span>{product.color}</span>
                            </div>
                          )}
                          
                          {/* Malzeme */}
                          {(product.material || product.materialType) && (
                            <div className="flex items-center gap-2">
                              <span>🧱</span>
                              <span className="font-medium">Malzeme:</span>
                              <span>{product.material || product.materialType}</span>
                            </div>
                          )}
                          
                          {/* Diğer özellikler */}
                          {product.doorCount && (
                            <div className="flex items-center gap-2">
                              <span>🚪</span>
                              <span className="font-medium">Kapak Sayısı:</span>
                              <span>{product.doorCount}</span>
                            </div>
                          )}
                          
                          {product.capacity && (
                            <div className="flex items-center gap-2">
                              <span>📦</span>
                              <span className="font-medium">Kapasite:</span>
                              <span>{product.capacity}</span>
                            </div>
                          )}
                        </div>

                        {/* Extra Attributes */}
                        {product.extraAttributes && Object.keys(product.extraAttributes).length > 0 && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium mb-2 text-sm text-gray-700">ℹ️ Ürün Özellikleri:</div>
                            <div className="space-y-1">
                              {Object.entries(product.extraAttributes).slice(0, 8).map(([key, value]) => (
                                <div key={key} className="text-sm text-gray-600 flex items-center gap-2">
                                  <span className="font-medium">{key}:</span> <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fiyat ve Stok */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <span className="text-2xl font-bold text-green-600">
                            {product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </span>
                          <div className="text-right">
                            <div className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock > 0 ? `✅ Stokta (${product.stock})` : '❌ Stokta Yok'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}