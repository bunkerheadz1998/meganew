<template>
  <div class="upload-menu pointer-events-auto">
    <!-- STEP 1 – pick a file -->
    <template v-if="!file">
			<input type="text"/>
			<button onClick={onChoose}>Add to soundsystem</button>
      <p class="hint">Supports: Soundcloud, Bandcamp</p>
    </template>

    <!-- STEP 2 – render track preview + actions -->
    <template v-else>
      <h3>Preview</h3>

      <img v-if="isImage" :src="previewUrl" class="preview" :alt="file.name" />

      <p>
        <!--{{ file.name }} &nbsp;•&nbsp;
					{{ (file.size / 1024 / 1024).toFixed(2) }} MB-->
					<!-- Preview track length + art? -->
      </p>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button @click="reset">Choose other</button>
        <button :disabled="!!error" @click="upload">Upload</button>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  emits: ["download"],
  data() {
    return {
      length: null,
      name: null,
      previewUrl: null,
      error: "",
    };
  },
  computed: {
    isAudio() {
			return this.file && this.file.type.startsWith("audio/");
    },
  },
  methods: {
    onChoose(e) {
      const f = e.target.files[0];
      if (!f) return;
      this.error = "";
      // type check
      if (!/^image\//.test(f.type)) {
        this.error = "Unsupported file format.";
      }

      if (f.size > 12 * 1024 * 1024) {
        this.error = "File exceeds 12 MB.";
      }
      this.file = f;
      this.previewUrl = URL.createObjectURL(f);
    },
    reset() {
      URL.revokeObjectURL(this.previewUrl);
      this.file = this.previewUrl = null;
      this.error = "";
    },
    download() {
      // only emit if no validation errors
      if (this.error || !this.file) return;
      this.$emit("donwload", this.file);
      this.reset(); // clear panel after bubbling
    },
  },
  beforeUnmount() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
  },
};
</script>

<style scoped>
.upload-menu {
  background: #EEE;
  color: #111;
  padding: 20px;
  border: 1px solid #555;
  width: min(90vw, 400px);
  text-align: center;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 6px;
}

.error {
  color: #f66;
  margin: 6px 0;
}

.preview {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  margin: 10px 0;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
}

button {
  padding: 0.4rem 0.9rem;
  border: 1px solid #888;
  background: #222;
  color: #eee;
  cursor: pointer;
  font-family: monospace;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
