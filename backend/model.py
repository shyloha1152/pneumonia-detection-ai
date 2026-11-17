try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ModuleNotFoundError:
    HAS_TENSORFLOW = False
    tf = None

import numpy as np
from PIL import Image

class MockModel:
    def predict(self, img_array):
        return np.array([[0.85]])

def build_model():
    """Builds the MobileNetV2 based architecture."""
    if not HAS_TENSORFLOW:
        return MockModel()
        
    try:
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights='imagenet'
        )
    except Exception as e:
        print(f"\n[WARNING] Could not load ImageNet weights ({e}). Initializing MobileNetV2 without pre-trained weights.")
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights=None
        )
    
    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(128, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
    
    model = tf.keras.Model(inputs, outputs)
    return model

def load_or_create_model(weights_path=None):
    if not HAS_TENSORFLOW:
        print("\n[WARNING] TensorFlow not found. Running PneumoScan AI in Mock/Demo Mode.")
        return MockModel()
    model = build_model()
    if weights_path:
        try:
            model.load_weights(weights_path)
        except Exception as e:
            print(f"Warning: Could not load weights: {e}")
    return model

def preprocess_image(image: Image.Image):
    """Preprocess PIL image for MobileNetV2."""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image = image.resize((224, 224))
    
    if not HAS_TENSORFLOW:
        img_array = np.array(image, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        return (img_array / 127.5) - 1.0
        
    img_array = tf.keras.preprocessing.image.img_to_array(image)
    img_array = np.expand_dims(img_array, axis=0)
    return tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

def predict(model, img_array):
    prediction = model.predict(img_array)[0][0]
    if prediction > 0.5:
        label = "Pneumonia"
        confidence = float(prediction)
    else:
        label = "Normal"
        confidence = float(1.0 - prediction)
    return label, confidence
