def get_chatbot_response(message, context=None):
    message = message.lower()
    
    # Context-aware logic
    if context and any(k in message for k in ["how bad", "my result", "how is it", "tell me more", "diagnosis", "report", "what does this mean"]):
        pred = context.get("prediction", "Unknown")
        sev = context.get("severity", "None")
        conf = context.get("confidence", 0) * 100
        
        if pred == "Pneumonia":
            return f"Based on the analysis, I've detected **Pneumonia** with a confidence of **{conf:.1f}%**. The estimated severity is **{sev}**. This means there are significant lung consolidations. You should consult a medical professional immediately."
        else:
            return f"The current analysis shows **Normal** lung fields with a confidence of **{conf:.1f}%**. This is a reassuring result, but always monitor your symptoms and consult a doctor if you feel unwell."

    # General Knowledge
    if "what is pneumonia" in message:
        return "Pneumonia is an infection that inflames the air sacs in one or both lungs. The air sacs may fill with fluid or pus, causing cough with phlegm or pus, fever, chills, and difficulty breathing."
    
    if "symptoms" in message:
        return "Common symptoms of pneumonia include: chest pain when you breathe or cough, cough (which may produce phlegm), fatigue, fever, sweating and shaking chills, and shortness of breath."
    
    if "prevention" in message or "prevent" in message:
        return "To help prevent pneumonia: Get vaccinated, wash your hands regularly, don't smoke, and keep your immune system strong through healthy lifestyle choices."
    
    if "hello" in message or "hi" in message:
        return "Hello! I am your PneumoScan AI Assistant. How can I help you today? You can ask me about pneumonia symptoms, prevention, or what the current scan result means."
        
    return "I'm sorry, I'm still learning. You can ask me about pneumonia definitions, symptoms, or what your current 'PneumoScan' results mean!"
