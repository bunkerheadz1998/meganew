// src/services/threeLoaders.js
import * as THREE from 'three'
import { parseGIF, decompressFrames } from 'gifuct-js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader.js'


/** Image → Plane */
export function loadImage(
    scene,
    url,
    position = new THREE.Vector3(),
    rotation = new THREE.Euler(),
    saveCb
) {
    const loader = new THREE.TextureLoader()
    loader.load(
        url,
        tex => {
            const aspect = tex.image.width / tex.image.height
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2 / aspect),
                new THREE.MeshBasicMaterial({
                    map: tex,
                    transparent: true,
                    side: THREE.DoubleSide
                })
            )
            mesh.position.copy(position)
            mesh.rotation.copy(rotation)
            scene.add(mesh)
            if (saveCb) saveCb(mesh)
        },
        undefined,
        err => console.error('Error loading texture', err)
    )
}

/** GIF → Animated CanvasTexture */
export async function loadGIF(
    scene,
    url,
    position = new THREE.Vector3(),
    rotation = new THREE.Euler(),
    saveCb
) {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Failed to fetch GIF (${res.status}) ${url}`)

    const buffer = await res.arrayBuffer()
    const gif = parseGIF(buffer)
    const frames = decompressFrames(gif, true)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = frames[0].dims.width
    canvas.height = frames[0].dims.height

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const aspect = canvas.width / canvas.height
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2 / aspect),
        new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        })
    )
    mesh.position.copy(position)
    mesh.rotation.copy(rotation)
    scene.add(mesh)

    let idx = 0
    const animate = () => {
        const f = frames[idx]
        ctx.putImageData(
            new ImageData(new Uint8ClampedArray(f.patch), f.dims.width, f.dims.height),
            f.dims.left,
            f.dims.top
        )
        texture.needsUpdate = true
        idx = (idx + 1) % frames.length
        const delay = f.delay < 10 ? f.delay * 10 : f.delay
        setTimeout(animate, delay)
    }
    animate()

    if (saveCb) saveCb(mesh)
}

export function loadVideo(scene, url, position = new THREE.Vector3(), rotation = new THREE.Euler(), saveCb) {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.src = url;
    v.loop = true; v.muted = true; v.playsInline = true; v.autoplay = true; v.preload = 'metadata';
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2 / (16 / 9)),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    v.addEventListener('loadedmetadata', () => {
        const a = (v.videoWidth || 16) / (v.videoHeight || 9);
        mesh.geometry.dispose(); mesh.geometry = new THREE.PlaneGeometry(2, 2 / a);
    });
    mesh.position.copy(position); mesh.rotation.copy(rotation);
    scene.add(mesh);
    v.play().catch(() => { window.addEventListener('click', () => v.play(), { once: true }); });
    if (saveCb) saveCb(mesh);
}

export async function loadAudio(scene, listener, url, soundsystemID) {
	const soundsystem = scene.getObjectByName(soundsystemID);
	const speaker = new THREE.PositionalAudio(listener);
	speaker.setRefDistance(0.5);

	const cdj = new Audio();
  cdj.src = url;
  cdj.crossOrigin = 'anonymous';
  cdj.autoplay = true;
  cdj.loop = true;
  cdj.preload = 'auto';

	speaker.setMediaElementSource(cdj);
	soundsystem.add(speaker);

	const cue = () => {
		if (listener.context.state === 'suspended') {
			listener.context.resume().then(() => {
				cdj.play().catch(console.warn);
			});
		} else {
			cdj.play().catch(() => {
				window.addEventListener('click', () => cdj.play());
			});
		}
	}

	cdj.addEventListener('canplaythrough', cue);
}

/** Model → Scene (auto-scaled, positioned) */
export async function loadModel(
    scene,
    url,
    position = new THREE.Vector3(),
    rotation = new THREE.Euler(),
    saveCb
) {
    const ext = url.split('.').pop().toLowerCase()
    let loader

    switch (ext) {
        case 'gltf':
        case 'glb':
            loader = new GLTFLoader()
            break
        case 'obj':
            loader = new OBJLoader()
            break
        case 'fbx':
            loader = new FBXLoader()
            break
        case 'stl':
            loader = new STLLoader()
            break
        case 'dae':
            loader = new ColladaLoader()
            break
        case '3ds':
            loader = new TDSLoader()
            break
        case 'ply':
            loader = new PLYLoader()
            break
        case 'wrl':
            loader = new VRMLLoader()
            break
        default:
            console.error(`Unsupported model type: ${ext}`)
            return
    }

    loader.load(
        url,
        gltf => {
            const obj = gltf.scene || gltf
            // auto-scale to max height 5
            const box = new THREE.Box3().setFromObject(obj)
            const h = box.max.y - box.min.y
            if (h > 5) {
                const s = 5 / h
                obj.scale.set(s, s, s)
            }
            obj.position.copy(position)
            obj.rotation.copy(rotation)
            scene.add(obj)
            if (saveCb) saveCb(obj)
        },
        undefined,
        err => console.error('Error loading model', err)
    )
}
