import os
import io
import uuid
import base64
from flask import Flask, render_template, request, send_file, redirect, flash, jsonify, url_for, session
from werkzeug.exceptions import RequestEntityTooLarge
from rembg import remove
from PIL import Image

# Increase model download timeout to 120 seconds (2 minutes)
os.environ["U2NET_DOWNLOAD_TIMEOUT"] = "120"

app = Flask(__name__)
app.secret_key = "replace-with-a-strong-random-secret"
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.config['UPLOAD_FOLDER'] = 'processed_images'

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return "File too large (max 20MB).", 413

@app.route('/')
def home():
    return render_template('index.html')  # New landing page

@app.route('/upload')
def index():
    return render_template('upload.html')  # Background remover page

@app.route('/process', methods=['POST'])
def process():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    try:
        img = Image.open(file.stream).convert("RGBA")
    except Exception:
        return jsonify({"error": "Invalid image file"}), 400

    try:
        # Convert Pillow image to bytes
        img_bytes_io = io.BytesIO()
        img.save(img_bytes_io, format='PNG')
        img_bytes = img_bytes_io.getvalue()

        # Remove background
        out_bytes = remove(img_bytes)
        out_img = Image.open(io.BytesIO(out_bytes))

        # Generate unique ID for this upload
        img_id = str(uuid.uuid4())

        # Save processed high-res PNG
        high_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{img_id}_high.png")
        out_img.save(high_path, 'PNG')

        # Save low-res PNG (thumbnail)
        low_img = out_img.copy()
        low_img.thumbnail((400, 400))
        low_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{img_id}_low.png")
        low_img.save(low_path, 'PNG')

        # Save original image for side-by-side preview
        orig_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{img_id}_orig.png")
        img.save(orig_path, 'PNG')

        # Encode images to base64 for preview on frontend
        def img_to_base64(path):
            with open(path, "rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')

        original_b64 = img_to_base64(orig_path)
        high_b64 = img_to_base64(high_path)
        low_b64 = img_to_base64(low_path)

        # Save img_id in session so user can download files later
        session['last_img_id'] = img_id

        return jsonify({
            "original": f"data:image/png;base64,{original_b64}",
            "processed_high": f"data:image/png;base64,{high_b64}",
            "processed_low": f"data:image/png;base64,{low_b64}",
            "download_urls": {
                "high_png": url_for('download', img_id=img_id, quality='high', fmt='png'),
                "low_png": url_for('download', img_id=img_id, quality='low', fmt='png'),
                "high_jpg": url_for('download', img_id=img_id, quality='high', fmt='jpg'),
                "low_jpg": url_for('download', img_id=img_id, quality='low', fmt='jpg'),
            }
        })

    except Exception as e:
        return jsonify({"error": f"Error removing background: {str(e)}"}), 500

@app.route('/download/<img_id>/<quality>/<fmt>')
def download(img_id, quality, fmt):
    if quality not in ('high', 'low'):
        flash('Invalid quality selected.')
        return redirect(url_for('index'))

    if fmt.lower() not in ('png', 'jpg', 'jpeg'):
        flash('Invalid format selected.')
        return redirect(url_for('index'))

    base_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{img_id}_{quality}.png")
    if not os.path.exists(base_path):
        flash('Image not found or expired.')
        return redirect(url_for('index'))

    if fmt.lower() == 'png':
        return send_file(base_path, mimetype='image/png', as_attachment=True,
                         download_name=f'background_removed_{quality}.png')

    # Convert to JPG on the fly
    img = Image.open(base_path).convert("RGB")
    img_io = io.BytesIO()
    img.save(img_io, format='JPEG', quality=95)
    img_io.seek(0)
    return send_file(img_io, mimetype='image/jpeg', as_attachment=True,
                     download_name=f'background_removed_{quality}.jpg')


if __name__ == '__main__':
    app.run(debug=True)
