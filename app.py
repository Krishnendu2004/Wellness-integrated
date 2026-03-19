import os
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
import tensorflow as tf
import random
from datetime import datetime
from PIL import Image
import warnings
from werkzeug.utils import secure_filename
import uuid
import json
import traceback

warnings.filterwarnings('ignore')

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['SECRET_KEY'] = 'final-health-app-secret-2024'
CORS(app)

# ============================================
# CONFIGURATION
# ============================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
TEMP_DIR = os.path.join(BASE_DIR, 'temp')
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# ============================================
# LOAD ALL MODELS
# ============================================

def load_calorie_model():
    try:
        path = os.path.join(MODELS_DIR, 'calorie_predictor (1).keras')
        if os.path.exists(path):
            model = load_model(path)
            print(f"✅ Calorie Predictor model loaded")
            return model
        return None
    except Exception as e:
        print(f"⚠️ Error loading calorie model: {e}")
        return None

def load_diet_model():
    try:
        path = os.path.join(MODELS_DIR, 'diet_recommender_enhanced (1).keras')
        if os.path.exists(path):
            model = load_model(path)
            print(f"✅ Diet Recommender model loaded")
            return model
        return None
    except Exception as e:
        print(f"⚠️ Error loading diet model: {e}")
        return None

def load_macro_model():
    try:
        path = os.path.join(MODELS_DIR, 'macro_predictor_enhanced (1).keras')
        if os.path.exists(path):
            model = load_model(path)
            print(f"✅ Macro Predictor model loaded")
            return model
        return None
    except Exception as e:
        print(f"⚠️ Error loading macro model: {e}")
        return None

def load_image_model():
    try:
        paths = [
            os.path.join(MODELS_DIR, 'food_cnn_model.h5'),
            os.path.join(MODELS_DIR, 'food_mobilenet_model.h5')
        ]
        for path in paths:
            if os.path.exists(path):
                print(f"🔄 Loading image model from {os.path.basename(path)}...")
                model = load_model(path, compile=False)
                print(f"✅ Food Image model loaded from {os.path.basename(path)}")
                print(f"   Input shape:  {model.input_shape}")
                print(f"   Output shape: {model.output_shape}")
                # Warm up with dummy prediction so graph is compiled
                try:
                    dummy = np.zeros((1, 256, 256, 3), dtype=np.float32)
                    _ = model.predict(dummy, verbose=0)
                    print(f"✅ Model warmed up successfully")
                except Exception as warm_err:
                    print(f"⚠️ Warmup failed (non-fatal): {warm_err}")
                return model
        print("⚠️ No image model file found in models directory")
        return None
    except Exception as e:
        print(f"⚠️ Error loading image model: {e}")
        traceback.print_exc()
        return None

def load_class_names():
    try:
        path = os.path.join(BASE_DIR, 'class_names.txt')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                class_names = [line.strip() for line in f if line.strip()]
            print(f"✅ Loaded {len(class_names)} class names")
            return class_names
        return []
    except Exception as e:
        print(f"⚠️ Error loading class_names.txt: {e}")
        return []

def load_calories_lookup():
    try:
        path = os.path.join(BASE_DIR, 'calories_lookup.csv')
        if os.path.exists(path):
            df = pd.read_csv(path)
            calories_dict = {}
            for _, row in df.iterrows():
                food_name = str(row.iloc[0]).lower().strip()
                calories = float(row.iloc[1])
                calories_dict[food_name] = calories
            print(f"✅ Loaded {len(calories_dict)} calorie entries")
            return calories_dict
        return {}
    except Exception as e:
        print(f"⚠️ Error loading calories_lookup.csv: {e}")
        return {}

def load_complete_food_dataset():
    try:
        path = os.path.join(BASE_DIR, 'complete_food_dataset.csv')
        if os.path.exists(path):
            df = pd.read_csv(path)
            print(f"✅ Loaded complete food dataset with {len(df)} items")
            return df.to_dict('records')
        return []
    except Exception as e:
        print(f"⚠️ Error loading complete_food_dataset.csv: {e}")
        return []

# Initialize all models and data
CALORIE_MODEL = load_calorie_model()
DIET_MODEL = load_diet_model()
MACRO_MODEL = load_macro_model()
IMAGE_MODEL = load_image_model()
CLASS_NAMES = load_class_names()
CALORIES_LOOKUP = load_calories_lookup()
FOOD_DATASET = load_complete_food_dataset()

