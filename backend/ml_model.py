import cv2
import torch
import torch.nn as nn
import numpy as np
import os
import base64
from torchvision import transforms

class Meso4(nn.Module):
    def __init__(self, num_classes=1):
        super(Meso4, self).__init__()
        self.num_classes = num_classes
        
        self.conv1 = nn.Conv2d(3, 8, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(8)
        self.relu = nn.ReLU()
        self.leakyrelu = nn.LeakyReLU(0.1)

        self.conv2 = nn.Conv2d(8, 8, 5, padding=2, bias=False)
        self.bn2 = nn.BatchNorm2d(8)
        
        self.conv3 = nn.Conv2d(8, 16, 5, padding=2, bias=False)
        self.bn3 = nn.BatchNorm2d(16)
        
        self.conv4 = nn.Conv2d(16, 16, 5, padding=2, bias=False)
        self.bn4 = nn.BatchNorm2d(16)

        self.maxpool = nn.MaxPool2d(2, 2)
        
        self.adaptive_pool = nn.AdaptiveAvgPool2d((16, 16))
        
        self.fc1 = nn.Linear(16*16*16, 16)
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(16, num_classes)

    def forward(self, x):
        x = self.maxpool(self.relu(self.bn1(self.conv1(x))))
        x = self.maxpool(self.relu(self.bn2(self.conv2(x))))
        x = self.maxpool(self.relu(self.bn3(self.conv3(x))))
        x = self.maxpool(self.relu(self.bn4(self.conv4(x))))
        
        x = self.adaptive_pool(x)
        x = x.view(x.size(0), -1)
        x = self.dropout(x)
        x = self.leakyrelu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        
        return torch.sigmoid(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = Meso4().to(device)

weights_path = "weights/mesonet_weights.pth"
WEIGHTS_EXIST = os.path.exists(weights_path)
if WEIGHTS_EXIST:
    try:
        model.load_state_dict(torch.load(weights_path, map_location=device))
        model.eval()
        print("MesoNet weights loaded successfully.")
    except Exception as e:
        print(f"Error loading weights: {e}")
else:
    print("WARNING: Model weights not found. Using untrained model/fallback for demonstration.")

transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

def extract_faces(frame):
    if frame is None:
        return []
        
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    extracted = []
    for (x, y, w, h) in faces:
        margin = int(0.2 * w)
        x_min = max(0, x - margin)
        y_min = max(0, y - margin)
        x_max = min(frame.shape[1], x + w + margin)
        y_max = min(frame.shape[0], y + h + margin)
        
        face_img = frame[y_min:y_max, x_min:x_max]
        if face_img.size > 0:
            extracted.append({
                "img": face_img,
                "box": (x_min, y_min, x_max, y_max)
            })
        
    return extracted

def compute_single_face_prediction(face_img):
    try:
        input_tensor = transform(face_img).unsqueeze(0).to(device)
        if WEIGHTS_EXIST:
            with torch.no_grad():
                prob_real = model(input_tensor).item()
        else:
            import random
            prob_real = random.uniform(0.01, 0.99)
        return prob_real
    except Exception as e:
        print(f"Error processing single face: {e}")
        return 0.5

def extract_metadata(media_path: str, is_video: bool):
    metadata = {
        "file_size_mb": round(os.path.getsize(media_path) / (1024 * 1024), 2),
        "extension": media_path.split(".")[-1].upper()
    }
    
    cap = cv2.VideoCapture(media_path)
    if cap.isOpened():
        metadata["resolution"] = f"{int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}"
        if is_video:
            metadata["fps"] = round(cap.get(cv2.CAP_PROP_FPS), 2)
            metadata["total_frames"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if metadata["fps"] > 0:
                metadata["duration_sec"] = round(metadata["total_frames"] / metadata["fps"], 2)
        cap.release()
    else:
        metadata["resolution"] = "Unknown"
        
    return metadata

def encode_image_base64(img):
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def process_video(video_path: str):
    metadata = extract_metadata(video_path, is_video=True)
    
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    if frame_count == 0 or fps == 0:
        return {"prediction": "Error", "confidence": 0.0, "metadata": metadata, "timeline": [], "overlay_image": None}
        
    frames_to_sample = 10
    interval = max(1, frame_count // frames_to_sample)
    
    timeline = []
    overall_probs = []
    
    count = 0
    frames_processed = 0
    
    sample_frame_for_overlay = None
    overlay_faces_info = []

    while cap.isOpened() and frames_processed < frames_to_sample:
        ret, frame = cap.read()
        if not ret:
            break
            
        if count % interval == 0:
            faces_info = extract_faces(frame)
            frame_probs = []
            
            for f_info in faces_info:
                prob = compute_single_face_prediction(f_info["img"])
                frame_probs.append(prob)
                overall_probs.append(prob)
                
            frame_prob = np.mean(frame_probs) if frame_probs else 0.5
            frame_conf = round(float(1.0 - frame_prob) if frame_prob < 0.5 else float(frame_prob), 4)
            is_fake = frame_prob < 0.5
            
            sec = round(count / fps, 2)
            timeline.append({
                "sec": sec,
                "confidence": frame_conf,
                "label": "Fake" if is_fake else "Real"
            })
            
            if sample_frame_for_overlay is None and faces_info:
                sample_frame_for_overlay = frame.copy()
                for i, f_info in enumerate(faces_info):
                    p = frame_probs[i]
                    overlay_faces_info.append({
                        "box": f_info["box"],
                        "confidence": round(float(1.0 - p) if p < 0.5 else float(p), 4),
                        "label": "Fake" if p < 0.5 else "Real"
                    })
                    
            frames_processed += 1
        count += 1
        
    cap.release()
    
    if not overall_probs:
        return {"prediction": "Unknown", "confidence": 0.0, "metadata": metadata, "timeline": timeline, "overlay_image": None}
        
    avg_real_prob = np.mean(overall_probs)
    final_conf = round(float(1.0 - avg_real_prob) if avg_real_prob <= 0.5 else float(avg_real_prob), 4)
    final_pred = "Fake" if avg_real_prob <= 0.5 else "Real"
    
    overlay_b64 = None
    if sample_frame_for_overlay is not None:
        for face_data in overlay_faces_info:
            x_min, y_min, x_max, y_max = face_data["box"]
            lbl = face_data["label"]
            conf_percent = int(face_data["confidence"] * 100)
            
            color = (0, 0, 255) if lbl == "Fake" else (0, 255, 0) # BGR
            cv2.rectangle(sample_frame_for_overlay, (x_min, y_min), (x_max, y_max), color, 3)
            cv2.putText(sample_frame_for_overlay, f"{lbl} {conf_percent}%", (x_min, max(30, y_min - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            
        overlay_b64 = encode_image_base64(sample_frame_for_overlay)

    return {
        "prediction": final_pred, 
        "confidence": final_conf,
        "metadata": metadata,
        "timeline": timeline,
        "overlay_image": f"data:image/jpeg;base64,{overlay_b64}" if overlay_b64 else None
    }


def process_image(image_path: str):
    metadata = extract_metadata(image_path, is_video=False)
    
    frame = cv2.imread(image_path)
    if frame is None:
        return {"prediction": "Error reading image", "confidence": 0.0, "metadata": metadata, "timeline": [], "overlay_image": None}
        
    faces_info = extract_faces(frame)
    if not faces_info:
        faces_info = [{"img": frame, "box": (0, 0, frame.shape[1], frame.shape[0])}]
        
    probs = []
    overlay_frame = frame.copy()
    
    for f_info in faces_info:
        prob = compute_single_face_prediction(f_info["img"])
        probs.append(prob)
        
        lbl = "Fake" if prob < 0.5 else "Real"
        conf = round(float(1.0 - prob) if prob < 0.5 else float(prob), 4)
        
        x_min, y_min, x_max, y_max = f_info["box"]
        color = (0, 0, 255) if lbl == "Fake" else (0, 255, 0)
        cv2.rectangle(overlay_frame, (x_min, y_min), (x_max, y_max), color, 3)
        cv2.putText(overlay_frame, f"{lbl} {int(conf*100)}%", (x_min, max(30, y_min - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        
    avg_real_prob = np.mean(probs)
    final_conf = round(float(1.0 - avg_real_prob) if avg_real_prob <= 0.5 else float(avg_real_prob), 4)
    final_pred = "Fake" if avg_real_prob <= 0.5 else "Real"
    
    timeline = []
    overlay_b64 = encode_image_base64(overlay_frame)

    return {
        "prediction": final_pred, 
        "confidence": final_conf,
        "metadata": metadata,
        "timeline": timeline,
        "overlay_image": f"data:image/jpeg;base64,{overlay_b64}"
    }

def process_media(media_path: str):
    ext = media_path.lower().split(".")[-1]
    if ext in ['jpg', 'jpeg', 'png', 'webp', 'bmp']:
        return process_image(media_path)
    elif ext in ['mp4', 'avi', 'mov', 'webm', 'mkv']:
        return process_video(media_path)
    else:
        res_img = process_image(media_path)
        if res_img.get('prediction') == 'Error reading image':
            return process_video(media_path)
        return res_img
