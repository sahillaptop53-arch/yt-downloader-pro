from flask import Flask, request, jsonify, redirect, send_from_directory
from flask_cors import CORS
import yt_dlp
import re
import os

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get('PORT', 5000))
FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

@app.route('/')
def index():
    return send_from_directory(FRONTEND, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(FRONTEND, path)

@app.route('/api/video-info', methods=['GET'])
def video_info():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    video_id = extract_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    ydl_opts = {'quiet': True, 'no_warnings': True, 'noplaylist': True, 'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}}}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        return jsonify({
            'title': info.get('title', 'Unknown'),
            'thumbnail': info.get('thumbnail', f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'),
            'channel': info.get('channel', info.get('uploader', 'Unknown')),
            'views': info.get('view_count', 0),
            'likes': info.get('like_count', 0),
            'duration': info.get('duration', 0),
            'upload_date': info.get('upload_date', ''),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['GET'])
def download():
    url = request.args.get('url')
    fmt = request.args.get('format', 'mp4')
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    format_spec = 'bestaudio/best' if fmt == 'mp3' else 'best[ext=mp4]/best'
    ydl_opts = {'quiet': True, 'no_warnings': True, 'format': format_spec, 'noplaylist': True, 'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}}}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            direct_url = info.get('url')
            if not direct_url:
                for f in info.get('formats', []):
                    if f.get('url') and f.get('ext') == 'mp4':
                        direct_url = f['url']
                        break
            if direct_url:
                return redirect(direct_url)
            return jsonify({'error': 'No download URL found'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_id(url):
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None

if __name__ == '__main__':
    print(f"Server: http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
