require('dotenv').config();
const axios = require('axios');

async function testAI() {
    try {
        console.log('API Key:', process.env.GOOGLE_AI_API_KEY ? 'Mevcut' : 'Yok');
        
        const prompt = 'Extract features from: living room koltuk. Return only JSON: {"room": "", "productType": ""}';
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { 
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );
        
        console.log('AI Response:', response.data.candidates[0].content.parts[0].text);
        
    } catch (error) {
        console.error('AI Test Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

testAI();