print(f"\n📊 System Status:")
print(f"   • Calorie Model: {'✅' if CALORIE_MODEL else '❌'}")
print(f"   • Diet Model: {'✅' if DIET_MODEL else '❌'}")
print(f"   • Macro Model: {'✅' if MACRO_MODEL else '❌'}")
print(f"   • Image Model: {'✅' if IMAGE_MODEL else '❌'}")
print(f"   • Class Names: {len(CLASS_NAMES)}")
print(f"   • Calorie Entries: {len(CALORIES_LOOKUP)}")
print(f"   • Food Dataset: {len(FOOD_DATASET)} items")

# ============================================
# CREATE FOOD DATABASE FROM YOUR CSV
# ============================================
def create_food_database():
    foods = []
    if FOOD_DATASET:
        for idx, item in enumerate(FOOD_DATASET):
            name = item.get('food_name', item.get('name', f'Food_{idx}'))
            if pd.isna(name): name = f'Food_{idx}'
            region = item.get('region', 'Various')
            if pd.isna(region): region = 'Various'
            food_type = item.get('type', 'veg')
            if pd.isna(food_type): food_type = 'veg'
            calories = float(item.get('calories', 200)) if not pd.isna(item.get('calories')) else 200
            protein = float(item.get('protein_g', item.get('protein', 10))) if not pd.isna(item.get('protein_g', item.get('protein', 10))) else 10
            carbs = float(item.get('carbs_g', item.get('carbs', 20))) if not pd.isna(item.get('carbs_g', item.get('carbs', 20))) else 20
            fat = float(item.get('fat_g', item.get('fat', 10))) if not pd.isna(item.get('fat_g', item.get('fat', 10))) else 10
            fiber = float(item.get('fiber_g', item.get('fiber', 3))) if not pd.isna(item.get('fiber_g', item.get('fiber', 3))) else 3
            category = item.get('category', 'main')
            if pd.isna(category): category = 'main'
            ingredients = item.get('ingredients', '')
            if pd.isna(ingredients): ingredients = ''
            prep_time = item.get('prep_time_mins', 30)
            if pd.isna(prep_time): prep_time = 30
            meal_cat = 'main'
            name_lower = str(name).lower()
            if any(word in name_lower for word in ['breakfast', 'idli', 'dosa', 'paratha', 'pancake', 'oat', 'cereal']):
                meal_cat = 'breakfast'
            elif any(word in name_lower for word in ['snack', 'samosa', 'pakora', 'chaat', 'finger', 'bite', 'cookie']):
                meal_cat = 'snack'
            ingredients_list = []
            if ingredients and isinstance(ingredients, str):
                ingredients_list = [i.strip() for i in ingredients.split(',') if i.strip()]
            if not ingredients_list:
                ingredients_list = ['Fresh ingredients', 'Traditional spices']
            food = {
                'id': idx + 1,
                'name': str(name),
                'region': str(region),
                'type': str(food_type),
                'calories': calories,
                'protein': protein,
                'carbs': carbs,
                'fat': fat,
                'fiber': fiber,
                'category': meal_cat,
                'ingredients': ingredients,
                'ingredients_list': ingredients_list,
                'prep_time': prep_time,
                'description': f"Delicious {name} from {region} cuisine.",
                'health_score': random.randint(65, 95)
            }
            foods.append(food)
    print(f"✅ Created database with {len(foods)} foods")
    return foods

FOOD_DATABASE = create_food_database()

# ============================================
# NUTRITION CALCULATION FUNCTIONS
# ============================================
def calculate_bmr(weight, height, age, gender):
    if gender.lower() == 'male':
        return (10 * weight) + (6.25 * height) - (5 * age) + 5
    else:
        return (10 * weight) + (6.25 * height) - (5 * age) - 161

def calculate_tdee(bmr, activity_level):
    multipliers = {
        'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55,
        'active': 1.725, 'very_active': 1.9
    }
    return bmr * multipliers.get(activity_level, 1.55)

def calculate_target_calories(tdee, goal):
    if goal == 'weight_loss':
        return max(tdee - 500, 1500)
    elif goal == 'muscle_gain':
        return tdee + 300
    return tdee

def activity_to_numeric(activity):
    return {'sedentary': 0, 'light': 1, 'moderate': 2, 'active': 3, 'very_active': 4}.get(activity, 2)

def goal_to_numeric(goal):
    return {'weight_loss': 0, 'maintenance': 1, 'muscle_gain': 2}.get(goal, 1)

