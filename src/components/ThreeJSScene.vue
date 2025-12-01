<template>
	<div ref="threeContainer" class="three-container" :class="{ blurred: blur }"></div>
</template>

<script>
	import * as THREE from "three";
	import {
		ref,
		onMounted,
	} from "vue";
	import { useThree } from "@/composables/useThree";
	import { useControls } from "@/composables/useControls";
	import { loadImage, loadGIF, loadVideo, loadAudio, loadModel } from "@/services/threeLoaders";
	import { fetchObjects } from "@/services/objectService";
	import { createSceneActions } from "@/services/sceneActions";

	export default {
		name: "ThreeJSScene",
		props: { blur: { type: Boolean, default: false } },
		emits: ['boundary-check'],
		setup(props, { emit }) {
			const ROOM = new URLSearchParams(location.search).get('room') || 'default';
			const threeContainer = ref(null);
			const { scene, camera, renderer } = useThree(threeContainer);
			// grab ALL the things useControls returns
			const { controls, joystickStart, joystickMove, joystickEnd } = useControls(
				camera,
				renderer.domElement
			);

			// Use your existing sceneActions to handle persistence
			const { addImage, addGIF, addModel } = createSceneActions(scene, camera, ROOM);

			// We'll keep track of every image plane you add for dynamic LOD swaps:
			const imagePlanes = [];

			// Wrap your addImage so we can capture the mesh when it's created:
			function addImageWithLOD(uploadResult) {
				addImage(uploadResult, (mesh) => {
					console.log(mesh);
					// mesh.userData.textureUrls was set in sceneActions
					imagePlanes.push(mesh);
				});
			}

			onMounted(async () => {
				const loader = new THREE.TextureLoader();
				loader.load(require("@/assets/megaworld.png"), (texture) => {
					const aspect = texture.image.width / texture.image.height;
					const plane = new THREE.Mesh(
						new THREE.PlaneGeometry(8, 8 / aspect),
						new THREE.MeshBasicMaterial({
							map: texture,
							transparent: true,
							side: THREE.DoubleSide,
						})
					);
					plane.position.set(0, 6, 0);
					scene.add(plane);
					(function rotate() {
						requestAnimationFrame(rotate);
						plane.rotation.y += 0.01
					})();
				});

				// Set up audio listener
				const listener = new THREE.AudioListener();
				camera.add(listener);

				// Construct soundsystems
				const soundsystems = [
					constructSoundsytem(listener, 40, 0, 40, '1'),
					constructSoundsytem(listener, 40, 0, -40, '2'),
					constructSoundsytem(listener, -40, 0, -40, '3'),
					constructSoundsytem(listener, -40, 0, 40, '4'),
				];

				// Set up soundsystem boundaries for detection
				const soundsystemBounds = soundsystems.map((soundystem) => {
					return new THREE.Box3().setFromObject(soundystem);
				});

				// --- Rehydrate saved objects, now including images ---
				const objs = await fetchObjects(ROOM);
				objs.forEach((obj) => {
					const url =
						obj.type === "model"
						? `${process.env.VUE_APP_API_URL}${obj.filePath}`
						: `${process.env.VUE_APP_API_URL}${obj.filePaths.original || obj.filePaths.large
						}`;
					const pos = new THREE.Vector3(
						obj.position.x,
						obj.position.y,
						obj.position.z
					);
					const rot = obj.rotation.isEuler
						? new THREE.Euler(
							obj.rotation._x,
							obj.rotation._y,
							obj.rotation._z,
							obj.rotation._order
						)
						: obj.rotation;

					if (obj.type === "image") {
						// loadImage from threeLoaders adds the mesh immediately:
						loadImage(scene, url, pos, rot, (mesh) => {
							mesh.userData.textureUrls = obj.filePaths;
							mesh.userData.currentTextureSize = "large";
							imagePlanes.push(mesh);
						});
					} else if (obj.type === "gif") {
						const fp = obj.filePaths || {};
						const vurl = `${process.env.VUE_APP_API_URL}${fp.videoWebm || fp.videoMp4 || fp.original}`;
						(fp.videoWebm || fp.videoMp4 ? loadVideo : loadGIF)(scene, vurl, pos, rot);
					} else if (obj.type === "audio") {
						//
					} else if (obj.type === "model") {
						loadModel(scene, url, pos, rot);
					}
				});

				function animate() {
					requestAnimationFrame(animate);

					updateLOD();
					updateSoundsystemProximity(soundsystemBounds);

					renderer.render(scene, camera);
				}
				animate();
			});

			const lodLoader = new THREE.TextureLoader();

			const prevBoundaryStates = new Map();

			function updateSoundsystemProximity(soundsystemBounds) {
				soundsystemBounds.forEach((boundary, index) => {
					const isInsideSoundsystem = boundary.containsPoint(camera.position);
					const wasInsideSoundsystem = prevBoundaryStates.get(index);

					if (wasInsideSoundsystem !== isInsideSoundsystem) {
						emit('boundary-check', {
							isInsideSoundsystem,
							index,
						});
					}

					prevBoundaryStates.set(index, isInsideSoundsystem);
				});
			}

			function constructSoundsytem(listener, x, y, z, id) {
				const geometry = new THREE.BoxGeometry(10, 10, 10);
				const material = new THREE.MeshBasicMaterial({
					color: 0xff0000,
					wireframe: true,
				});

				const mesh = new THREE.Mesh(geometry, material);
				mesh.position.set(x, y, z);
				mesh.name = id;
				scene.add(mesh);

				loadAudio(
					scene,
					listener,
						`https://player.bubble.supply/megaworld${id}_all`,
					id
				);

				return mesh
			}

			function updateLOD() {
				imagePlanes.forEach((plane) => {
					const urls = plane.userData.textureUrls;
					if (!urls) return; // skip any plane without LOD data

					// measure distance from camera to plane
					const dist = camera.position.distanceTo(plane.position);

					// hysteresis thresholds to avoid thrash
					const cur = plane.userData.currentTextureSize || 'large';
					let desiredSize = cur;
					if (dist > (cur === 'medium' ? 22 : 20)) desiredSize = "small";
					else if (dist > (cur === 'large' ? 10 : 8)) desiredSize = "medium";
					else if (dist <= 8) desiredSize = "large";

					// only swap if it’s different than what we’ve got
					if (desiredSize !== cur) {
						//console.log(
						//  `Image ${plane.uuid
						//  }: switching from ${cur.toUpperCase()} → ${desiredSize.toUpperCase()}`
						//);

						// build the URL and load it
						const url = `${process.env.VUE_APP_API_URL}${urls[desiredSize]}`;
						lodLoader.load(url, (texture) => {
							const old = plane.material.map;
							plane.material.map = texture;
							plane.material.needsUpdate = true;
							plane.userData.currentTextureSize = desiredSize;
							if (old && old.dispose) old.dispose();
						});
					}
				});
			}

			return {
				threeContainer,
				controls,
				joystickStart,
				joystickMove,
				joystickEnd,
				addImage: addImageWithLOD,
				addGIF,
				addModel,
			};
		},
	};
</script>

<style scoped>
html,
body {
	width: 100%;
	height: 100%;
	margin: 0;
	padding: 0;
	overflow: hidden;
}

.three-container {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	/*transition: filter 160ms ease;*/
}

.three-container.blurred {
	filter: blur(6px);
}
</style>