document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('liveVideo');
    const muteBtn = document.getElementById('muteBtn');
    const likeBtn = document.getElementById('likeBtn');
    const shareBtn = document.getElementById('shareBtn');
    const giftBtn = document.getElementById('giftBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const closeBtn = document.getElementById('closeBtn');
    const commentInput = document.getElementById('commentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');
    const commentsList = document.getElementById('commentsList');
    const giftModal = document.getElementById('giftModal');
    const shareModal = document.getElementById('shareModal');
    const mobileCommentInput = document.getElementById('mobileCommentInput');
    const mobileSendCommentBtn = document.getElementById('mobileSendCommentBtn');
    let likeCount = 0;
    let broadcasterSocketId = null;

    const socket = io();
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    const remoteStream = new MediaStream();
    video.srcObject = remoteStream;

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && broadcasterSocketId) {
            socket.emit('candidate', {
                target: broadcasterSocketId,
                candidate: event.candidate
            });
        }
    };

    socket.on('connect', () => {
        console.log('Connected to server as viewer', socket.id);
        socket.emit('watcher');
    });

    socket.on('offer', async ({ sdp, broadcasterId }) => {
        broadcasterSocketId = broadcasterId;
        console.log('Received offer from broadcaster', broadcasterId);

        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', {
            broadcasterId,
            sdp: answer
        });
    });

    socket.on('candidate', async ({ candidate }) => {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    });

    socket.on('viewer-count', (count) => {
        const viewerCountLabel = document.querySelector('.viewer-count');
        if (viewerCountLabel) {
            viewerCountLabel.textContent = `${count} watching`;
        }
    });

    socket.on('broadcaster-left', () => {
        alert('The broadcaster has ended the stream.');
        remoteStream.getTracks().forEach(track => track.stop());
    });

    if (window.Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource('https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8');
        hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8';
    }

    likeBtn.addEventListener('click', function() {
        likeCount += 1;
        likeBtn.querySelector('.like-count').textContent = likeCount;
        likeBtn.style.animation = 'heartBeat 0.6s';
        socket.emit('public-like');
        setTimeout(() => {
            likeBtn.style.animation = '';
        }, 600);
    });

    fullscreenBtn.addEventListener('click', function() {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    });

    closeBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to leave this live stream?')) {
            window.location.href = 'index.html';
        }
    });

    function addComment() {
        const desktopText = commentInput.value.trim();
        const mobileText = mobileCommentInput.value.trim();
        const text = desktopText || mobileText;
        if (!text) {
            return;
        }

        socket.emit('public-comment', text);

        const comment = document.createElement('div');
        comment.className = 'comment';
        const timeText = 'now';

        comment.innerHTML = `
            <div class="comment-avatar"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='14' fill='%23999'/%3E%3C/svg%3E" alt="You"></div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-username">You</span>
                    <span class="comment-time">${timeText}</span>
                </div>
                <p class="comment-text"></p>
            </div>
            <button class="comment-like" title="Like comment" aria-label="Like comment"><i class="fas fa-heart"></i></button>
        `;

        comment.querySelector('.comment-text').textContent = text;
        commentsList.appendChild(comment);
        commentInput.value = '';
        mobileCommentInput.value = '';

        const commentsSection = document.querySelector('.comments-section');
        if (commentsSection) {
            commentsSection.scrollTop = commentsSection.scrollHeight;
        }

        const likeButton = comment.querySelector('.comment-like');
        likeButton.addEventListener('click', function() {
            this.style.color = this.style.color === 'rgb(255, 0, 80)' ? '#fff' : '#ff0050';
        });
    }

    sendCommentBtn.addEventListener('click', addComment);
    commentInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addComment();
        }
    });

    mobileSendCommentBtn.addEventListener('click', addComment);
    mobileCommentInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addComment();
        }
    });

    giftBtn.addEventListener('click', function() {
        giftModal.classList.add('show');
    });

    document.querySelectorAll('.gift-item').forEach(gift => {
        gift.addEventListener('click', function() {
            const giftEmoji = this.querySelector('.gift-emoji').textContent;
            showGiftAnimation(giftEmoji);
            giftModal.classList.remove('show');
        });
    });

    shareBtn.addEventListener('click', function() {
        shareModal.classList.add('show');
    });

    document.querySelectorAll('.share-option').forEach(option => {
        option.addEventListener('click', function() {
            const platform = this.textContent.trim();
            if (platform === 'Copy Link') {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Link copied to clipboard!');
                });
            } else {
                alert(`Share to ${platform}`);
            }
            shareModal.classList.remove('show');
        });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target === giftModal) {
            giftModal.classList.remove('show');
        }
        if (event.target === shareModal) {
            shareModal.classList.remove('show');
        }
    });

    function showGiftAnimation(emoji) {
        const animation = document.createElement('div');
        animation.style.cssText = `
            position: fixed;
            font-size: 48px;
            left: ${Math.random() * (window.innerWidth - 100)}px;
            top: ${window.innerHeight - 100}px;
            pointer-events: none;
            z-index: 999;
            animation: float-up 3s linear forwards;
            opacity: 1;
        `;
        animation.textContent = emoji;
        document.body.appendChild(animation);
        setTimeout(() => animation.remove(), 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes float-up {
            0% {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translateY(-300px) scale(0.5);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.comment-like').forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.color = this.style.color === 'rgb(255, 0, 80)' ? '#fff' : '#ff0050';
        });
    });

    video.addEventListener('error', function() {
        alert('Error loading video stream. Please check the stream URL.');
    });
});