def position_to_numeric(position):
    return {'goalkeeper': 0, 'defender': 1, 'midfielder': 2, 'forward': 3, 'athlete': 4, 'sedentary': 5}.get(position, 2)

def calculate_macros_with_model(calories, weight, height, age, gender, activity, goal, position):
    if MACRO_MODEL is not None:
        try:
            features = np.array([[weight, height, age,
                                   1 if gender == 'male' else 0,
                                   activity_to_numeric(activity),
                                   goal_to_numeric(goal),
                                   position_to_numeric(position)]])
            predictions = MACRO_MODEL.predict(features, verbose=0)[0]
            if len(predictions) >= 3:
                return {
                    'protein': round(float(predictions[0])),
                    'carbs': round(float(predictions[1])),
                    'fat': round(float(predictions[2]))
                }
        except Exception as e:
            print(f"⚠️ Error using macro model: {e}")
    return calculate_macros_traditional(calories, weight, goal, position)

def calculate_macros_traditional(calories, weight, goal, position):
    position_factors = {
        'goalkeeper': {'protein': 1.15, 'carbs': 0.9, 'fat': 1.0},
        'defender': {'protein': 1.2, 'carbs': 1.0, 'fat': 1.0},
        'midfielder': {'protein': 1.0, 'carbs': 1.25, 'fat': 0.9},
        'forward': {'protein': 1.1, 'carbs': 1.2, 'fat': 0.9},
        'athlete': {'protein': 1.15, 'carbs': 1.15, 'fat': 0.95},
        'sedentary': {'protein': 0.9, 'carbs': 0.8, 'fat': 0.9}
    }
    factor = position_factors.get(position, position_factors['midfielder'])
    if goal == 'muscle_gain':
        base_protein = weight * 2.2
        base_fat = weight * 1.0
    elif goal == 'weight_loss':
        base_protein = weight * 2.0
        base_fat = weight * 0.8
    else:
        base_protein = weight * 1.8
        base_fat = weight * 0.9
    protein = base_protein * factor['protein']
    fat = base_fat * factor['fat']
    carbs = (calories - (protein * 4) - (fat * 9)) / 4 * factor['carbs']
    return {
        'protein': round(max(protein, 0)),
        'carbs': round(max(carbs, 0)),
        'fat': round(max(fat, 0))
    }

# ============================================
# MEAL PLAN GENERATION
# ============================================
def generate_position_based_meal_plan(user_data):
    calories = user_data['target_calories']
    preference = user_data.get('preference', 'all')
    cuisine = user_data.get('cuisine', 'All')
    position = user_data.get('position', 'midfielder')
    position_adjustments = {
        'goalkeeper': {'protein_mult': 1.1, 'carbs_mult': 0.9, 'fat_mult': 1.0},
        'defender': {'protein_mult': 1.2, 'carbs_mult': 1.0, 'fat_mult': 1.0},
        'midfielder': {'protein_mult': 1.0, 'carbs_mult': 1.3, 'fat_mult': 0.9},
        'forward': {'protein_mult': 1.1, 'carbs_mult': 1.2, 'fat_mult': 0.9},
        'athlete': {'protein_mult': 1.2, 'carbs_mult': 1.2, 'fat_mult': 0.9},
        'sedentary': {'protein_mult': 0.9, 'carbs_mult': 0.8, 'fat_mult': 0.8}
    }
    adj = position_adjustments.get(position, position_adjustments['midfielder'])
    suitable = FOOD_DATABASE.copy()
    if preference != 'all':
        suitable = [f for f in suitable if f['type'] == preference]
    if cuisine != 'All':
        suitable = [f for f in suitable if cuisine.lower() in f['region'].lower()]
    if not suitable:
        suitable = FOOD_DATABASE
    meals = [
        {'name': '🍳 Breakfast', 'pct': 0.25, 'cats': ['breakfast'], 'focus': 'energy'},
        {'name': '🥪 Morning Snack', 'pct': 0.10, 'cats': ['snack'], 'focus': 'light'},
        {'name': '🍲 Lunch', 'pct': 0.30, 'cats': ['main', 'lunch'], 'focus': 'balanced'},
        {'name': '🍎 Evening Snack', 'pct': 0.10, 'cats': ['snack'], 'focus': 'light'},
        {'name': '🍽️ Dinner', 'pct': 0.25, 'cats': ['main', 'dinner'], 'focus': 'protein'}
    ]
    meal_plan = []
    used = set()
    for meal in meals:
        target = int(calories * meal['pct'])
        if meal['focus'] == 'protein':
            target = int(target * adj['protein_mult'])
        elif meal['focus'] == 'energy':
            target = int(target * adj['carbs_mult'])
        candidates = [f for f in suitable if f['name'] not in used and any(cat in f['category'] for cat in meal['cats'])]
        if not candidates:
            candidates = [f for f in suitable if f['name'] not in used]
        if candidates:
            for food in candidates:
                calorie_score = 1 - min(abs(food['calories'] - target) / target, 1)
                focus_score = 0
                if meal['focus'] == 'protein':
                    focus_score = min(food['protein'] / 30, 1)
                elif meal['focus'] == 'energy':
                    focus_score = min(food['carbs'] / 50, 1) * 0.7
                elif meal['focus'] == 'balanced':
                    focus_score = (min(food['protein'] / 25, 1) + min(food['carbs'] / 40, 1)) / 2
                food['score'] = calorie_score * 0.6 + focus_score * 0.4
            best = max(candidates, key=lambda x: x.get('score', 0))
            used.add(best['name'])
            meal_plan.append({
                'meal': meal['name'],
                'food': best['name'],
                'calories': best['calories'],
                'protein': best['protein'],
                'carbs': best['carbs'],
                'fat': best['fat']
            })
        else:
            meal_plan.append({
                'meal': meal['name'],
                'food': 'Balanced Meal',
                'calories': target,
                'protein': round(target * 0.25 / 4),
                'carbs': round(target * 0.5 / 4),
                'fat': round(target * 0.25 / 9)
            })
    return meal_plan

