from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import logging
from logging.handlers import RotatingFileHandler
import os

app = Flask(__name__)
CORS(app)

# ==========================================
# 1. CONFIGURE PRODUCTION LOGGING SYSTEM
# ==========================================
# Create a dedicated logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Set up a rolling file handler (keeps logs up to 1MB, backups up to 3 files)
log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] in %(module)s: %(message)s')
file_handler = RotatingFileHandler('logs/server.log', maxBytes=1024 * 1024, backupCount=3)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# Link handler to Flask's internal logger
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

app.logger.info("========================================")
app.logger.info("CarePulse ML Backend Initializing...")

# ==========================================
# 2. LOAD MACHINE LEARNING MODEL PIPELINE
# ==========================================
MODEL_PATH = '../insurance_model_pipeline.pkl'

try:
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model serialization file '{MODEL_PATH}' missing from root directory.")

    model_pipeline = joblib.load(MODEL_PATH)
    app.logger.info("Machine Learning Pipeline binary loaded successfully into memory.")
except Exception as e:
    app.logger.critical(f"CRITICAL BOOT FAILURE: Failed to load ML model pipeline. Error: {str(e)}")
    # We keep the app alive but log the critical block
    model_pipeline = None


# ==========================================
# 3. INPUT VALIDATION & SANITIZATION ENGINE
# ==========================================
def validate_and_sanitize_input(data):
    """
    Validates incoming request payload against the expected ML feature schema.
    Returns a clean dictionary or raises a ValueError with an explicit message.
    """
    if not data or not isinstance(data, dict):
        raise ValueError("Invalid request payload. Expected a valid JSON object.")

    # Define strict schema keys and expected types
    required_features = {
        'age': int,
        'sex': str,
        'bmi': (int, float),
        'children': int,
        'smoker': str,
        'region': str
    }

    sanitized_data = {}

    # Check for missing keys and enforce strict types
    for feature, expected_type in required_features.items():
        if feature not in data:
            raise ValueError(f"Missing required clinical feature: '{feature}'")

        value = data[feature]

        # Enforce numeric conversion if sent as string by mistake
        try:
            if expected_type == int:
                value = int(value)
            elif expected_type == (int, float):
                value = float(value)
            elif expected_type == str:
                value = str(value).strip().lower()
        except (ValueError, TypeError):
            raise ValueError(f"Incorrect data type for '{feature}'. Expected {expected_type}, got '{value}'.")

        sanitized_data[feature] = value

    # Value range checks (Preventing impossible physical values)
    if not (18 <= sanitized_data['age'] <= 120):
        raise ValueError(f"Age must be between 18 and 120. Received: {sanitized_data['age']}")

    if not (10.0 <= sanitized_data['bmi'] <= 65.0):
        raise ValueError(f"Body Mass Index (BMI) must be between 10.0 and 65.0. Received: {sanitized_data['bmi']}")

    if not (0 <= sanitized_data['children'] <= 10):
        raise ValueError(f"Number of dependents must be between 0 and 10. Received: {sanitized_data['children']}")

    # Categorical domain checks
    if sanitized_data['sex'] not in ['male', 'female']:
        raise ValueError(f"Invalid categorical domain for sex. Must be 'male' or 'female'.")

    if sanitized_data['smoker'] not in ['yes', 'no']:
        raise ValueError(f"Invalid categorical domain for smoker. Must be 'yes' or 'no'.")

    if sanitized_data['region'] not in ['northeast', 'northwest', 'nw', 'southeast', 'southwest']:
        raise ValueError(f"Invalid geographic region domain provided.")

    return sanitized_data


# ==========================================
# 4. SECURE INFERENCE ROUTE
# ==========================================
@app.route('/predict', methods=['POST'])
def predict():
    if model_pipeline is None:
        app.logger.error("Inference requested while ML pipeline is offline.")
        return jsonify({
            'success': False,
            'error': "Machine Learning Engine is currently offline due to a model loading failure."
        }), 503

    try:
        raw_data = request.get_json(silent=True)
        clean_data = validate_and_sanitize_input(raw_data)

        app.logger.info(f"Processing inference vector: Age={clean_data['age']}, Smoker={clean_data['smoker']}")

        if clean_data['region'] == 'nw':
            clean_data['region'] = 'northwest'

        # 1. Create DataFrame and replicate Feature Engineering exactly as trained
        input_df = pd.DataFrame([clean_data])
        input_df['is_smoker'] = input_df['smoker'].apply(lambda x: 1 if x == 'yes' else 0)
        input_df['bmi_smoker_interaction'] = input_df['bmi'] * input_df['is_smoker']
        input_df = input_df.drop(columns=['is_smoker'])

        # 2. Extract pipeline steps safely
        preprocessor = model_pipeline.named_steps['preprocessor']
        regressor = model_pipeline.named_steps['model']

        # 3. Transform features through your OneHotEncoder/StandardScaler matrix layers
        transformed_features = preprocessor.transform(input_df)
        feature_names = preprocessor.get_feature_names_out()

        # 4. Compute prediction directly using the full pipeline to prevent shape mismatches
        predicted_log = model_pipeline.predict(input_df)[0]
        final_premium_dollars = np.expm1(predicted_log)

        # 5. Compute mathematical SHAP approximation using Ridge coefficients
        intercept_log = regressor.intercept_
        coefficients = regressor.coef_

        log_contributions = transformed_features[0] * coefficients
        base_premium_dollars = np.expm1(intercept_log)
        total_delta = final_premium_dollars - base_premium_dollars

        explanations = {
            'Age Impact': 0.0,
            'BMI Impact': 0.0,
            'Smoking Impact': 0.0,
            'Family Size Impact': 0.0,
            'Demographic Region': 0.0
        }

        sum_abs_contributions = np.sum(np.abs(log_contributions))

        for name, log_val in zip(feature_names, log_contributions):
            approx_dollar = (log_val / sum_abs_contributions) * total_delta if sum_abs_contributions != 0 else 0

            if 'age' in name:
                explanations['Age Impact'] += approx_dollar
            elif 'bmi' in name or 'interaction' in name:
                explanations['BMI Impact'] += approx_dollar
            elif 'smoker' in name:
                explanations['Smoking Impact'] += approx_dollar
            elif 'children' in name:
                explanations['Family Size Impact'] += approx_dollar
            else:
                explanations['Demographic Region'] += approx_dollar

        formatted_explanations = [
            {"feature": key, "value": round(float(val), 2)}
            for key, val in explanations.items() if round(float(val), 2) != 0
        ]

        return jsonify({
            'success': True,
            'prediction': round(float(final_premium_dollars), 2),
            'base_premium': round(float(base_premium_dollars), 2),
            'explanations': formatted_explanations
        })

    except ValueError as val_err:
        app.logger.warning(f"Validation rejection: {str(val_err)}")
        return jsonify({'success': False, 'error': str(val_err)}), 400
    except Exception as sys_err:
        app.logger.error(f"Uncaught pipeline crash exception: {str(sys_err)}", exc_info=True)
        return jsonify({'success': False, 'error': "An error occurred during calculation."}), 500

# ==========================================
# 5. GLOBAL FALLBACK ERROR HANDLERS
# ==========================================
@app.errorhandler(404)
def route_not_found(e):
    return jsonify({'success': False, 'error': 'The requested endpoint does not exist.'}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'success': False, 'error': 'HTTP method not supported on this endpoint.'}), 405


if __name__ == '__main__':
    # Debug mode is active locally, but logging persists structurally
    app.run(debug=True, port=5000)