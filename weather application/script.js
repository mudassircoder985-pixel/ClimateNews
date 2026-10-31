const API_KEY = '8eca7e7e60873270313970179347b8a8';
// NOTE: Niche di gayi Gemini API key invalid format mein thi. 
// Google AI Studio (https://aistudio.google.com/) se apni new key le kar yahan paste karein.
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; 

const defaultCities = ['Islamabad', 'Karachi', 'Lahore', 'Peshawar', 'Quetta', 'Gilgit','Multan','Dera Ghazi Khan'];

const searchStationInput = document.getElementById('searchStation');
const searchBtn = document.getElementById('searchBtn');
const citiesGrid = document.querySelector('.cities-grid');
const alertText = document.querySelector('.announcement-text');

const aiInput = document.getElementById('aiInput'); 
const aiBtn = document.getElementById('aiBtn');     
const aiResponseText = document.getElementById('aiResponse'); 
const aiChatModal = document.getElementById('aiChatModal'); 
const closeChatBtn = document.getElementById('closeChatBtn'); 

let currentWeatherData = null; 

document.addEventListener('DOMContentLoaded', () => {
    getStationWeather('Islamabad', true);
    loadDefaultCities();
    setupChatToggle(); 
});

if (searchStationInput) {
    searchStationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
}

function setupChatToggle() {
    const assistantBtn = document.getElementById('weatherAssistantBtn') || document.querySelector('.weather-assistant');
    
    if (assistantBtn && aiChatModal) {
        assistantBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (aiChatModal.style.display === 'block') {
                aiChatModal.style.display = 'none';
            } else {
                aiChatModal.style.display = 'block';
            }
        });
    }

    if (closeChatBtn && aiChatModal) {
        closeChatBtn.addEventListener('click', () => {
            aiChatModal.style.display = 'none';
        });
    }

    if (aiBtn) {
        aiBtn.addEventListener('click', askWeatherAssistant);
    }

    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askWeatherAssistant();
        });
    }
}

function handleSearch() {
    const city = searchStationInput.value.trim();
    if (city !== '') {
        getStationWeather(city, true);
    }
}

async function getStationWeather(city, isHero = false) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            if (isHero) {
                currentWeatherData = data; 
                updateHeroCard(data);
                if (aiResponseText) {
                    aiResponseText.textContent = `${data.name} ka mausam mil gaya hai. Ab aap mujh se is ke mutabiq sawal pooch sakte hain!`;
                }
            }
            return data;
        } else {
            if (isHero && alertText) {
                alertText.textContent = `Alert: City "${city}" not found! Please check spelling.`;
            }
            return null;
        }
    } catch (err) {
        console.error('Network Error:', err);
        if (isHero && alertText) {
            alertText.textContent = 'Error connecting to weather service. Please check internet connection.';
        }
        return null;
    }
}

function updateHeroCard(data) {
    const locationElem = document.querySelector('.location-name');
    const mainTempElem = document.querySelector('.main-temp');
    const metrics = document.querySelectorAll('.metric strong');

    if (locationElem) locationElem.textContent = `${data.name}`;
    if (mainTempElem) mainTempElem.textContent = `${Math.round(data.main.temp)}°C`;

    if (metrics.length >= 3) {
        metrics[0].textContent = `${data.wind.speed} m/s`;
        metrics[1].textContent = `${data.main.humidity}%`;
        metrics[2].textContent = `${data.main.pressure} hPa`;
    }
}

async function loadDefaultCities() {
    if (!citiesGrid) return;
    
    citiesGrid.innerHTML = '';

    for (const city of defaultCities) {
        const data = await getStationWeather(city, false);
        if (data) {
            const cardHTML = `
                <div class="city-card">
                    <div class="city-info">
                        <h4>${data.name}</h4>
                        <span class="city-temp">${Math.round(data.main.temp)}°C</span>
                    </div>
                    <div class="city-stats">
                        <span><img src="wind.svg" class="svg-micro"> ${data.wind.speed} m/s</span>
                        <span><img src="humidity.svg" class="svg-micro"> ${data.main.humidity}%</span>
                    </div>
                </div>
            `;
            citiesGrid.insertAdjacentHTML('beforeend', cardHTML);
        }
    }
}

async function askWeatherAssistant() {
    if (!currentWeatherData) {
        if (aiResponseText) aiResponseText.textContent = "Pehle koi city search karein taake mausam ka pata chal sake.";
        return;
    }

    const question = aiInput ? aiInput.value.trim() : "";
    if (question === "") {
        if (aiResponseText) aiResponseText.textContent = "Meharbani kar ke AI se koi sawal poochein.";
        return;
    }

    if (aiResponseText) aiResponseText.textContent = "AI Soch raha hai...";

    try {
        // Fixed Gemini API Endpoint URL
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const systemPrompt = `Aap ek intelligent Weather Assistant hain. Aap ko is live weather JSON data ko analyze karna hai: ${JSON.stringify(currentWeatherData)}. User ke is sawal ka jawab mausam ke mutabiq dein: "${question}". User ko dosti karne, ghumne, ya kapre pehan'nay ke baare mein smart advice dein. Jawab Roman Urdu ya aasan Urdu mein ho aur chota/point-to-point ho.`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const result = await response.json();
        
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0]) {
            const aiReply = result.candidates[0].content.parts[0].text;
            if (aiResponseText) aiResponseText.textContent = aiReply;
        } else if (result.error) {
            if (aiResponseText) aiResponseText.textContent = `Google API Error: ${result.error.message}`;
            console.error('Gemini Error Details:', result.error);
        } else {
            if (aiResponseText) aiResponseText.textContent = "Maazrat, response read nahi ho pa raha. Dubara try karein.";
        }

        if (aiInput) aiInput.value = ""; 

    } catch (error) {
        console.error('AI Catch Error:', error);
        if (aiResponseText) aiResponseText.textContent = "Network Error: AI service se connect nahi ho saka.";
    }
}