// src/services/sceneActions.js
import * as THREE from 'three'
import { loadImage, loadGIF, loadVideo, loadAudio, loadModel } from '@/services/threeLoaders'
import { saveObject } from '@/services/objectService'

/**
 * Returns functions to add new objects (image, gif, model) into a Three.js scene
 * and automatically persist them to your backend.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 */
export function createSceneActions(scene, camera, room = 'default') {
    const forwardOffset = new THREE.Vector3(0, 0, -5)

    function _getPlacement() {
        return camera.position.clone()
            .add(forwardOffset.applyQuaternion(camera.quaternion))
    }

    /**
     * uploadResult.filePaths is expected to be an object like:
     * { original: "...", small: "...", medium: "...", large: "..." }
     */
    async function addImage(uploadResult) {
        // 1️⃣ pull all three URLs
        const urls = uploadResult.filePaths;
        const largeUrl = `${process.env.VUE_APP_API_URL}${urls.large}`;

        // 2️⃣ figure out where & how to place it
        const pos = _getPlacement();
        const rot = camera.rotation.clone();

        // 3️⃣ call your loader helper
        loadImage(scene, largeUrl, pos, rot, mesh => {
            // ➡️ attach LOD info to this mesh
            mesh.userData.textureUrls = urls;
            mesh.userData.currentTextureSize = 'large';
            //console.log(`Image ${mesh.uuid}: initial LOD → LARGE`);

            // 4️⃣ persist to your backend
            saveObject({
                type: 'image',
                filePaths: urls,
                position: mesh.position,
                rotation: mesh.rotation,
                uuid: mesh.uuid,
                room
            }).catch(console.error);
        });
    }

    async function addGIF(uploadResult) {
        const fp = uploadResult.filePaths || {};
        const vurl = `${process.env.VUE_APP_API_URL}${fp.videoWebm || fp.videoMp4 || fp.original}`;
        const pos = _getPlacement();
        const rot = camera.rotation.clone();
        const loader = (fp.videoWebm || fp.videoMp4) ? loadVideo : loadGIF;

        loader(scene, vurl, pos, rot, mesh => {
            saveObject({
                type: 'gif',
                filePaths: fp,
                position: mesh.position,
                rotation: mesh.rotation,
                uuid: mesh.uuid,
                room
            }).catch(console.error)
        })
    }

    async function addAudio(result) {
        const vurl = `${process.env.VUE_APP_API_URL}${result.filePath}`;
        const loader = loadAudio;

        loader(scene, vurl, soundsystemID => {
            saveObject({
                type: 'audio',
                filePath: result.filePath,
								soundsystem: soundsystemID,
                room
            }).catch(console.error)
        })
    }

    function addModel(result, extension) {
        const url = `${process.env.VUE_APP_API_URL}${result.filePath}`
        const pos = _getPlacement()
        const rot = camera.rotation.clone()

        loadModel(scene, url, pos, rot, mesh => {
            saveObject({
                type: 'model',
                filePath: result.filePath,
                extension,
                position: mesh.position,
                rotation: mesh.rotation,
                uuid: mesh.uuid,
                room
            }).catch(console.error)
        })
    }

    return { addImage, addGIF, addAudio, addModel }
}
