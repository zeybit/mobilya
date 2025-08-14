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
  extraAttributes?: Record<string, any>;
}

interface ExtractedFeatures {
  colors: string[];
  styles: string[];
  rooms: string[];
  productTypes: string[];
  roomColors?: string[];
  budget?: string;
  brand?: string;
  material?: string;
  quantity?: string;
  purpose?: string;
}

interface RecommendationResponse {
  recommendations: Product[];
  extractedFeatures: ExtractedFeatures;
  recommendationMessage: string | null;
  isExactMatch?: boolean;
}

// Slider komponenti
const ImageSlider = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  return (
    <div className="relative group">
      <img
        src={images[currentIndex]}
        alt={`Slide ${currentIndex + 1}`}
        className="w-full h-48 object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
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
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
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
          timeout: 10000,
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
          Mobilya Önerileri
        </h1>
        
        {/* Arama kutusu açıklaması */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
          <p className="mb-2 font-medium">Aradığınız ürünü ve isteğe bağlı olarak oda boyutunu girin.</p>
          <ul className="list-disc list-inside text-sm mb-2">
            <li>'Beyaz modern koltuk oda boyutu: 300x400x250'</li>
            <li>'4 kapaklı mdf gardırop room size: 250x350x240'</li>
            <li>'Bohem 3+3+1+1 koltuk takımı'</li>
          </ul>
          <p className="text-sm">Oda boyutunu belirtmek için:<br/>
            <span className="ml-2">- Türkçe: <b>oda boyutu: ENxBOYxYÜKSEKLİK</b></span><br/>
            <span className="ml-2">- İngilizce: <b>room size: WIDTHxDEPTHxHEIGHT</b></span><br/>
            (Örn: oda boyutu: 300x400x250)
          </p>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn: Beyaz koltuk oda boyutu: 300x400x250"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Sesli arama butonu */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`px-3 py-3 rounded-lg border ${
              isListening 
                ? 'bg-red-100 border-red-400 text-red-600 animate-pulse' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
            } flex items-center`}
            title="Sesli arama"
          >
            {isListening ? 'Durdur' : 'Sesle Ara'}
          </button>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Aranıyor...' : 'Ara'}
          </button>
        </div>

        {/* Tarayıcı desteği uyarısı */}
        {!speechSupported && (
          <div className="text-center text-red-500 mb-4">
            Tarayıcınızda sesli giriş desteklenmiyor.<br />
            <span className="text-sm">
              Lütfen <b>Google Chrome</b> veya Chromium tabanlı bir tarayıcı kullanın.<br />
              Alternatif olarak, metin kutusunu kullanarak arama yapabilirsiniz.
            </span>
          </div>
        )}

        {loading && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="text-center text-gray-600">
            Henüz bir arama yapılmadı.
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Öneri Mesajı */}
            {data.recommendationMessage && (
              <div className={`p-4 rounded-lg ${
                data.isExactMatch 
                  ? 'bg-blue-50 text-blue-800' 
                  : 'bg-green-50 text-green-800'
              }`}>
                <p className="text-lg font-medium">{data.recommendationMessage}</p>
              </div>
            )}

            {/* Çıkarılan Özellikler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.extractedFeatures.colors.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">Renkler</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.extractedFeatures.colors.map((color, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.extractedFeatures.styles.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">Stiller</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.extractedFeatures.styles.map((style, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.extractedFeatures.rooms.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">Odalar</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.extractedFeatures.rooms.map((room, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {room}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.extractedFeatures.productTypes.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-2">Ürün Tipleri</h3>
                  <div className="flex flex-wrap gap-1">
                    {data.extractedFeatures.productTypes.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ürün Önerileri */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Önerilen Ürünler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.recommendations.map((product) => (
                  <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
                    {product.isRecommended && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                        Önerilen
                      </div>
                    )}
                    {product.images && product.images.length > 0 && (
                      <ImageSlider images={product.images} />
                    )}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                      <p className="text-gray-600 mb-2">{product.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Güvenli category erişimi */}
                        {product.category && typeof product.category === 'object' && product.category.name ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            Kategori Yok
                          </span>
                        )}
                        
                        {/* Güvenli tags erişimi */}
                        {product.tags && Array.isArray(product.tags) && product.tags.length > 0 ? (
                          product.tags.map((tag) => (
                            <span key={tag._id} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                            Etiket Yok
                          </span>
                        )}
                      </div>
                      {/* Ebatlar ve diğer özellikler */}
                      <div className="mb-2 text-sm text-gray-700">
                        {product.width && product.depth && product.height && (
                          <div>Ebatlar: {product.width} x {product.depth} x {product.height} cm</div>
                        )}
                        {product.doorCount && (
                          <div>Kapak Sayısı: {product.doorCount}</div>
                        )}
                        {product.capacity && (
                          <div>Kapasite: {product.capacity}</div>
                        )}
                        {product.material && (
                          <div>Malzeme: {product.material}</div>
                        )}
                        {/* Extra Attributes */}
                        {product.extraAttributes && Object.keys(product.extraAttributes).length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium mb-1">Ekstra Özellikler:</div>
                            <ul className="list-disc list-inside">
                              {Object.entries(product.extraAttributes).map(([key, value]) => (
                                <li key={key}><span className="font-semibold">{key}:</span> {String(value)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-blue-600">
                          {product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                        <span className="text-sm text-gray-500">
                          Stok: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}