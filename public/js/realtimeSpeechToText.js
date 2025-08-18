/**
 * Ses tanıma sonuçlarını işleyerek boyut formatlarını düzelten fonksiyon
 */
function processSpeechResult(speechText) {
    if (!speechText) return speechText;
    
    let processedText = speechText.toLowerCase().trim();
    
    // Sayısal boyut kalıplarını tanımla
    const dimensionPatterns = [
        // "oda boyutu beş dört iki" -> "oda boyutu: 5x4x2"
        /(oda boyutu|room size|oda ölçüsü|room dimensions)\s+((?:\b(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b\s*){2,3})/gi,
        
        // "beş dört iki metre" -> "5x4x2"  
        /((?:\b(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b\s*){2,3})\s*(?:metre|meter|m|cm|santimetre|centimeter)/gi,
        
        // Standalone "beş dört iki" kalıbı
        /\b((?:(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*){2,3})\b/gi
    ];
    
    // Sayı çeviri tablosu
    const numberMap = {
        // Türkçe sayılar
        'bir': '1', 'iki': '2', 'üç': '3', 'dört': '4', 'beş': '5',
        'altı': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'on': '10',
        'onbir': '11', 'oniki': '12', 'onüç': '13', 'ondört': '14', 'onbeş': '15',
        'yirmi': '20', 'otuz': '30', 'kırk': '40', 'elli': '50',
        
        // İngilizce sayılar
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
        'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50'
    };
    
    // Kelime sayıları rakama çevir
    function convertWordsToNumbers(text) {
        let result = text;
        for (const [word, number] of Object.entries(numberMap)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            result = result.replace(regex, number);
        }
        return result;
    }
    
    // Boyut kalıplarını işle
    for (const pattern of dimensionPatterns) {
        processedText = processedText.replace(pattern, (match, prefix, dimensions, suffix) => {
            console.log('Boyut kalıbı bulundu:', { match, prefix, dimensions, suffix });
            
            // Eğer prefix varsa (oda boyutu gibi), onu koru
            let result = prefix || '';
            
            if (dimensions) {
                // Kelime sayıları rakama çevir
                let numberText = convertWordsToNumbers(dimensions);
                
                // Rakamları çıkar ve x ile birleştir
                const numbers = numberText.match(/\d+/g);
                if (numbers && numbers.length >= 2) {
                    const dimensionStr = numbers.join('x');
                    
                    if (prefix) {
                        // "oda boyutu: 5x4x2" formatı
                        result += ': ' + dimensionStr;
                    } else {
                        // Sadece "5x4x2" formatı
                        result = dimensionStr;
                        
                        // Eğer suffix varsa (metre, cm gibi) ekle
                        if (suffix) {
                            result += ' ' + suffix;
                        }
                    }
                    
                    console.log('Dönüştürüldü:', result);
                    return result;
                }
            }
            
            return match; // Dönüştürülemezse orijinali döndür
        });
    }
    
    // Birleşik sayıları ayır (542 -> 5 4 2)
    processedText = processedText.replace(/\b(\d{3,})\b/g, (match) => {
        // 3 haneli veya daha uzun sayıları kontrol et
        if (match.length === 3) {
            // 542 -> "5 4 2" (boyut olabilir)
            return match.split('').join(' ');
        } else if (match.length > 3 && match.length <= 6) {
            // 4-6 haneli sayıları ikişer ikişer ayır
            return match.match(/.{1,2}/g).join(' ');
        }
        return match;
    });
    
    // Tekrar boyut kalıplarını işle (ayrılan sayılar için)
    for (const pattern of dimensionPatterns) {
        processedText = processedText.replace(pattern, (match, prefix, dimensions, suffix) => {
            if (dimensions) {
                let numberText = convertWordsToNumbers(dimensions);
                const numbers = numberText.match(/\d+/g);
                if (numbers && numbers.length >= 2) {
                    const dimensionStr = numbers.join('x');
                    if (prefix) {
                        return prefix + ': ' + dimensionStr;
                    }
                    return dimensionStr + (suffix ? ' ' + suffix : '');
                }
            }
            return match;
        });
    }
    
    console.log('Ses işleme sonucu:', { original: speechText, processed: processedText });
    return processedText;
}

class RealtimeSpeechToText {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:5000',
            containerId: options.containerId || 'speech-to-text-container',
            onTranscription: options.onTranscription || null,
            onError: options.onError || null,
            onStatusChange: options.onStatusChange || null,
            language: options.language || 'tr-TR',
            chunkDuration: options.chunkDuration || 250,
            processSpeech: options.processSpeech !== false, // Yeni: ses işleme aktif/pasif
            ...options
        };

        this.ws = null;
        this.mediaRecorder = null;
        this.stream = null;
        this.isRecording = false;
        this.isConnected = false;
        this.transcriptionText = '';
        this.partialText = '';
        
        this.init();
    }

    async init() {
        try {
            // Create UI container if it doesn't exist
            this.createUIContainer();
            
            // Initialize WebSocket connection
            await this.connectWebSocket();
            
            // Request microphone permission
            await this.requestMicrophonePermission();
            
            console.log('RealtimeSpeechToText initialized successfully');
        } catch (error) {
            this.handleError('Initialization failed: ' + error.message);
        }
    }

    createUIContainer() {
        let container = document.getElementById(this.options.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.containerId;
            container.className = 'speech-to-text-container';
            container.innerHTML = `
                <div class="speech-controls">
                    <button id="start-recording-btn" class="btn btn-primary" disabled>
                        <i class="fas fa-microphone"></i> Konuşmaya Başla
                    </button>
                    <button id="stop-recording-btn" class="btn btn-danger" style="display: none;">
                        <i class="fas fa-stop"></i> Durdur
                    </button>
                    <button id="clear-text-btn" class="btn btn-secondary">
                        <i class="fas fa-trash"></i> Temizle
                    </button>
                </div>
                <div class="speech-status">
                    <span id="connection-status" class="status-indicator">Bağlantı bekleniyor...</span>
                    <span id="recording-status" class="status-indicator" style="display: none;">Kayıt yapılıyor...</span>
                </div>
                <div class="transcription-output">
                    <div id="partial-text" class="partial-text"></div>
                    <div id="final-text" class="final-text"></div>
                </div>
            `;
            
            // Add to body if no specific location
            document.body.appendChild(container);
        }

        // Add event listeners
        this.addEventListeners();
        
        // Add default styles
        this.addStyles();
    }

    addStyles() {
        if (!document.getElementById('speech-to-text-styles')) {
            const style = document.createElement('style');
            style.id = 'speech-to-text-styles';
            style.textContent = `
                .speech-to-text-container {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: #f9f9f9;
                    font-family: Arial, sans-serif;
                }
                
                .speech-controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                
                .btn-primary:hover:not(:disabled) {
                    background: #0056b3;
                }
                
                .btn-danger {
                    background: #dc3545;
                    color: white;
                }
                
                .btn-danger:hover {
                    background: #c82333;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background: #545b62;
                }
                
                .speech-status {
                    margin-bottom: 15px;
                }
                
                .status-indicator {
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .status-indicator.connected {
                    background: #d4edda;
                    color: #155724;
                }
                
                .status-indicator.recording {
                    background: #fff3cd;
                    color: #856404;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .transcription-output {
                    min-height: 100px;
                    padding: 15px;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                
                .partial-text {
                    color: #6c757d;
                    font-style: italic;
                    margin-bottom: 10px;
                    min-height: 20px;
                }
                
                .final-text {
                    color: #212529;
                    line-height: 1.5;
                    white-space: pre-wrap;
                }
                
                .error {
                    color: #dc3545;
                    background: #f8d7da;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                }
            `;
            document.head.appendChild(style);
        }
    }

    addEventListeners() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const clearBtn = document.getElementById('clear-text-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopRecording());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearText());
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.options.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.updateConnectionStatus('Bağlandı', 'connected');
                    this.enableStartButton();
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleWebSocketMessage(event.data);
                };
                
                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.isConnected = false;
                    this.isRecording = false;
                    this.updateConnectionStatus('Bağlantı kesildi');
                    this.disableStartButton();
                    this.hideRecordingStatus();
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.handleError('WebSocket bağlantı hatası');
                    reject(error);
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async requestMicrophonePermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            console.log('Microphone permission granted');
        } catch (error) {
            this.handleError('Mikrofon izni alınamadı: ' + error.message);
            throw error;
        }
    }

    startRecording() {
        if (!this.isConnected || !this.stream) {
            this.handleError('Bağlantı veya mikrofon hazır değil');
            return;
        }

        try {
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            const chunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            this.mediaRecorder.onstart = () => {
                console.log('Recording started');
                this.isRecording = true;
                this.showRecordingStatus();
                this.sendWebSocketMessage({ type: 'start_recording' });
            };

            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped');
                this.isRecording = false;
                this.hideRecordingStatus();
                this.sendWebSocketMessage({ type: 'stop_recording' });
            };

            // Start recording with chunks
            this.mediaRecorder.start(this.options.chunkDuration);
            
            // Send audio chunks via WebSocket
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.isRecording) {
                    // Convert blob to base64 for WebSocket transmission
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64Audio = reader.result.split(',')[1];
                        this.sendWebSocketMessage({
                            type: 'audio_chunk',
                            audio: base64Audio
                        });
                    };
                    reader.readAsDataURL(event.data);
                }
            };

        } catch (error) {
            this.handleError('Kayıt başlatılamadı: ' + error.message);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }

    clearText() {
        this.transcriptionText = '';
        this.partialText = '';
        this.updateFinalText('');
        this.updatePartialText('');
    }

    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'transcription':
                    this.handleTranscription(message);
                    break;
                case 'recording_started':
                    console.log('Recording started on server');
                    break;
                case 'recording_stopped':
                    console.log('Recording stopped on server');
                    break;
                case 'error':
                    this.handleError('Sunucu hatası: ' + message.message);
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    handleTranscription(message) {
        let processedText = message.text;
        
        // Ses işleme aktifse metni işle
        if (this.options.processSpeech) {
            processedText = processSpeechResult(message.text);
        }
        
        if (message.isFinal) {
            // Final transcription
            this.transcriptionText += processedText + ' ';
            this.updateFinalText(this.transcriptionText);
            this.partialText = '';
            this.updatePartialText('');
            
            // Call callback with processed text
            if (this.options.onTranscription) {
                this.options.onTranscription(processedText, true);
            }
        } else {
            // Partial transcription
            this.partialText = processedText;
            this.updatePartialText(this.partialText);
            
            // Call callback with processed text
            if (this.options.onTranscription) {
                this.options.onTranscription(processedText, false);
            }
        }
    }

    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.handleError('WebSocket bağlantısı kapalı');
        }
    }

    updateConnectionStatus(text, className = '') {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = 'status-indicator ' + className;
        }
    }

    showRecordingStatus() {
        const statusElement = document.getElementById('recording-status');
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        
        if (statusElement) statusElement.style.display = 'inline';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline';
        
        this.updateStatus('recording');
    }

    hideRecordingStatus() {
        const statusElement = document.getElementById('recording-status');
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        
        if (statusElement) statusElement.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline';
        if (stopBtn) stopBtn.style.display = 'none';
        
        this.updateStatus('idle');
    }

    enableStartButton() {
        const startBtn = document.getElementById('start-recording-btn');
        if (startBtn) startBtn.disabled = false;
    }

    disableStartButton() {
        const startBtn = document.getElementById('start-recording-btn');
        if (startBtn) startBtn.disabled = true;
    }

    updatePartialText(text) {
        const element = document.getElementById('partial-text');
        if (element) {
            element.textContent = text ? `(Geçici) ${text}` : '';
        }
    }

    updateFinalText(text) {
        const element = document.getElementById('final-text');
        if (element) {
            element.textContent = text;
        }
    }

    updateStatus(status) {
        if (this.options.onStatusChange) {
            this.options.onStatusChange(status);
        }
    }

    handleError(message) {
        console.error('Speech-to-Text Error:', message);
        
        // Show error in UI
        const container = document.getElementById(this.options.containerId);
        if (container) {
            let errorDiv = container.querySelector('.error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'error';
                container.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
            
            // Remove error after 5 seconds
            setTimeout(() => {
                if (errorDiv && errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
        
        // Call error callback if provided
        if (this.options.onError) {
            this.options.onError(message);
        }
    }

    // Public methods for external control
    getTranscription() {
        return this.transcriptionText.trim();
    }

    getPartialTranscription() {
        return this.partialText;
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }

    isWebSocketConnected() {
        return this.isConnected;
    }

    // Cleanup method
    destroy() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        if (this.ws) {
            this.ws.close();
        }
        
        // Remove container
        const container = document.getElementById(this.options.containerId);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}

// Web Speech API için geliştirilmiş handler
function createEnhancedSpeechRecognition(onResult, language = 'tr-TR') {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                // Final sonuçları işle
                const processed = processSpeechResult(transcript);
                finalTranscript += processed;
            } else {
                // Interim sonuçları işle
                const processed = processSpeechResult(transcript);
                interimTranscript += processed;
            }
        }

        if (finalTranscript) {
            onResult(finalTranscript, true);
        } else if (interimTranscript) {
            onResult(interimTranscript, false);
        }
    };

    return recognition;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealtimeSpeechToText, processSpeechResult, createEnhancedSpeechRecognition };
} else if (typeof window !== 'undefined') {
    window.RealtimeSpeechToText = RealtimeSpeechToText;
    window.processSpeechResult = processSpeechResult;
    window.createEnhancedSpeechRecognition = createEnhancedSpeechRecognition;
}
