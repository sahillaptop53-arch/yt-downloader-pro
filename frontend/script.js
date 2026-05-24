const videoUrlInput = document.getElementById('videoUrl');
const fetchBtn = document.getElementById('fetchBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const videoPreview = document.getElementById('videoPreview');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const channelName = document.getElementById('channelName');
const views = document.getElementById('views');
const likes = document.getElementById('likes');
const uploadDate = document.getElementById('uploadDate');
const duration = document.getElementById('duration');
const downloadBtns = document.querySelectorAll('.download-btn');

let currentVideoUrl = '';

if (window.location.protocol === 'file:') {
    showError('Server nahi chal raha. Terminal me "python server.py" run karo, phir http://localhost:5000 kholo');
    fetchBtn.disabled = true;
}

videoUrlInput.addEventListener('input', () => {
    clearBtn.style.display = videoUrlInput.value ? 'block' : 'none';
});

clearBtn.addEventListener('click', () => {
    videoUrlInput.value = '';
    clearBtn.style.display = 'none';
    videoPreview.classList.add('hidden');
    errorMessage.classList.add('hidden');
    videoUrlInput.focus();
});

function formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

fetchBtn.addEventListener('click', async () => {
    const url = videoUrlInput.value.trim();
    if (!url) { showError('Please enter a YouTube video URL.'); return; }
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        showError('Please enter a valid YouTube link.'); return;
    }

    currentVideoUrl = url;
    showLoading();
    hideError();

    try {
        const res = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Server error' }));
            throw new Error(err.error || 'Video not found.');
        }
        const info = await res.json();

        thumbnail.src = info.thumbnail;
        thumbnail.onerror = () => {
            thumbnail.src = `https://img.youtube.com/vi/${extractId(url)}/hqdefault.jpg`;
        };
        videoTitle.textContent = info.title;
        channelName.textContent = info.channel;
        views.textContent = formatNumber(info.views);
        likes.textContent = formatNumber(info.likes);
        duration.textContent = formatDuration(info.duration);
        uploadDate.textContent = info.upload_date || 'Unknown';

        hideLoading();
        videoPreview.classList.remove('hidden');
        videoPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        hideLoading();
        if (err.name === 'TimeoutError') {
            showError('Request timeout. YouTube slow ho sakta hai, dobara try karo.');
        } else {
            showError(err.message || 'Failed to fetch video info.');
        }
    }
});

videoUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchBtn.click();
});

downloadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentVideoUrl) return;
        const isMp3 = btn.classList.contains('mp3-btn');
        const fmt = isMp3 ? 'mp3' : 'mp4';
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i><div class="btn-text"><span class="quality">Starting...</span><span class="format">Opening download</span></div>';
        window.location.href = `/api/download?url=${encodeURIComponent(currentVideoUrl)}&format=${fmt}`;
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }, 5000);
    });
});

function extractId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
    videoPreview.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(msg) {
    errorText.textContent = msg;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}
