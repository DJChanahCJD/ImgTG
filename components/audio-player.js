// 音频播放器组件
const AudioPlayer = {
  template: `
    <div class="audio-card">
      <span class="collect-icon" @click.stop="$emit('toggle-like')">
        <i :class="metadata.liked ? 'fa-solid fa-bookmark liked' : 'fa-regular fa-bookmark not-liked'"></i>
      </span>
      <el-checkbox v-model="selected" @change="$emit('select')"></el-checkbox>

      <div class="audio-player" :class="{ 'is-playing': isPlaying }">
        <div class="player-content">
          <div class="player-info">
            <i class="fas fa-music player-icon"></i>
            <span class="file-name" :title="fileName">{{ formatFileName }}</span>
          </div>
          <div class="player-controls">
            <button class="play-btn" @click.stop="togglePlay">
              <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
            </button>
            <div class="progress-bar" @click.stop="seek">
              <div class="progress" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="time">{{ currentTime }}/{{ duration }}</span>
          </div>
        </div>
      </div>

      <div class="audio-overlay">
        <div class="overlay-buttons">
          <el-button size="mini" type="primary" @click.stop="$emit('copy')">复制地址</el-button>
          <el-button size="mini" type="danger" @click.stop="$emit('delete')">删除</el-button>
        </div>
      </div>

      <div class="file-info">{{ fileName }}</div>
    </div>
  `,

  // 组件样式
  styles: `
    .audio-card {
      width: 100%;
      aspect-ratio: 4 / 3;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      position: relative;
      transition: transform 0.3s ease;
      border: none;
      display: flex;
      flex-direction: column;
    }

    .audio-card:hover {
      transform: scale(1.02);
      cursor: pointer;
    }

    .audio-card .collect-icon {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 10;
    }

    .audio-card .el-checkbox {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
    }

    .audio-player {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(145deg, rgba(179, 157, 219, 0.1), rgba(255, 255, 255, 0.1));
    }

    .player-content {
      width: 100%;
      max-width: 300px;
    }

    .player-info {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .player-icon {
      font-size: 1.5em;
      color: #B39DDB;
      margin-right: 10px;
    }

    .file-name {
      color: #666;
      font-size: 0.9em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .player-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .play-btn {
      background: #B39DDB;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      transition: all 0.3s ease;
    }

    .play-btn:hover {
      transform: scale(1.1);
      background: #9575CD;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: #E0E0E0;
      border-radius: 2px;
      cursor: pointer;
      position: relative;
    }

    .progress {
      position: absolute;
      height: 100%;
      background: #B39DDB;
      border-radius: 2px;
      transition: width 0.1s linear;
    }

    .time {
      font-size: 0.8em;
      color: #666;
      min-width: 70px;
      text-align: right;
    }

    .audio-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .audio-card:hover .audio-overlay {
      opacity: 1;
      pointer-events: auto;
    }

    .file-info {
      padding: 10px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .audio-card {
        aspect-ratio: unset;
        min-height: 180px;
      }

      .audio-player {
        padding: 15px;
      }
    }
  `,

  props: {
    src: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    metadata: {
      type: Object,
      default: () => ({})
    },
    selected: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      audio: null,
      isPlaying: false,
      progress: 0,
      currentTime: '0:00',
      duration: '0:00'
    }
  },

  computed: {
    formatFileName() {
      return this.fileName.length > 25
        ? this.fileName.substring(0, 22) + '...'
        : this.fileName;
    }
  },

  mounted() {
    // 注入组件样式
    if (!document.getElementById('audio-player-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'audio-player-styles';
      styleSheet.textContent = this.$options.styles;
      document.head.appendChild(styleSheet);
    }
    this.initAudio();
  },

  beforeDestroy() {
    this.destroyAudio();
  },

  methods: {
    initAudio() {
      this.audio = new Audio(this.src);
      this.audio.addEventListener('timeupdate', this.updateProgress);
      this.audio.addEventListener('loadedmetadata', this.setDuration);
      this.audio.addEventListener('ended', this.onEnded);
    },
    destroyAudio() {
      if (this.audio) {
        this.audio.removeEventListener('timeupdate', this.updateProgress);
        this.audio.removeEventListener('loadedmetadata', this.setDuration);
        this.audio.removeEventListener('ended', this.onEnded);
        this.audio.pause();
        this.audio = null;
      }
    },
    togglePlay() {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        this.audio.play();
      }
      this.isPlaying = !this.isPlaying;
    },
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    updateProgress() {
      const { currentTime, duration } = this.audio;
      this.progress = (currentTime / duration) * 100;
      this.currentTime = this.formatTime(currentTime);
    },
    setDuration() {
      this.duration = this.formatTime(this.audio.duration);
    },
    seek(event) {
      const { left, width } = event.currentTarget.getBoundingClientRect();
      const clickPosition = (event.clientX - left) / width;
      this.audio.currentTime = clickPosition * this.audio.duration;
    },
    onEnded() {
      this.isPlaying = false;
      this.progress = 0;
    }
  }
}; 