/**
 * Real-time Speech-to-Text Module
 * Uses MediaRecorder API and WebSocket for live transcription
 */
class RealtimeSpeechToText {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'ws://localhost:5000',
            containerId: options.containerId || 'speech-to-text-container',
            onTranscription: options.onTranscription || null,
            onError: options.onError || null,
            onStatusChange: options.onStatusChange || null,
            language: options.language || 'tr-TR',
            chunkDuration: options.chunkDuration || 250, // milliseconds
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
        if (message.isFinal) {
            // Final transcription
            this.transcriptionText += message.text + ' ';
            this.updateFinalText(this.transcriptionText);
            this.partialText = '';
            this.updatePartialText('');
            
            // Call callback if provided
            if (this.options.onTranscription) {
                this.options.onTranscription(message.text, true);
            }
        } else {
            // Partial transcription
            this.partialText = message.text;
            this.updatePartialText(this.partialText);
            
            // Call callback if provided
            if (this.options.onTranscription) {
                this.options.onTranscription(message.text, false);
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeSpeechToText;
} else if (typeof window !== 'undefined') {
    window.RealtimeSpeechToText = RealtimeSpeechToText;
}
