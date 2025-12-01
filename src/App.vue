<template>
  <div>
    <ThreeJSScene
			ref="threeScene"
			:blur="menuOpen"
			@boundary-check="onBoundaryCheck"
			/>
    <div v-if="isMobile" class="joystick-wrapper">
      <JoystickWrapper @joystick-start="onJoyStart" @joystick-move="onJoyMove" @joystick-end="onJoyEnd" />
    </div>
    <HudOverlay
			ref="hud"
			:is-mobile="isMobile"
			:show-soundsystem="showSoundsystem"
			:soundsystem-index="soundsystemIndex"
			@upload="handleUpload"
			@soundsystemUpload="handleSoundsystemUpload"
			@menu-open="onMenuOpen"
			@menu-close="onMenuClose"
			@upload-done="onUploadDone"
			/>
  </div>
</template>

<script>
import JoystickWrapper from "@/components/JoystickWrapper.vue";
import ThreeJSScene from "./components/ThreeJSScene.vue";
import HudOverlay from "@/components/HudOverlay.vue";

export default {
  components: {
    ThreeJSScene,
    JoystickWrapper,
    HudOverlay,
  },
  data() {
    return {
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      menuOpen: false,
			showSoundsystem: false,
			soundsystemIndex: null,
    };
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeydown);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    onMenuOpen() {
      this.menuOpen = true;
      document.exitPointerLock();
    },
    onMenuClose() {
      this.menuOpen = false;
    },
    onUploadDone() {
      this.menuOpen = false;
      const c = this.$refs.threeScene.controls;
      if (c && c.isLocked === false) c.lock();
    },
    handleKeydown(e) {
      if (e.key.toLowerCase() === "b") this.$refs.hud.toggle();
    },
    handleJoystickMove({ x, y }) {
      this.joystickX = x;
      this.joystickY = y;
    },
    handleJoystickStop() {
      this.joystickX = 0;
      this.joystickY = 0;
    },
    async handleSoundsystemUpload(url) {
			try {
				const apiUrl = process.env.VUE_APP_SOUNDSYSTEM_SERVICE_URL;

				console.log('********************')
				console.log(url)
				console.log(this.soundsystemIndex)
				console.log('********************')

				const body = JSON.stringify({ url });

				const headers = {
					"Content-Type": "application/json"
				}

				const response = await fetch(`${apiUrl}/add/${this.soundsystemIndex}`, {
					method: 'POST',
					headers,
					body 
				});

				if (!response.ok) {
          throw new Error('Failed to add track to playlist');
        }
			} catch (err) {
				console.error(err);
			}
		},
    async handleUpload(file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const apiUrl = process.env.VUE_APP_API_URL;
        const response = await fetch(`${apiUrl}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const result = await response.json();
        console.log("Upload result:", result);

        const extension = file.name.split(".").pop().toLowerCase();

        switch (extension) {
          case "jpg":
          case "jpeg":
          case "png":
            this.$refs.threeScene.addImage(result);
            break;
          case "gif":
            this.$refs.threeScene.addGIF(result);
            break;
          case "gltf":
          case "glb":
          case "obj":
          case "fbx":
          case "stl":
          case "dae":
          case "3ds":
          case "ply":
          case "x3d":
          case "wrl":
            this.$refs.threeScene.addModel(result, extension);
            break;
          default:
            console.error("Unsupported file type");
        }

        if (this.$refs.threeScene.controls) {
          this.$refs.threeScene.controls.lock();
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    },
    onJoyStart(payload) {
      this.$refs.threeScene?.joystickStart(payload);
    },
    onJoyMove(payload) {
      this.$refs.threeScene?.joystickMove(payload);
    },
    onJoyEnd(payload) {
      this.$refs.threeScene?.joystickEnd(payload);
    },
		onBoundaryCheck(data) {
			const {
				isInsideSoundsystem,
				index
			} = data;

			console.log('********************');
			console.log(data);
			console.log('********************');

			this.soundsystemIndex = index;
			this.showSoundsystem = isInsideSoundsystem;
		},
  },
};
</script>

<style>
html,
body {
  overscroll-behavior: none;
}

.joystick-wrapper {
  position: absolute;
  bottom: 35px;
  left: 35px;
  z-index: 10;
}
</style>
