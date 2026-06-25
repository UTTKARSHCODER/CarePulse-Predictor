# CarePulse ML: Explainable AI Health Insurance Premium Predictor

CarePulse ML is a production-grade, full-stack machine learning web application that predicts annual health insurance premiums based on individual clinical and demographic attributes. Built using a modern decoupled architecture, the system leverages a hyper-tuned **Ridge Regression** engine ($Alpha = 205$) on the backend and features an interactive **Explainable AI (XAI)** dashboard powered by **SHAP (SHapley Additive exPlanations)** mathematical principles on the frontend.

---

## 🚀 Key System Features

### 🧠 Machine Learning & Algorithmic Core
* **Hyper-Tuned Regularization:** Optimized via granular cross-validation to select $Alpha = 205$, achieving a **Normal $R^2$ score of 0.7949** and minimizing Mean Absolute Error (MAE) to **$3,366.53**.
* **Feature Engineering Pipeline:** Features a custom interaction layer modeling the joint non-linear risk multiplier between Body Mass Index (BMI) and Smoking Status (`bmi * is_smoker`).
* **Target Domain Calibration:** Employs log-transformation on skewed target charges during training, with an automated geometric inverse exponential transformation wrapper (`np.expm1`) during inference.

### 🛡️ Software Engineering & Architecture
* **Decoupled Architecture:** Features a high-performance REST API backend built with Flask and a lightning-fast, modern UI built with React 19 and Tailwind CSS v4.
* **Clinical Safety Shield:** Implements a robust validation and sanitization engine that intercepts incoming JSON payloads, blocking out-of-range anomalies (e.g., age breaches, impossible BMIs) before they reach the model layer.
* **Production Utility Logging:** Configured with an asynchronous, rolling file handler system (`RotatingFileHandler`) that records operational metrics and telemetry to localized, protected server logs.

---

## 🏗️ Repository Architecture

The project is organized as a clean full-stack monorepo:

```text
CarePulse-Predictor/
├── health-insurance-backend/     # Python Flask Microservice API
│   ├── logs/                     # Localized production server logs (Git ignored)
│   │   └── server.log
│   ├── app.py                    # Production server script, validation, & SHAP logic
│   ├── insurance_model_pipeline.pkl # Serialized Scikit-Learn pipeline binary
│   └── requirements.txt          # Python environment dependencies
│
└── health-insurance-ui/          # React 19 Frontend Web Application
    ├── src/
    │   ├── App.jsx               # Single-page health analytics dashboard component
    │   ├── main.jsx              # Application entry point & React StrictMode mounting
    │   └── index.css             # Tailwind v4 standard style declarations
    ├── package.json              # NPM script and component dependencies
    └── vite.config.js            # Frontend compilation build parameters
