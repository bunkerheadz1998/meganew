<template>
  <div class="info-log">
    <div style="display:flex;align-items:baseline;gap:.55rem">
      <h1 class="status">{{ backendStatus }}</h1>
      <h3>V{{ version }}</h3>
    </div>

    <!-- controls: desktop vs mobile -->
    <template v-if="isMobile">
      <p>Tap the <b>Upload Files</b> button to upload something</p>
      <p>Move with the on-screen joystick</p>
      <p>Swipe anywhere else to look around</p>
    </template>
    <template v-else>
      <p>
        Press <b>B</b> or click <b>Upload Files</b> to upload something
      </p>
      <p>Move with <b>W A S D</b> or arrow keys</p>
      <p>Click once to look around with the mouse</p>
    </template>

    <p class="note">Currently supports images and GIFs</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      backendStatus: "Checking…",
      isMobile: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      version: "1.483"
    };
  },
  mounted() {
    this.checkBackendStatus();
  },
  methods: {
    async checkBackendStatus() {
      try {
        const apiUrl = process.env.VUE_APP_API_URL;
        const ok = (await fetch(`${apiUrl}/health`)).ok;
        this.backendStatus = ok ? "ONLINE" : "OFFLINE";
      } catch {
        this.backendStatus = "OFFLINE";
      }
    },
  },
};
</script>

<style scoped>
.status {
  margin-bottom: 0;
}

.note {
  margin-top: 0.5rem;
  font-style: italic;
}
</style>
