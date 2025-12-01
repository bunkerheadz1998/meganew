<template>
  <!-- top-left HUD (blended) -->
  <div class="hud pointer-events-none select-none">
    <InfoLog class="info-log" />
    <button
			class="upload-btn pointer-events-auto"
			@click="toggle('image')"
			>
      Upload&nbsp;Files
    </button>

		<button
			v-if="props.showSoundsystem"
			class="upload-btn pointer-events-auto"
			@click="toggle('audio')"
			>
			Upload to soundsystem {{props.soundsystemIndex}}
    </button>
  </div>

  <!-- room buttons (right side, NOT blended) -->
  <div class="room-switcher pointer-events-auto">
    <button v-for="n in [1, 2, 3]" :key="n" class="room-btn" :class="{ active: String(n) === currentRoom }"
      @click="goRoom(n)">
      Room {{ n }}
    </button>
  </div>

  <!-- modal (NOT blended) -->
  <div v-if="showMenu" class="upload-backdrop pointer-events-auto" @click.self="toggle">
    <UploadMenu @upload="handleUpload" @soundsystemUpload="handleSoundsystemUpload" :content-type="contentType" />
  </div>
</template>

<script setup>
/* global defineEmits, defineExpose */

import { ref, defineProps } from "vue";
import InfoLog from "./InfoLog.vue";
import UploadMenu from "./UploadMenu.vue";

const props = defineProps({
  showSoundsystem: Boolean,
  soundsystemIndex: Number,
});

let contentType = undefined;

const emit = defineEmits(["upload", "soundsydtemUpload", "menu-open", "menu-close"]);

const showMenu = ref(false);
const currentRoom = ref(new URLSearchParams(location.search).get("room") || "1");

function toggle(type) {
	contentType = type;
  showMenu.value = !showMenu.value;
  showMenu.value ? emit("menu-open") : emit("menu-close");
}

function handleSoundsystemUpload(url) {
  emit("soundsystemUpload", url); // bubble to App.vue
  showMenu.value = false;
  emit("upload-done");
}

function handleUpload(file) {
  emit("upload", file);
  showMenu.value = false;
  emit("upload-done");
}

function goRoom(n) {
  const target = String(n);
  if (target === currentRoom.value) return;
  const params = new URLSearchParams(location.search);
  // room 1 = default (no ?room=)
  if (target === "1") params.delete("room");
  else params.set("room", target);
  location.search = params.toString();
}

defineExpose({ toggle });
</script>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none;
  z-index: 20;
  mix-blend-mode: exclusion;
}

.upload-btn {
  margin: 15px 0 0 25px;
  padding: 0.4rem 0.9rem;
  background: transparent;
  color: #fff;
  border: 1px solid currentColor;
  font-family: monospace;
  font-weight: 700;
  pointer-events: auto;
}

.info-log {
  margin-left: 25px;
  background: transparent;
  color: #fff;
  font-family: monospace;
}

.room-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 25;
  mix-blend-mode: normal;
  /* ensure normal compositing */
  isolation: isolate;
}

.room-btn {
  background: rgba(20, 20, 20, 0.6);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.6);
  font-family: monospace;
  font-weight: 700;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  backdrop-filter: blur(2px);
}

.room-btn.active {
  background: rgba(255, 255, 255, 0.9);
  color: #111;
  border-color: #fff;
}

/* --------- modal (no blend) --------- */
.upload-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  pointer-events: auto;
  mix-blend-mode: normal;
  isolation: isolate;
  background: rgba(0, 0, 0, 0.35);
}
</style>
