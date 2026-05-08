from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# Trigger hot reload for new weights
import shutil
import os
import requests
import uuid
from urllib.parse import urlparse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header, status
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import json

from database import engine, get_db, Base, User, History, Review
from auth import get_password_hash, verify_password, create_access_token, jwt, JWTError, SECRET_KEY, ALGORITHM

from ml_model import process_media

app = FastAPI(title="Deepfake Detection API", description="MCA Project API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

class AnalysisResult(BaseModel):
    status: str
    prediction: str
    confidence: float
    message: str
    metadata: Optional[Dict[str, Any]] = None
    timeline: Optional[List[Dict[str, Any]]] = None
    overlay_image: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    password: str

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class Token(BaseModel):

    access_token: str
    token_type: str

class HistoryResponse(BaseModel):
    id: int
    target: str
    prediction: str
    confidence: float
    timestamp: Any
    metadata_json: Optional[str] = None

    class Config:
        orm_mode = True

class UserProfileResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str

    class Config:
        orm_mode = True

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    user = db.query(User).filter(User.email == email).first()
    return user

@app.post("/api/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_username = db.query(User).filter(User.username == user.username).first()
    if db_username:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        full_name=user.full_name,
        email=user.email, 
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/reviews")
def submit_review(review: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Must be logged in to review")
    
    new_review = Review(
        user_id=current_user.id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(new_review)
    db.commit()
    return {"status": "success", "message": "Review submitted successfully"}

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Note: Using form_data.username for email per OAuth2 spec
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/history", response_model=List[HistoryResponse])
def get_user_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    histories = db.query(History).filter(History.user_id == current_user.id).order_by(History.timestamp.desc()).all()
    return histories

@app.delete("/api/history/{history_id}")
def delete_history_item(history_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    history_item = db.query(History).filter(History.id == history_id, History.user_id == current_user.id).first()
    if not history_item:
        raise HTTPException(status_code=404, detail="History item not found")
        
    db.delete(history_item)
    db.commit()
    return {"status": "success", "message": "History item deleted successfully"}

@app.get("/api/user/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@app.put("/api/user/password")
def update_user_password(
    password_data: PasswordUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}

def is_valid_url(url):
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False

# Allow accepting EITHER a file upload OR a form data string 'url'
@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_media_endpoint(
    file: Optional[UploadFile] = File(None), 
    url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Must provide either a file upload or a media URL.")
    
    os.makedirs("temp_uploads", exist_ok=True)
    
    # Generate a unique temp filename
    temp_filename = f"media_{uuid.uuid4().hex}"
    temp_file_path = ""
    
    try:
        if file:
            # Handle File Upload
            original_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'tmp'
            temp_file_path = os.path.join("temp_uploads", f"{temp_filename}.{original_ext}")
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
        elif url:
            # Handle URL download
            if not is_valid_url(url):
                raise HTTPException(status_code=400, detail="Invalid URL provided.")
                
            import yt_dlp
            import glob
            
            ydl_opts = {
                'outtmpl': os.path.join("temp_uploads", f"{temp_filename}.%(ext)s"),
                'format': 'best', # Gets Best quality available
                'noplaylist': True,
                'quiet': True,
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.extract_info(url, download=True)
                
                # Find the downloaded file
                downloaded_files = glob.glob(os.path.join("temp_uploads", f"{temp_filename}.*"))
                if downloaded_files:
                    temp_file_path = downloaded_files[0]
                else:
                    raise Exception("yt-dlp completed but file not found.")
                    
            except Exception as e_yt:
                print(f"yt-dlp failed, falling back to direct download: {e_yt}")
                # Fallback to direct requests if yt-dlp fails (e.g. standard file URLs)
                response = requests.get(url, stream=True, timeout=15)
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to fetch media from the provided URL.")
                    
                # Attempt to guess extension from URL or headers
                content_type = response.headers.get('content-type', '')
                ext = 'tmp'
                if 'image/jpeg' in content_type: ext = 'jpg'
                elif 'image/png' in content_type: ext = 'png'
                elif 'video/mp4' in content_type: ext = 'mp4'
                else:
                    # guess from url string if available
                    parts = url.split("?")[0].split(".")
                    if len(parts) > 1:
                        ext = parts[-1].lower()
                
                temp_file_path = os.path.join("temp_uploads", f"{temp_filename}.{ext}")
                with open(temp_file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192): 
                        if chunk: f.write(chunk)
                    
        # Run deepfake pipeline
        result = process_media(temp_file_path)
        
        if result.get("prediction") == "Error" or "Error" in result.get("prediction", ""):
             raise HTTPException(status_code=422, detail="Unable to extract frames or faces from the provided media.")
            
        # Log to History if user is authenticated
        if current_user:
            target_name = file.filename if file else url
            
            # Save a persistent copy of the media
            os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
            saved_filename = f"{uuid.uuid4().hex}_{os.path.basename(temp_file_path)}"
            saved_media_path = os.path.join("static", "uploads", saved_filename)
            shutil.copy(temp_file_path, saved_media_path)
            
            media_url = f"/static/uploads/{saved_filename}"
            hist_metadata = result.get("metadata") or {}
            hist_metadata["media_url"] = media_url
            
            new_history = History(
                user_id=current_user.id,
                target=target_name,
                prediction=result["prediction"],
                confidence=result["confidence"],
                metadata_json=json.dumps(hist_metadata)
            )
            db.add(new_history)
            db.commit()

        return AnalysisResult(
            status="success",
            prediction=result["prediction"],
            confidence=result["confidence"],
            message="Media processed successfully.",
            metadata=result.get("metadata"),
            timeline=result.get("timeline"),
            overlay_image=result.get("overlay_image")
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/api/health")
def health_check():
    return {"status": "Backend services are up and running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
