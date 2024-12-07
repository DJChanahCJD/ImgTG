<template>
  <el-card class="audio-card" :class="{ 'selected': selected }" @click="$emit('select')">
    <!-- 音频内容区域 -->
    <div class="audio-content">
      <!-- 头部信息 -->
      <div class="audio-header">
        <div class="audio-avatar">
          <img src="/static/music.png" alt="Music">
        </div>
        <div class="audio-info">
          <div class="audio-title" :title="audioName">{{ audioName }}</div>
          <div class="audio-subtitle">Audio File</div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="audio-progress">
        <div class="progress-bar"
             @click="handleSeek"
             @mousedown="startDragging"
             @mousemove="onDragging"
             @mouseup="stopDragging"
             @mouseleave="stopDragging">
          <div class="progress-track"></div>
          <div class="progress-current" :style="{ width: progress + '%' }"></div>
          <div class="progress-handle" :style="{ left: progress + '%' }"></div>
        </div>
        <div class="time-display">
          <span>{{ currentTimeFormatted }}</span>
          <span>{{ durationFormatted }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="audio-controls">
        <button class="control-btn" @click.stop="$emit('copy')">
          <i class="fas fa-link"></i>
        </button>

        <button class="play-btn" @click.stop="togglePlay">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>

        <button class="control-btn like-btn" @click.stop="$emit('toggle-like')">
          <i :class="liked ? 'fas fa-heart liked' : 'far fa-heart'"></i>
        </button>

        <button class="control-btn" @click.stop="$emit('delete')">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>

    <audio
      ref="audio"
      :src="audioUrl"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      preload="metadata">
    </audio>
  </el-card>
</template>

<script>
export default {
  name: 'AudioCard',

  props: {
    audioName: {
      type: String,
      required: true
    },
    audioUrl: {
      type: String,
      required: true
    },
    liked: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      isDragging: false
    }
  },

  computed: {
    progress() {
      return this.duration ? (this.currentTime / this.duration) * 100 : 0
    },

    currentTimeFormatted() {
      return this.formatTime(this.currentTime)
    },

    durationFormatted() {
      return this.formatTime(this.duration)
    }
  },

  methods: {
    togglePlay() {
      const audio = this.$refs.audio
      if (!audio) return

      // 发出事件通知父组件处理其他音频的暂停
      this.$emit('play')

      if (audio.paused) {
        audio.play()
        this.isPlaying = true
      } else {
        audio.pause()
        this.isPlaying = false
      }
    },

    handleSeek(event) {
      if (!this.isDragging) {
        this.updateAudioPosition(event)
      }
    },

    startDragging(event) {
      this.isDragging = true
      this.updateAudioPosition(event)
    },

    onDragging(event) {
      if (this.isDragging) {
        this.updateAudioPosition(event)
      }
    },

    stopDragging() {
      this.isDragging = false
    },

    updateAudioPosition(event) {
      const audio = this.$refs.audio
      if (!audio) return

      const rect = event.currentTarget.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      audio.currentTime = percent * audio.duration
    },

    onLoadedMetadata(event) {
      this.duration = event.target.duration
    },

    onTimeUpdate(event) {
      this.currentTime = event.target.currentTime
    },

    onEnded() {
      this.isPlaying = false
      this.currentTime = 0
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    // 组件销毁时清理资源
    cleanup() {
      const audio = this.$refs.audio
      if (audio) {
        audio.pause()
        audio.src = ''
      }
    }
  },

  beforeDestroy() {
    this.cleanup()
  }
}
</script>

<style scoped>
.audio-card {
  background: linear-gradient(135deg, #8a4bff 0%, #6d8eff 100%);
  border: none;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  justify-content: center;
  align-items: center;
  max-height: 480px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  height: 100%;
  width: 100%;
}

.audio-content {
  padding: 20px;
  color: white;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.audio-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px;
  margin-right: 15px;
}

.audio-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-title {
  font-size: 16px;
  font-weight: 500;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.audio-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.audio-progress {
  margin: 20px 0;
}

.progress-bar {
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
  margin-bottom: 8px;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.progress-bar:hover .progress-handle,
.progress-bar.dragging .progress-handle {
  opacity: 1;
}

.progress-track {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.progress-current {
  position: absolute;
  height: 100%;
  background: white;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-bar:hover .progress-handle {
  opacity: 1;
}

.time-display {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.audio-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.control-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.play-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: white;
  color: #8a4bff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.play-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.play-btn i {
  font-size: 18px;
  margin-left: 2px; /* 稍微调整播放图标的位置 */
}

.like-btn {
  color: white;
}

.like-btn .liked {
  color: #8a4bff;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .audio-content {
    padding: 15px;
  }

  .audio-controls {
    gap: 15px;
  }

  .control-btn {
    width: 32px;
    height: 32px;
  }

  .play-btn {
    width: 42px;
    height: 42px;
  }
}

/* 其他样式保持不变... */
</style>