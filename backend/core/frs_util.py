import base64
import numpy as np
import cv2
import os
from django.core.files.base import ContentFile
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Load OpenCV HAAR cascades for face detection
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get_face_encoding_from_image(image_file):
    """
    Detects face and returns a base64 encoded string of the face region (cropped and grayscale)
    Optimized: Resizes large images before processing to speed up detection.
    """
    try:
        # Read image from file object
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if img is None:
            logger.error("Could not decode image")
            return None

        # Speed Optimization: Resize large images to a manageable size (max 600px)
        # This makes Haar Cascade detection 5-10x faster on high-res photos
        h, w = img.shape[:2]
        max_dim = 600
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        
        # Multi-pass detection for robustness (Fast on 600px)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
        if len(faces) == 0:
            faces = FACE_CASCADE.detectMultiScale(gray, 1.05, 3, minSize=(30, 30))
            
        if len(faces) == 0:
            logger.warning("No face detected in enrollment")
            return None
            
        # Take the largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_roi = gray[y:y+h, x:x+w]
        
        # Resize to fixed size for consistency
        face_roi = cv2.resize(face_roi, (200, 200))
        face_roi = cv2.GaussianBlur(face_roi, (3, 3), 0)
        
        # Encode as base64 string
        _, buffer = cv2.imencode('.jpg', face_roi)
        return base64.b64encode(buffer).decode('utf-8')
        
    except Exception as e:
        logger.error(f"Error in face encoding: {e}")
        return None

def compare_faces(stored_face_b64, current_image_file, threshold=0.1):
    """
    Compares current image with stored face using Template Matching.
    Optimized: Resizes capture to 600px max to speed up detection.
    """
    try:
        if not stored_face_b64:
            return False, 1.0, "No enrolled face found"
            
        # Decode stored face
        stored_bytes = base64.b64decode(stored_face_b64)
        stored_arr = np.frombuffer(stored_bytes, dtype=np.uint8)
        stored_face = cv2.imdecode(stored_arr, cv2.IMREAD_GRAYSCALE)
        
        # Process current image
        current_bytes = np.frombuffer(current_image_file.read(), np.uint8)
        current_img = cv2.imdecode(current_bytes, cv2.IMREAD_COLOR)
        
        if current_img is None:
            return False, 1.0, "Could not decode image"

        # Speed Optimization: Resize to max 600px
        h, w = current_img.shape[:2]
        max_dim = 600
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            current_img = cv2.resize(current_img, (int(w * scale), int(h * scale)))
            
        gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        
        # Multi-pass detection (Fast on 600px)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
        if len(faces) == 0:
            faces = FACE_CASCADE.detectMultiScale(gray, 1.05, 3, minSize=(30, 30))
        
        if len(faces) == 0:
            return False, 1.0, "No face detected. Please ensure good lighting."
            
        # Get the largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        current_face = gray[y:y+h, x:x+w]
        
        # Standardize sizes to 200x200
        current_face = cv2.resize(current_face, (200, 200))
        stored_face = cv2.resize(stored_face, (200, 200))
        
        # Pre-processing
        current_face = cv2.equalizeHist(current_face)
        current_face = cv2.GaussianBlur(current_face, (5, 5), 0)
        stored_face = cv2.equalizeHist(stored_face)
        stored_face = cv2.GaussianBlur(stored_face, (5, 5), 0)
        
        # Template Matching with inner core (160x160) for shift tolerance
        template = stored_face[20:180, 20:180] 
        result = cv2.matchTemplate(current_face, template, cv2.TM_CCOEFF_NORMED)
        _, match_val, _, _ = cv2.minMaxLoc(result)
        
        logger.info(f"FRS Match Value: {match_val:.4f}")
        
        # Match threshold set to 0.65
        is_match = match_val > 0.65
        
        return is_match, float(1.0 - match_val), None
        
    except Exception as e:
        logger.error(f"Error in face comparison: {e}")
        return False, 1.0, str(e)

def base64_to_file(base64_string, filename):
    """
    Converts a base64 string to a ContentFile.
    """
    try:
        if 'base64,' in base64_string:
            format, imgstr = base64_string.split('base64,')
        else:
            imgstr = base64_string
        
        data = ContentFile(base64.b64decode(imgstr), name=filename)
        return data
    except Exception as e:
        logger.error(f"Error converting base64 to file: {e}")
        return None
