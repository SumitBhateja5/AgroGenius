import os
import base64
from dotenv import load_dotenv
from groq import Groq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_groq import ChatGroq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize Groq client for multimodal
groq_client = Groq(api_key=GROQ_API_KEY)

# Initialize the language model for text-only RAG
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.1,
    max_tokens=1024,
    groq_api_key=GROQ_API_KEY
)

def analyze_image_with_text(image_base64, user_query="What do you see in this image?", mime_type="image/jpeg"):
    """Analyze image using Groq's vision model for agriculture."""
    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": """You are AgriGenius, an expert agricultural AI assistant specializing in:
- Crop disease identification and diagnosis
- Plant health assessment
- Pest identification and management
- Soil condition analysis
- Crop growth stage identification
- Nutrient deficiency detection

When analyzing images:
1. Identify the crop/plant species if visible
2. Look for signs of disease (spots, discoloration, wilting, lesions)
3. Check for pest damage or presence
4. Assess overall plant health
5. Provide specific treatment recommendations

If the image is NOT related to agriculture, politely inform the user that you can only analyze agricultural images.
Keep responses under 200 words and be specific with actionable advice."""
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_query},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}}
                    ]
                }
            ],
            temperature=0.3,
            max_tokens=600
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

def analyze_crop_disease(image_base64, mime_type="image/jpeg"):
    """Specialized crop disease detection."""
    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": """You are AgriGenius Disease Detection System. Analyze crop images for diseases.

For each analysis, provide:
1. **Plant Identified**: Name of the crop/plant
2. **Health Status**: Healthy / Mild Issue / Moderate Issue / Severe Issue
3. **Disease Detected**: Name of disease (if any) or "No disease detected"
4. **Symptoms Observed**: List visible symptoms
5. **Possible Causes**: Environmental, pathogen, nutrient deficiency, etc.
6. **Treatment Recommendations**: Specific actionable steps
7. **Prevention Tips**: How to prevent future occurrence

If image is not a plant/crop, respond: "Please upload an image of a crop or plant for disease analysis."

Be precise and scientific but explain in simple terms farmers can understand."""
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this crop image for any diseases, pests, or health issues. Provide detailed diagnosis and treatment recommendations."},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}}
                    ]
                }
            ],
            temperature=0.2,
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

def get_farming_advice(weather_data, crop_type="general"):
    """Get farming advice based on weather conditions."""
    try:
        weather_summary = f"""
        Location: {weather_data.get('name', 'Unknown')}
        Temperature: {weather_data.get('main', {}).get('temp', 'N/A')}°C
        Humidity: {weather_data.get('main', {}).get('humidity', 'N/A')}%
        Weather: {weather_data.get('weather', [{}])[0].get('description', 'N/A')}
        Wind Speed: {weather_data.get('wind', {}).get('speed', 'N/A')} m/s
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are AgriGenius Weather Advisory System. Provide farming decisions based on weather data.

Provide advice on:
1. **Today's Farming Activities**: What to do / avoid
2. **Irrigation Advice**: Water requirements based on conditions
3. **Pest & Disease Alert**: Weather-related risks
4. **Crop Protection**: Measures to take
5. **Best Time for Field Work**: Optimal hours

Keep advice practical and actionable for farmers."""
                },
                {
                    "role": "user",
                    "content": f"Based on this weather data, provide farming advice:\n{weather_summary}\nCrop type: {crop_type}"
                }
            ],
            temperature=0.3,
            max_tokens=600
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error getting advice: {str(e)}"

def calculate_resources(crop_type, area, area_unit, soil_type, growth_stage):
    """Calculate resource requirements for farming."""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are AgriGenius Resource Calculator. Calculate farming resource requirements.

Provide detailed calculations for:
1. **Water Requirements**: Daily/weekly irrigation needs in liters
2. **Fertilizer Requirements**: NPK ratios and quantities in kg
3. **Seed Requirements**: If applicable, quantity needed
4. **Labor Estimate**: Person-days required
5. **Estimated Cost**: Approximate cost breakdown
6. **Schedule**: When to apply what

Use standard agricultural formulas and provide practical estimates.
Format numbers clearly and provide ranges where appropriate."""
                },
                {
                    "role": "user",
                    "content": f"""Calculate resource requirements for:
- Crop: {crop_type}
- Area: {area} {area_unit}
- Soil Type: {soil_type}
- Growth Stage: {growth_stage}

Provide detailed resource calculations and recommendations."""
                }
            ],
            temperature=0.2,
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error calculating resources: {str(e)}"

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def setup_retrieval_qa(db):
    """Setup RAG chain for agricultural queries."""
    retriever = db.as_retriever(search_kwargs={"k": 4})

    prompt_template = """You are AgriGenius, an expert agricultural AI assistant. 
Answer ONLY questions related to agriculture, farming, crops, livestock, soil, irrigation, and related topics.

If the question is NOT related to agriculture, politely respond: "I'm AgriGenius, specialized in agriculture. Please ask me questions about farming, crops, soil, irrigation, or other agricultural topics."

Use the context provided to give accurate, helpful answers. Explain in simple words that farmers can understand.
Keep answers under 150 words unless more detail is needed.
    
CONTEXT: {context}

QUESTION: {question}

ANSWER:"""

    prompt = PromptTemplate.from_template(prompt_template)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain

def setup_sustainability_qa(db):
    """Setup RAG chain for sustainability tips."""
    retriever = db.as_retriever(search_kwargs={"k": 4})

    prompt_template = """You are AgriGenius Sustainability Advisor. Focus on environmentally sustainable farming practices.

Topics you cover:
- Organic farming methods
- Water conservation techniques
- Soil health preservation
- Reducing chemical usage
- Carbon footprint reduction
- Biodiversity preservation
- Sustainable pest management
- Crop rotation benefits
- Composting and natural fertilizers

Provide practical, eco-friendly advice that farmers can implement.
    
CONTEXT: {context}

QUESTION: {question}

SUSTAINABLE FARMING ADVICE:"""

    prompt = PromptTemplate.from_template(prompt_template)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain
