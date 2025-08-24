// API Configuration
const API_KEY = 'e92cb4f8f7dafbe812202cef042751c1';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const weatherDisplay = document.getElementById('weatherDisplay');

// Current weather elements
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const temperature = document.getElementById('temperature');
const weatherIcon = document.getElementById('weatherIcon');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecastContainer');

// Weather icon mapping
const weatherIcons = {
    '01d': '☀️',    // clear sky day
    '01n': '🌙',    // clear sky night
    '02d': '⛅',    // few clouds day
    '02n': '☁️',    // few clouds night
    '03d': '☁️',    // scattered clouds
    '03n': '☁️',    // scattered clouds
    '04d': '☁️',    // broken clouds
    '04n': '☁️',    // broken clouds
    '09d': '🌧️',   // shower rain
    '09n': '🌧️',   // shower rain
    '10d': '🌦️',   // rain day
    '10n': '🌧️',   // rain night
    '11d': '⛈️',    // thunderstorm
    '11n': '⛈️',    // thunderstorm
    '13d': '❄️',    // snow
    '13n': '❄️',    // snow
    '50d': '🌫️',    // mist
    '50n': '🌫️'     // mist
};

// Background class mapping based on weather conditions
const weatherBackgrounds = {
    'clear': 'clear',
    'clouds': 'clouds',
    'rain': 'rain',
    'drizzle': 'rain',
    'thunderstorm': 'thunderstorm',
    'snow': 'snow',
    'mist': 'mist',
    'smoke': 'mist',
    'haze': 'mist',
    'dust': 'mist',
    'fog': 'mist',
    'sand': 'mist',
    'ash': 'mist',
    'squall': 'thunderstorm',
    'tornado': 'thunderstorm'
};

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', getCurrentLocation);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    updateCurrentDate();
    
    // Test API key on startup
    console.log('🚀 Weather app starting...');
    const apiWorking = await testAPIKey();
    
    if (!apiWorking) {
        console.log('⚠️ API key issue detected, starting demo mode');
        initDemoMode();
    } else {
        console.log('✅ API key working, app ready for use!');
    }
});

/**
 * Update current date display
 */
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDate.textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Handle search button click
 */
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    await searchWeather(city);
}

/**
 * Get user's current location
 */
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser');
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await getWeatherByCoords(latitude, longitude);
        },
        (error) => {
            hideLoading();
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    showError('Location access denied by user');
                    break;
                case error.POSITION_UNAVAILABLE:
                    showError('Location information is unavailable');
                    break;
                case error.TIMEOUT:
                    showError('Location request timed out');
                    break;
                default:
                    showError('An unknown error occurred while retrieving location');
                    break;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}

/**
 * Search weather by city name
 * @param {string} city - City name to search
 */
