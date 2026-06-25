import React, { useState } from 'react';
import { Activity, Heart, Cigarette, Users, MapPin, Calculator, RefreshCw } from 'lucide-react';

export default function App() {
  // 1. Establish state hooks for form inputs
  const [formData, setFormData] = useState({
    age: '',
    sex: 'male',
    bmi: '',
    children: '0',
    smoker: 'no',
    region: 'northeast'
  });

  // 2. Establish states for API tracking
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 3. Connect to the Flask Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    // Format numbers correctly before sending to Python
    const payload = {
      age: parseInt(formData.age),
      sex: formData.sex,
      bmi: parseFloat(formData.bmi),
      children: parseInt(formData.children),
      smoker: formData.smoker,
      region: formData.region
    };

    try {
      const response = await fetch('https://carepulse-backend-r1j0.onrender.com/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setPrediction(data.prediction);
        // Track explanations array in state
        setFormData(prev => ({ ...prev, explanations: data.explanations }));
      } else {
        setError(data.error || "Something went wrong with the calculations.");
      }
    } catch (err) {
      setError("Cannot connect to Flask server. Make sure your Python backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      {/* Navbar Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Heart className="text-emerald-500 w-7 h-7 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            CarePulse <span className="text-emerald-600 font-medium text-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">ML Engine v1.0</span>
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto p-4 md:p-8 grid md:grid-cols-5 gap-8 items-start flex-1">

        {/* Form Column */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-3 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" /> Patient Premium Assessment
            </h2>
            <p className="text-xs text-slate-500 mt-1">Provide demographic and clinical attributes to compute annual health insurance premiums via Ridge Regression.</p>
          </div>

          <hr className="border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" /> Age (Years)
              </label>
              <input
                type="number" name="age" required min="18" max="100" placeholder="e.g. 28"
                value={formData.age} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* BMI Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-slate-400" /> Body Mass Index (BMI)
              </label>
              <input
                type="number" name="bmi" required step="0.1" min="10" max="60" placeholder="e.g. 24.5"
                value={formData.bmi} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sex Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Biological Sex</label>
              <select
                name="sex" value={formData.sex} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Dependents/Children */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Number of Dependents
              </label>
              <select
                name="children" value={formData.children} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              >
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Smoker Radio Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Cigarette className="w-3.5 h-3.5 text-slate-400" /> Tobacco Consumption
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['no', 'yes'].map(option => (
                  <button
                    key={option} type="button"
                    onClick={() => setFormData(p => ({...p, smoker: option}))}
                    className={`py-2 text-sm font-medium rounded-xl border capitalize transition-all ${
                      formData.smoker === option 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs' 
                        : 'bg-slate-50/30 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option === 'yes' ? 'Smoker' : 'Non-Smoker'}
                  </button>
                ))}
              </div>
            </div>

            {/* Region Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> US Geographic Region
              </label>
              <select
                name="region" value={formData.region} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              >
                <option value="northeast">Northeast</option>
                <option value="nw">Northwest</option>
                <option value="southeast">Southeast</option>
                <option value="southwest">Southwest</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Computing Estimate...
              </>
            ) : (
              "Calculate Premium"
            )}
          </button>
        </form>

        {/* Output Panel Column */}
        <div className="md:col-span-2 space-y-4 h-full">
          {/* Display Result with SHAP Explanation Breakdown */}
          {prediction !== null && (
            <div className="space-y-4 animate-fade-in">
              {/* Core Pricing Card */}
              <div className="bg-emerald-950 border border-emerald-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-emerald-900/30 font-bold text-9xl pointer-events-none select-none">$</div>
                <div className="space-y-1">
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Calculated Premium</span>
                  <div className="text-4xl font-extrabold tracking-tight">
                    ${prediction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-emerald-300 ml-1">/ year</span>
                  </div>
                </div>
              </div>

              {/* Explainable AI (XAI) Factor Breakdown Card */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Clinical Risk Attribution</h4>
                  <p className="text-[11px] text-slate-500">Real-time SHAP analysis displaying feature influence relative to statistical baseline defaults.</p>
                </div>

                <div className="space-y-3">
                  {formData.explanations && formData.explanations.map((item, index) => {
                    const isPositive = item.value >= 0;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-600">{item.feature}</span>
                          <span className={isPositive ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
                            {isPositive ? `+ $${item.value.toLocaleString()}` : `- $${Math.abs(item.value).toLocaleString()}`}
                          </span>
                        </div>
                        {/* Horizontal fill bar mimicking a structural chart */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPositive ? 'bg-rose-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(Math.abs(item.value) / 150, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                  <strong>How to read this:</strong> Red bars indicate attributes raising risk premiums beyond default group benchmarks. Green bars mark protective features lowering required coverage margins.
                </div>
              </div>
            </div>
          )}

          {/* Display Loader placeholder */}
          {loading && (
            <div className="bg-white border border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-xs h-48 animate-pulse">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Querying backend pipeline layers...</p>
            </div>
          )}

          {/* Display Error Box */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs font-medium space-y-1">
              <p className="font-bold">Execution Error:</p>
              <p className="text-rose-600">{error}</p>
            </div>
          )}

          {/* Static Info card when clean */}
          {!loading && prediction === null && !error && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center h-full flex flex-col items-center justify-center space-y-3 py-12">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Awaiting Analysis Parameters</h3>
                <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-1">Fill out the patient metrics panel to execute real-time model inference.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        Health Insurance Premium Prediction System • Built with Scikit-Learn, Flask, and React
      </footer>
    </div>
  );
}