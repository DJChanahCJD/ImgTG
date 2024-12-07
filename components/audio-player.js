// 音频播放器组件
const AudioPlayer = {
  template: `
    <div class="audio-card" :class="{ 'is-playing': isPlaying }">
      <!-- 顶部控制区 -->
      <div class="card-header">
        <span class="collect-icon" @click.stop="$emit('toggle-like')">
          <i :class="metadata.liked ? 'fa-solid fa-bookmark liked' : 'fa-regular fa-bookmark not-liked'"></i>
        </span>
        <el-checkbox v-model="selected" @change="$emit('select')"></el-checkbox>
      </div>

      <!-- 主要内容区 -->
      <div class="card-content" @click.stop="togglePlay">
        <div class="music-icon">
          <i class="fas fa-music"></i>
        </div>
        <div class="music-info">
          <div class="title" :title="fileName">{{ formatFileName }}</div>
          <div class="time">{{ currentTime }} / {{ duration }}</div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar" @click.stop="seek">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- 底部控制区 -->
      <div class="card-footer">
        <button class="control-btn play-btn" @click.stop="togglePlay">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <div class="action-btns">
          <button class="control-btn" @click.stop="$emit('copy')">
            <i class="fas fa-link"></i>
          </button>
          <button class="control-btn" @click.stop="$emit('delete')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `,

  props: {
    src: String,
    fileName: String,
    metadata: {
      type: Object,
      default: () => ({})
    },
    selected: Boolean
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
      return this.fileName.length > 20
        ? this.fileName.substring(0, 17) + '...'
        : this.fileName;
    }
  },

  mounted() {
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
        this.audio.pause();
        this.audio.removeEventListener('timeupdate', this.updateProgress);
        this.audio.removeEventListener('loadedmetadata', this.setDuration);
        this.audio.removeEventListener('ended', this.onEnded);
        this.audio = null;
      }
    },

    togglePlay() {
      if (!this.audio) return;

      if (this.isPlaying) {
        this.audio.pause();
      } else {
        // 暂停其他正在播放的音频
        document.querySelectorAll('audio').forEach(audio => audio.pause());
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
      if (!this.audio) return;
      const { currentTime, duration } = this.audio;
      this.progress = (currentTime / duration) * 100;
      this.currentTime = this.formatTime(currentTime);
    },

    setDuration() {
      if (!this.audio) return;
      this.duration = this.formatTime(this.audio.duration);
    },

    seek(event) {
      if (!this.audio) return;
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

// 注册组件
Vue.component('audio-player', AudioPlayer); 