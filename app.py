from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import librosa
from nemo.collections.asr.models import EncDecCTCModelBPE
from pathlib import Path
import tempfile
import datetime

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load the model
parakeet_ctc_model_6B = EncDecCTCModelBPE.from_pretrained(model_name="nvidia/parakeet-ctc-0.6b")
WORKING_SAMPLE_RATE = 16000

def transcribe_audio_file(file_path):
    try:
        # Convert file_path to a Path object
        file_path = Path(file_path)

        # Load and resample the audio to 16kHz mono
        y, sr = librosa.load(str(file_path), sr=WORKING_SAMPLE_RATE, mono=True)

        # Check if the audio is empty
        if y.size == 0:
            return {"error": "Audio is empty"}

        # Transcribe the audio
        transcription = parakeet_ctc_model_6B.transcribe([str(file_path)])[0]
        return {"transcription": transcription}
    except Exception as e:
        return {"error": str(e)}

@app.route('/transcribe', methods=['POST', 'OPTIONS'])
def transcribe():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        return response

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    # Generate unique filename with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"recording_{timestamp}.mp3"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    # Save the file
    audio_file.save(file_path)
    
    # Process the audio
    result = transcribe_audio_file(file_path)
    
    # Add file path to response
    result['file_path'] = file_path
    result['filename'] = filename
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)