# ============================================
# HEALTH TOOL FUNCTIONS
# ============================================
def calculate_bmi(height_cm, weight_kg):
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m * height_m), 2)
    if bmi < 18.5:
        return {"bmi": bmi, "category": "Underweight", "advice": "Increase calorie intake with protein-rich foods"}
    elif bmi < 25:
        return {"bmi": bmi, "category": "Normal", "advice": "Maintain your current routine"}
    elif bmi < 30:
        return {"bmi": bmi, "category": "Overweight", "advice": "Focus on cardio and balanced nutrition"}
    else:
        return {"bmi": bmi, "category": "Obese", "advice": "Consult a professional for weight management"}

def calculate_water_intake(weight, activity_level):
    base = round(weight * 0.033, 2)
    multipliers = {'sedentary': 1.0, 'light': 1.1, 'moderate': 1.2, 'active': 1.3, 'very_active': 1.4}
    return round(base * multipliers.get(activity_level, 1.2), 2)

def analyze_sleep(age):
    if age <= 13: return "9-11 hours"
    elif age <= 17: return "8-10 hours"
    elif age <= 64: return "7-9 hours"
    else: return "7-8 hours"

def calculate_ideal_weight(height, gender):
    if gender.lower() == "male":
        return round(50 + 0.9 * (height - 152), 1)
    else:
        return round(45.5 + 0.9 * (height - 152), 1)

# ============================================
# ROUTES
# ============================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/cuisines', methods=['GET'])
def get_cuisines():
    cuisines = sorted(list(set(f['region'] for f in FOOD_DATABASE if f['region'] != 'Various')))
    return jsonify({'success': True, 'cuisines': cuisines})

@app.route('/api/get_foods', methods=['GET'])
def get_foods():
    cuisine = request.args.get('cuisine', 'All')
    preference = request.args.get('preference', 'all')
    category = request.args.get('category', 'all')
    search = request.args.get('search', '').lower()
    max_calories = request.args.get('max_calories')
    min_protein = request.args.get('min_protein')
    high_carbs = request.args.get('high_carbs')
    high_protein = request.args.get('high_protein')
    filtered = FOOD_DATABASE.copy()
    if search:
        filtered = [f for f in filtered if search in f['name'].lower()]
    if cuisine != 'All':
        filtered = [f for f in filtered if cuisine.lower() in f['region'].lower()]
    if preference != 'all':
        filtered = [f for f in filtered if f['type'] == preference]
    if category != 'all':
        filtered = [f for f in filtered if category in f['category']]
    if max_calories:
        filtered = [f for f in filtered if f['calories'] <= int(max_calories)]
    if min_protein:
        filtered = [f for f in filtered if f['protein'] >= int(min_protein)]
    if high_carbs:
        filtered = [f for f in filtered if f['carbs'] > 30]
    if high_protein:
        filtered = [f for f in filtered if f['protein'] > 20]
    random.shuffle(filtered)
    filtered = filtered[:50]
    return jsonify({'success': True, 'foods': filtered, 'count': len(filtered)})

