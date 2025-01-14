from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import librosa
from nemo.collections.asr.models import EncDecCTCModelBPE
from pathlib import Path
import tempfile

app = Flask(__name__)
CORS(app)

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

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    
    # Save the file temporarily
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, "temp_audio.wav")
    audio_file.save(temp_path)
    
    # Process the audio
    result = transcribe_audio_file(temp_path)
    
    # Clean up
    os.remove(temp_path)
    os.rmdir(temp_dir)
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)