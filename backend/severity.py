import numpy as np

def estimate_severity(label, confidence, heatmap):
    if label == "Normal":
        return "None"
    
    hot_pixels_ratio = np.mean(heatmap > 0.4)
    severity_score = (confidence * 0.4) + (hot_pixels_ratio * 0.6)
    
    if severity_score > 0.6:
        return "Severe"
    elif severity_score > 0.35:
        return "Moderate"
    else:
        return "Mild"

def get_insights(label, severity):
    if label == "Normal":
        return [
            {"type": "success", "title": "Clear Lung Fields", "body": "No significant consolidations detected."},
            {"type": "success", "title": "Normal Cardiac Silhouette", "body": "Cardiothoracic ratio appears normal."}
        ]
    
    insights = {
        "Mild": [
            {"type": "warning", "title": "Faint Consolidations", "body": "Early-stage localized opacities detected."},
            {"type": "info", "title": "Minor Airspace Involvement", "body": "Lower lung zones show early signs."}
        ],
        "Moderate": [
            {"type": "warning", "title": "Multi-Lobar Opacity", "body": "Consolidations detected spanning multiple lung zones."},
            {"type": "warning", "title": "Vascular Congestion", "body": "Increased interstitial markings noted."}
        ],
        "Severe": [
            {"type": "critical", "title": "Extensive Consolidations", "body": "Near-complete radio-opacification of multiple lobes."},
            {"type": "critical", "title": "Critical Diffusion Compromise", "body": "Severe oxygen diffusion compromise is likely."}
        ]
    }
    return insights.get(severity, [])

def get_recommendations(label, severity):
    if label == "Normal":
        return ["Maintain regular check-ups.", "Stay hydrated.", "Practice good respiratory hygiene."]
    
    recs = {
        "Mild": ["Rest at home.", "Monitor SpO2 levels.", "Consult a GP if symptoms persist."],
        "Moderate": ["Urgent clinical appointment recommended.", "Prescription antibiotics may be needed.", "Avoid strenuous activity."],
        "Severe": ["Seek emergency medical attention IMMEDIATEY.", "Supplemental oxygen therapy may be required.", "Hospitalization likely."]
    }
    return recs.get(severity, [])
