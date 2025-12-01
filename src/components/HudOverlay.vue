<template>
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

  <div v-if="showMenu" class="upload-backdrop pointer-events-auto" @click.self="toggle">
    <UploadMenu @upload="handleUpload" :content-type="contentType" />
  </div>
</template>

<script setup>
/* global defineEmits, defineExpose */ /* ← silences no-undef */

import { ref, defineProps } from "vue";
import InfoLog from "./InfoLog.vue";
import UploadMenu from "./UploadMenu.vue";

const props = defineProps({
  showSoundsystem: Boolean,
  soundsystemIndex: Number,
});

let contentType = undefined;

const emit = defineEmits(["upload", "menu-open", "menu-close"]);

const showMenu = ref(false);

function toggle(type) {
	contentType = type;
  showMenu.value = !showMenu.value;
  showMenu.value ? emit("menu-open") : emit("menu-close");
}

function handleUpload(file) {
  emit("upload", file); // bubble to App.vue
  showMenu.value = false;
  emit("upload-done");
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

.info-log {
  margin-left: 25px;
  background: transparent;
  color: #fff;
  font-family: monospace;
}
</style>
