import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from rembg import remove
import io
from PIL import Image

app = FastAPI()

# Enable CORS so our frontend running on port 3003 can communicate with it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/remove-bg")
async def remove_background_endpoint(file: UploadFile = File(...)):
    try:
        # Read uploaded image bytes
        input_data = await file.read()
        
        # Run U2-Net model background removal
        output_data = remove(input_data)
        
        # Return transparent PNG directly
        return Response(content=output_data, media_type="image/png")
    except Exception as e:
        return Response(content=str(e), status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5001)