async function searchWeather(city) {
    try {
        showLoading();
        
        // Get coordinates for the city first (for better accuracy)
        const geoResponse = await fetch(
            `${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );
        
        if (!geoResponse.ok) {
            const errorMessage = handleAPIError(geoResponse, 'City search');
            throw new Error(errorMessage);
        }
        
        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) {
            throw new Error('🏙️ City not found. Please check the spelling and try again.');
        }
        
        const { lat, lon } = geoData[0];
        await getWeatherByCoords(lat, lon);
        
    } catch (error) {
        hideLoading();
        console.error('Search error:', error);
        showError(error.message);
        
        // If API error and this is the first attempt, try demo mode
        if (error.message.includes('API Key Error')) {
            console.log('🎭 API key not working, starting demo mode...');
            initDemoMode();
        }
    }
}

/**
 * Get weather data by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function getWeatherByCoords(lat, lon) {
    try {
        // Fetch current weather and forecast
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        ]);
        
        if (!currentResponse.ok) {
            const errorMessage = handleAPIError(currentResponse, 'Current weather fetch');
            throw new Error(errorMessage);
        }
        
        if (!forecastResponse.ok) {
            const errorMessage = handleAPIError(forecastResponse, 'Forecast fetch');
            throw new Error(errorMessage);
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        hideLoading();
        displayWeather(currentData, forecastData);
        
    } catch (error) {
        hideLoading();
        console.error('Weather fetch error:', error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
        
        // If API error, try demo mode
        if (error.message.includes('API Key Error')) {
            console.log('🎭 API key not working, starting demo mode...');
            initDemoMode();
        }
    }
}

/**
 * Display weather data
 * @param {Object} current - Current weather data
 * @param {Object} forecast - Forecast data
 */
function displayWeather(current, forecast) {
    // Update current weather
    cityName.textContent = `${current.name}, ${current.sys.country}`;
    temperature.textContent = `${Math.round(current.main.temp)}°C`;
    description.textContent = current.weather[0].description;
    feelsLike.textContent = `Feels like ${Math.round(current.main.feels_like)}°C`;
    
    // Update weather icon
    const iconCode = current.weather[0].icon;
    weatherIcon.textContent = weatherIcons[iconCode] || '🌤️';
    
    // Update weather details
    humidity.textContent = `${current.main.humidity}%`;
    windSpeed.textContent = `${(current.wind.speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h
    visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`; // Convert m to km
    pressure.textContent = `${current.main.pressure} hPa`;
    
    // Update background based on weather condition
    updateBackground(current.weather[0].main.toLowerCase());
    
    // Display 5-day forecast
    displayForecast(forecast);
    
    // Show weather display and hide errors
    hideError();
    showWeatherDisplay();
    
    // Clear search input
    cityInput.value = '';
}

/**
 * Display 5-day forecast
 * @param {Object} forecastData - Forecast data from API
 */
function displayForecast(forecastData) {
    // Clear existing forecast
    forecastContainer.innerHTML = '';
    
    // Process forecast data - get one forecast per day (around noon)
    const dailyForecasts = [];
    const processedDates = new Set();
    
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();
        
        // Get forecast around noon (12:00) for each day, or the first one available
        if (!processedDates.has(dateString) && dailyForecasts.length < 5) {
            const hour = date.getHours();
            // Prefer forecasts around noon (9-15 range), but take any if none available
            if (hour >= 9 && hour <= 15 || !processedDates.has(dateString)) {
                dailyForecasts.push(item);
                processedDates.add(dateString);
            }
        }
    });
    
    // Create forecast cards
    dailyForecasts.forEach((forecast, index) => {
        const forecastCard = createForecastCard(forecast, index === 0);
        forecastContainer.appendChild(forecastCard);
    });
}

/**
 * Create forecast card element
 * @param {Object} forecast - Forecast data for a specific day
 * @param {boolean} isToday - Whether this forecast is for today
 * @returns {HTMLElement} - Forecast card element
 */
function createForecastCard(forecast, isToday) {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    
    const date = new Date(forecast.dt * 1000);
    const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const iconCode = forecast.weather[0].icon;
    const icon = weatherIcons[iconCode] || '🌤️';
    
    card.innerHTML = `
        <div class="forecast-day">${dayName}</div>
        <span class="forecast-icon">${icon}</span>
        <div class="forecast-temp">
            <span class="temp-high">${Math.round(forecast.main.temp_max)}°</span>
            <span class="temp-low">${Math.round(forecast.main.temp_min)}°</span>
        </div>
        <div class="forecast-desc">${forecast.weather[0].description}</div>
    `;
    
    return card;
}

/**
 * Update background based on weather condition
 * @param {string} condition - Weather condition
 */
function updateBackground(condition) {
    // Remove all weather-related classes
    document.body.className = '';
    
    // Add appropriate weather class
    const backgroundClass = weatherBackgrounds[condition] || 'clear';
    document.body.classList.add(backgroundClass);
}

/**
 * Show loading state
 */
function showLoading() {
    loading.classList.add('show');
    hideError();
    hideWeatherDisplay();
}

/**
 * Hide loading state
 */
function hideLoading() {
    loading.classList.remove('show');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add('show');
    hideWeatherDisplay();
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.remove('show');
}

/**
 * Show weather display
 */
function showWeatherDisplay() {
    weatherDisplay.classList.add('show');
}

/**
 * Hide weather display
 */
function hideWeatherDisplay() {
    weatherDisplay.classList.remove('show');
}

// API Key validation
if (API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
    console.warn('⚠️ Please replace YOUR_OPENWEATHERMAP_API_KEY with your actual OpenWeatherMap API key');
    showError('API key not configured. Please check the setup instructions.');
}

/**
 * Handle API errors and provide helpful messages
 * @param {Response} response - Fetch response object
 * @param {string} operation - Description of the operation that failed
 */
function handleAPIError(response, operation) {
    let errorMessage;
    
    switch (response.status) {
        case 401:
            errorMessage = '🔑 API Key Error: Your API key may be invalid or not activated yet. New keys can take 10-15 minutes to activate. Please wait and try again.';
            break;
        case 404:
            errorMessage = '🏙️ City not found. Please check the spelling and try again.';
            break;
        case 429:
            errorMessage = '⏱️ Too many requests. Please wait a moment and try again.';
            break;
        case 500:
        case 502:
        case 503:
            errorMessage = '🔧 Weather service temporarily unavailable. Please try again later.';
            break;
        default:
            errorMessage = `❌ ${operation} failed. Please try again later.`;
    }
    
    console.error(`API Error (${response.status}):`, errorMessage);
    return errorMessage;
}

/**
 * Test API key validity
 */
async function testAPIKey() {
    try {
        console.log('🧪 Testing API key...');
        const response = await fetch(
            `${BASE_URL}/weather?q=London&appid=${API_KEY}&units=metric`
        );
        
        if (response.ok) {
            console.log('✅ API key is working correctly!');
            return true;
        } else {
            const error = handleAPIError(response, 'API key test');
            showError(error);
            return false;
        }
    } catch (error) {
        console.error('❌ API test failed:', error);
        showError('Network error. Please check your internet connection.');
        return false;
    }
}

/**
 * Initialize demo mode with sample data (when API key is not working)
 */
function initDemoMode() {
    console.log('🎭 Starting demo mode with sample data...');
    
    const demoData = {
        current: {
            name: "Chennai",
            sys: { country: "IN" },
            main: {
                temp: 32,
                feels_like: 36,
                humidity: 78,
                pressure: 1008
            },
            weather: [{
                main: "Clear",
                description: "sunny",
                icon: "01d"
            }],
            wind: { speed: 2.5 },
            visibility: 8000
        },
        forecast: {
            list: [
                {
                    dt: Date.now() / 1000,
                    main: { temp_max: 34, temp_min: 26 },
                    weather: [{ main: "Clear", description: "sunny", icon: "01d" }]
                },
                {
                    dt: (Date.now() / 1000) + 86400,
                    main: { temp_max: 33, temp_min: 25 },
                    weather: [{ main: "Clouds", description: "partly cloudy", icon: "02d" }]
                },
                {
                    dt: (Date.now() / 1000) + 172800,
                    main: { temp_max: 30, temp_min: 24 },
                    weather: [{ main: "Rain", description: "light rain", icon: "10d" }]
                },
                {
                    dt: (Date.now() / 1000) + 259200,
                    main: { temp_max: 29, temp_min: 23 },
                    weather: [{ main: "Rain", description: "moderate rain", icon: "10d" }]
                },
                {
                    dt: (Date.now() / 1000) + 345600,
                    main: { temp_max: 31, temp_min: 25 },
                    weather: [{ main: "Clouds", description: "overcast", icon: "04d" }]
                }
            ]
        }
    };
    
    setTimeout(() => {
        hideLoading();
        displayWeather(demoData.current, demoData.forecast);
        
        // Show demo notice
        const demoNotice = document.createElement('div');
        demoNotice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b6b;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            z-index: 1000;
            font-size: 0.9rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        `;
        demoNotice.innerHTML = '🎭 Demo Mode - Using sample data';
        document.body.appendChild(demoNotice);
        
        setTimeout(() => demoNotice.remove(), 5000);
    }, 1000);
}