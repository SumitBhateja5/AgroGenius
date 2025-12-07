import os
import base64
import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from chat1 import fetch_website_content, extract_pdf_text, initialize_vector_store
from chat2 import (
    analyze_image_with_text, 
    analyze_crop_disease,
    get_farming_advice,
    calculate_resources,
    setup_retrieval_qa,
    setup_sustainability_qa
)

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

WEATHER_API_KEY = "fca22fd77b165be8f104eac5dbd4f4c4"

# Initialize knowledge base
urls = ["https://mospi.gov.in/4-agricultural-statistics"]
pdf_files = ["Data/Farming Schemes.pdf", "Data/farmerbook.pdf"]

website_contents = [fetch_website_content(url) for url in urls]
pdf_texts = [extract_pdf_text(pdf_file) for pdf_file in pdf_files]
all_contents = website_contents + pdf_texts

db = initialize_vector_store(all_contents)
chat_chain = setup_retrieval_qa(db)
sustainability_chain = setup_sustainability_qa(db)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_mime_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    mime_types = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp'}
    return mime_types.get(ext, 'image/jpeg')

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/weather')
def weather():
    return render_template('weather.html')

@app.route('/disease')
def disease():
    return render_template('disease.html')

@app.route('/calculator')
def calculator():
    return render_template('calculator.html')

@app.route('/sustainability')
def sustainability():
    return render_template('sustainability.html')

# API Endpoints
@app.route('/api/chat', methods=['POST'])
def api_chat():
    query = request.form.get('messageText', '').strip()
    image_file = request.files.get('image')
    
    if image_file and image_file.filename and allowed_file(image_file.filename):
        try:
            image_data = image_file.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            mime_type = get_mime_type(image_file.filename)
            
            if not query:
                query = "Analyze this agricultural image and provide insights."
            
            answer = analyze_image_with_text(image_base64, query, mime_type)
            return jsonify({"answer": answer})
        except Exception as e:
            return jsonify({"error": f"Error processing image: {str(e)}"})
    
    if not query:
        return jsonify({"error": "Please provide a message or image."})
    
    response = chat_chain.invoke(query)
    return jsonify({"answer": response})

@app.route('/api/weather', methods=['POST'])
def api_weather():
    data = request.get_json()
    city = data.get('city', '')
    crop_type = data.get('crop_type', 'general')
    
    if not city:
        return jsonify({"error": "Please provide a city name."})
    
    if not WEATHER_API_KEY or WEATHER_API_KEY == "yo    ur_openweathermap_api_key_here":
        return jsonify({"error": "Weather API key not configured. Please add your OpenWeatherMap API key to .env file."})
    
    try:
        weather_url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()
        
        if weather_response.status_code != 200:
            error_msg = weather_data.get('message', 'Unknown error')
            return jsonify({"error": f"Could not fetch weather for {city}: {error_msg}"})
        
        advice = get_farming_advice(weather_data, crop_type)
        
        return jsonify({
            "weather": {
                "city": weather_data.get('name'),
                "temp": weather_data.get('main', {}).get('temp'),
                "humidity": weather_data.get('main', {}).get('humidity'),
                "description": weather_data.get('weather', [{}])[0].get('description'),
                "wind_speed": weather_data.get('wind', {}).get('speed'),
                "icon": weather_data.get('weather', [{}])[0].get('icon')
            },
            "advice": advice
        })
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"})

@app.route('/api/disease', methods=['POST'])
def api_disease():
    image_file = request.files.get('image')
    
    if not image_file or not image_file.filename:
        return jsonify({"error": "Please upload an image of the crop."})
    
    if not allowed_file(image_file.filename):
        return jsonify({"error": "Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WEBP."})
    
    try:
        image_data = image_file.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        mime_type = get_mime_type(image_file.filename)
        
        diagnosis = analyze_crop_disease(image_base64, mime_type)
        return jsonify({"diagnosis": diagnosis})
    except Exception as e:
        return jsonify({"error": f"Error analyzing image: {str(e)}"})

@app.route('/api/calculate', methods=['POST'])
def api_calculate():
    data = request.get_json()
    
    crop_type = data.get('crop_type', '')
    area = data.get('area', '')
    area_unit = data.get('area_unit', 'acres')
    soil_type = data.get('soil_type', 'loamy')
    growth_stage = data.get('growth_stage', 'vegetative')
    
    if not crop_type or not area:
        return jsonify({"error": "Please provide crop type and area."})
    
    try:
        result = calculate_resources(crop_type, area, area_unit, soil_type, growth_stage)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": f"Error calculating: {str(e)}"})

@app.route('/api/sustainability', methods=['POST'])
def api_sustainability():
    data = request.get_json()
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({"error": "Please provide a question about sustainable farming."})
    
    response = sustainability_chain.invoke(query)
    return jsonify({"answer": response})

if __name__ == "__main__":
    app.run(dhost="0.0.0.0", port=int(5000))