@app.route('/api/calculate_nutrition', methods=['POST'])
def calculate_nutrition():
    try:
        data = request.json
        age = float(data.get('age', 30))
        weight = float(data.get('weight', 70))
        height = float(data.get('height', 170))
        gender = data.get('gender', 'male')
        activity = data.get('activity_level', 'moderate')
        goal = data.get('goal', 'maintenance')
        preference = data.get('preference', 'all')
        cuisine = data.get('cuisine', 'All')
        position = data.get('position', 'midfielder')
        bmr = calculate_bmr(weight, height, age, gender)
        tdee = calculate_tdee(bmr, activity)
        target_calories = calculate_target_calories(tdee, goal)
        macros = calculate_macros_with_model(target_calories, weight, height, age, gender, activity, goal, position)
        user_data = {'target_calories': target_calories, 'preference': preference, 'cuisine': cuisine, 'position': position}
        meal_plan = generate_position_based_meal_plan(user_data)
        totals = {
            'calories': sum(m['calories'] for m in meal_plan),
            'protein': sum(m['protein'] for m in meal_plan),
            'carbs': sum(m['carbs'] for m in meal_plan),
            'fat': sum(m['fat'] for m in meal_plan)
        }
        bmi_data = calculate_bmi(height, weight)
        ideal_weight = calculate_ideal_weight(height, gender)
        water_intake = calculate_water_intake(weight, activity)
        sleep_recommendation = analyze_sleep(age)
        return jsonify({
            'success': True,
            'bmr': round(bmr),
            'tdee': round(tdee),
            'target_calories': round(target_calories),
            'macros': macros,
            'meal_plan': meal_plan,
            'totals': totals,
            'position': position,
            'bmi': bmi_data,
            'ideal_weight': ideal_weight,
            'water_intake': water_intake,
            'sleep_recommendation': sleep_recommendation
        })
    except Exception as e:
        print(f"Error in calculate_nutrition: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/bmi', methods=['POST'])
def api_bmi():
    data = request.json
    return jsonify(calculate_bmi(float(data.get('height', 170)), float(data.get('weight', 70))))

@app.route('/api/ideal-weight', methods=['POST'])
def api_ideal_weight():
    data = request.json
    return jsonify({'ideal_weight': calculate_ideal_weight(float(data.get('height', 170)), data.get('gender', 'male'))})

# ============================================
# FOOD IMAGE PREDICTION HELPERS
# ============================================
def get_calories_for_food(predicted_class):
    """Look up calories using multiple matching strategies"""
    food_key = predicted_class.lower().strip()

    # Strategy 1: direct match
    if food_key in CALORIES_LOOKUP:
        print(f"📊 Direct match: '{food_key}' = {CALORIES_LOOKUP[food_key]} kcal")
        return CALORIES_LOOKUP[food_key]

    # Strategy 2: underscores → spaces
    key2 = food_key.replace('_', ' ')
    if key2 in CALORIES_LOOKUP:
        print(f"📊 Space match: '{key2}' = {CALORIES_LOOKUP[key2]} kcal")
        return CALORIES_LOOKUP[key2]

    # Strategy 3: spaces → underscores
    key3 = food_key.replace(' ', '_')
    if key3 in CALORIES_LOOKUP:
        print(f"📊 Underscore match: '{key3}' = {CALORIES_LOOKUP[key3]} kcal")
        return CALORIES_LOOKUP[key3]

    # Strategy 4: substring match
    food_clean = food_key.replace('_', ' ')
    for key in CALORIES_LOOKUP.keys():
        key_clean = key.replace('_', ' ')
        if key_clean in food_clean or food_clean in key_clean:
            print(f"📊 Substring match: '{key}' = {CALORIES_LOOKUP[key]} kcal")
            return CALORIES_LOOKUP[key]

    print(f"⚠️ No calorie match for '{food_key}', using default 200 kcal")
    return 200

def get_category(calories):
    if calories <= 100:
        return "Low Calorie"
    elif calories <= 250:
        return "Moderate Calorie"
    elif calories <= 400:
        return "High Calorie"
    else:
        return "Very High Calorie"

def predict_from_filename(filename):
    """Fallback: predict food based on filename keywords"""
    filename_lower = filename.lower()
    food_map = {
        'burger': ('Burger', 295),
        'butter_naan': ('Butter Naan', 300), 'naan': ('Butter Naan', 300),
        'chai': ('Chai', 50), 'tea': ('Chai', 50),
        'chapati': ('Chapati', 120), 'roti': ('Chapati', 120),
        'chole_bhature': ('Chole Bhature', 350), 'chole': ('Chole Bhature', 350), 'bhature': ('Chole Bhature', 350),
        'dal_makhani': ('Dal Makhani', 200), 'dal': ('Dal Makhani', 200), 'makhani': ('Dal Makhani', 200),
        'dhokla': ('Dhokla', 80),
        'fried_rice': ('Fried Rice', 250), 'fried': ('Fried Rice', 250), 'rice': ('Fried Rice', 250),
        'idli': ('Idli', 90),
        'jalebi': ('Jalebi', 150),
        'kaathi_rolls': ('Kaathi Rolls', 320), 'kaathi': ('Kaathi Rolls', 320), 'kathi': ('Kaathi Rolls', 320), 'roll': ('Kaathi Rolls', 320),
        'kadai_paneer': ('Kadai Paneer', 300), 'kadai': ('Kadai Paneer', 300), 'paneer': ('Kadai Paneer', 300),
        'kulfi': ('Kulfi', 180),
        'masala_dosa': ('Masala Dosa', 200), 'dosa': ('Masala Dosa', 200), 'masala': ('Masala Dosa', 200),
        'momos': ('Momos', 180), 'momo': ('Momos', 180),
        'paani_puri': ('Pani Puri', 50), 'pani_puri': ('Pani Puri', 50), 'paani': ('Pani Puri', 50), 'pani': ('Pani Puri', 50), 'puri': ('Pani Puri', 50),
        'pakode': ('Pakode', 120), 'pakoda': ('Pakode', 120), 'pakora': ('Pakode', 120),
        'pav_bhaji': ('Pav Bhaji', 250), 'pav': ('Pav Bhaji', 250), 'bhaji': ('Pav Bhaji', 250),
        'pizza': ('Pizza', 280),
        'samosa': ('Samosa', 150)
    }
    for keyword, (name, cal) in food_map.items():
        if keyword in filename_lower:
            return name, cal
    name_without_ext = os.path.splitext(filename)[0]
    food_name = name_without_ext.replace('_', ' ').replace('-', ' ').title()
    return food_name, 200

# ============================================
# FOOD IMAGE PREDICTION
# KEY: Model has Rescaling(1./255) as first layer.
# Pass raw 0-255 pixel values — do NOT divide by 255 manually.
# ============================================

# ── Validity thresholds ──────────────────────────────────────────────────────
# CONFIDENCE_THRESHOLD : top-class probability must be AT LEAST this.
#   Raise (e.g. 0.50) if non-food images still slip through.
#   Lower (e.g. 0.25) if valid food photos are wrongly rejected.
CONFIDENCE_THRESHOLD = 0.35

# ENTROPY_THRESHOLD : normalised entropy of the full softmax distribution.
#   A food image concentrates probability → low entropy.
#   A random / non-food image spreads probability → high entropy.
#   Values are in [0, 1].  Reject when entropy > this value.
#   Lower (e.g. 0.70) to be stricter; raise (e.g. 0.90) to be more lenient.
ENTROPY_THRESHOLD = 0.80

def pre_validate_image(img_array_raw):
    """
    Fast pixel-level sanity check BEFORE running the model.
    Catches screenshots, diagrams, text pages, solid-colour images, etc.

    img_array_raw : numpy array shape (256, 256, 3), dtype float32, range 0-255.
    Returns (is_valid: bool, reason: str)
    """
    pixels = img_array_raw.astype(np.float32)

    # 1. Reject near-white images (text documents, screenshots)
    mean_brightness = float(np.mean(pixels))
    if mean_brightness > 230:
        return False, f"image too bright/white (mean {mean_brightness:.0f}) — looks like a document or screenshot"
    if mean_brightness < 15:
        return False, f"image too dark (mean {mean_brightness:.0f})"

    # 2. Reject low-variance images (diagrams, solid fills, text pages)
    std_all = float(np.std(pixels))
    if std_all < 20:
        return False, f"image has very low variance ({std_all:.1f}) — likely a diagram or solid colour"

    # 3. Check colour diversity — food photos use a wide colour range
    std_r = float(np.std(pixels[:, :, 0]))
    std_g = float(np.std(pixels[:, :, 1]))
    std_b = float(np.std(pixels[:, :, 2]))
    avg_color_std = (std_r + std_g + std_b) / 3
    if avg_color_std < 18:
        return False, f"image lacks colour diversity (avg channel std {avg_color_std:.1f}) — likely a diagram or screenshot"

    # 4. Reject high white-pixel ratio (text documents, screenshots)
    white_mask = np.all(pixels > 220, axis=2)
    white_ratio = float(np.mean(white_mask))
    if white_ratio > 0.55:
        return False, f"too many white pixels ({white_ratio*100:.0f}%) — likely a document/screenshot"

    print(f"   ✅ Pre-validation passed — brightness={mean_brightness:.0f}, std={std_all:.1f}, colour_std={avg_color_std:.1f}, white={white_ratio*100:.0f}%")
    return True, "ok"


def is_valid_food_image(predictions):
    """
    Returns (is_valid: bool, reason: str, confidence: float, entropy: float).

    Two independent checks must BOTH pass:
      1. Top-class confidence  >= CONFIDENCE_THRESHOLD
      2. Normalised entropy    <= ENTROPY_THRESHOLD
    """
    top_confidence = float(np.max(predictions))

    # Normalised Shannon entropy: H / log(N)  →  range [0, 1]
    n = len(predictions)
    probs = np.clip(predictions, 1e-10, 1.0)          # avoid log(0)
    entropy = float(-np.sum(probs * np.log(probs)) / np.log(n))

    print(f"   🔎 Confidence: {top_confidence*100:.1f}%  |  Normalised entropy: {entropy:.3f}")

    if top_confidence < CONFIDENCE_THRESHOLD:
        return False, f"confidence too low ({round(top_confidence*100,1)}%)", top_confidence, entropy

    if entropy > ENTROPY_THRESHOLD:
        return False, f"prediction too uncertain (entropy {round(entropy,3)})", top_confidence, entropy

    return True, "ok", top_confidence, entropy

@app.route('/api/predict_image', methods=['POST'])
def predict_image():
    if 'food_image' not in request.files:
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400

    img_file = request.files['food_image']
    if img_file.filename == '':
        return jsonify({'success': False, 'error': 'No image selected'}), 400

    temp_path = None
    original_filename = img_file.filename

    try:
        print(f"\n🔍 Analyzing image: {original_filename}")

        # Save uploaded file temporarily
        unique_filename = str(uuid.uuid4()) + '_' + secure_filename(original_filename)
        temp_path = os.path.join(TEMP_DIR, unique_filename)
        img_file.save(temp_path)

        # ── If model or class names not loaded, use filename fallback ──
        if IMAGE_MODEL is None or not CLASS_NAMES:
            print("⚠️ Model/class names not loaded — using filename fallback")
            food_name, calories = predict_from_filename(original_filename)
            return jsonify({
                'success': True,
                'prediction': {
                    'food': food_name,
                    'calories': int(calories),
                    'category': get_category(calories)
                }
            })

        print(f"✅ Model ready — {len(CLASS_NAMES)} classes")

        # ── Preprocess: pass raw 0-255, model rescales internally ──
        img = Image.open(temp_path).convert("RGB")
        img = img.resize((256, 256))
        img_array = np.array(img, dtype=np.float32)       # range: 0–255, NOT divided
        img_array = np.expand_dims(img_array, axis=0)     # shape: (1, 256, 256, 3)

        print(f"   Shape: {img_array.shape}, Range: {img_array.min():.0f}\u2013{img_array.max():.0f}")

        # ── Pre-validate pixel statistics BEFORE running the model ──────────────
        pre_valid, pre_reason = pre_validate_image(img_array[0])
        if not pre_valid:
            print(f"\u26a0\ufe0f Pre-validation rejected image \u2014 {pre_reason}")
            return jsonify({
                'success': False,
                'invalid': True,
                'error': "This does not appear to be a food photo. Please upload a clear photo of a food dish.",
                'detail': pre_reason
            })

        # ── Predict ──
        predictions = IMAGE_MODEL.predict(img_array, verbose=0)[0]

        # Log top 5
        top5_idx = np.argsort(predictions)[-5:][::-1]
        print("📊 Top 5 predictions:")
        for i, idx in enumerate(top5_idx):
            if idx < len(CLASS_NAMES):
                print(f"   {i+1}. {CLASS_NAMES[idx]}: {predictions[idx]*100:.1f}%")

        top_idx = int(np.argmax(predictions))

        if top_idx >= len(CLASS_NAMES):
            raise ValueError(f"Prediction index {top_idx} out of range ({len(CLASS_NAMES)} classes)")

        # ── Dual validity check: confidence + entropy ──────────────────────────
        valid, reason, top_confidence, entropy = is_valid_food_image(predictions)
        if not valid:
            print(f"⚠️ Invalid image rejected — {reason}")
            return jsonify({
                'success': False,
                'invalid': True,
                'error': (
                    "This image does not appear to be a recognized food item. "
                    "Please upload a clear photo of a food dish."
                ),
                'detail': reason
            })

        predicted_class = CLASS_NAMES[top_idx]
        predicted_food = predicted_class.replace('_', ' ').title()
        print(f"✅ Predicted: {predicted_food} ({top_confidence*100:.1f}% confidence | entropy {entropy:.3f})")

        # ── Calorie lookup ──
        calories = get_calories_for_food(predicted_class)

        return jsonify({
            'success': True,
            'prediction': {
                'food': predicted_food,
                'calories': int(calories),
                'category': get_category(calories),
                'confidence': round(top_confidence * 100, 1),
                'entropy': round(entropy, 3)
            }
        })

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        traceback.print_exc()
        # Return actual error so we can diagnose — no silent fallback
        return jsonify({
            'success': False,
            'error': f"Prediction failed: {str(e)}",
            'detail': traceback.format_exc()
        })

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

@app.route('/api/check_model', methods=['GET'])
def check_model():
    status = {
        'success': True,
        'calorie_model': CALORIE_MODEL is not None,
        'diet_model': DIET_MODEL is not None,
        'macro_model': MACRO_MODEL is not None,
        'image_model': IMAGE_MODEL is not None,
        'class_names_count': len(CLASS_NAMES),
        'calories_count': len(CALORIES_LOOKUP),
        'foods_count': len(FOOD_DATABASE)
    }
    if IMAGE_MODEL:
        status['model_input_shape'] = str(IMAGE_MODEL.input_shape)
        status['model_output_shape'] = str(IMAGE_MODEL.output_shape)
    if CLASS_NAMES:
        status['first_10_classes'] = CLASS_NAMES[:10]
    return jsonify(status)

@app.route('/api/diagnose', methods=['GET'])
def diagnose():
    files_in_models = []
    if os.path.exists(MODELS_DIR):
        files_in_models = os.listdir(MODELS_DIR)
    class_names_path = os.path.join(BASE_DIR, 'class_names.txt')
    class_names_exists = os.path.exists(class_names_path)
    class_names_count = 0
    first_5_classes = []
    if class_names_exists:
        with open(class_names_path, 'r') as f:
            lines = [l.strip() for l in f if l.strip()]
            class_names_count = len(lines)
            first_5_classes = lines[:5]
    return jsonify({
        'base_dir': BASE_DIR,
        'models_dir': MODELS_DIR,
        'models_dir_exists': os.path.exists(MODELS_DIR),
        'files_in_models_folder': files_in_models,
        'class_names_txt_exists': class_names_exists,
        'class_names_count': class_names_count,
        'first_5_classes': first_5_classes,
        'image_model_loaded': IMAGE_MODEL is not None,
        'class_names_in_memory': len(CLASS_NAMES)
    })

@app.route('/api/food/<int:food_id>', methods=['GET'])
def get_food(food_id):
    food = next((f for f in FOOD_DATABASE if f['id'] == food_id), None)
    if food:
        return jsonify({'success': True, 'food': food})
    return jsonify({'success': False, 'error': 'Food not found'}), 404

# ============================================
# MAIN
# ============================================
if __name__ == '__main__':
    print("=" * 80)
    print("🍽️  FINAL HEALTH APP - Complete Wellness Platform")
    print("=" * 80)
    print(f"\n📊 System Status:")
    print(f"   • Calorie Model: {'✅' if CALORIE_MODEL else '❌'}")
    print(f"   • Diet Model: {'✅' if DIET_MODEL else '❌'}")
    print(f"   • Macro Model: {'✅' if MACRO_MODEL else '❌'}")
    print(f"   • Image Model: {'✅' if IMAGE_MODEL else '❌'}")
    print(f"   • Class Names: {len(CLASS_NAMES)}")
    print(f"   • Calorie Entries: {len(CALORIES_LOOKUP)}")
    print(f"   • Food Dataset: {len(FOOD_DATASET)} items")
    print("\n✅ Server ready at http://localhost:5000")
    print("=" * 80)
    app.run(debug=True, host='0.0.0.0', port=5000)