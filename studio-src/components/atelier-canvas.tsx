'use client'

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addAfterEffect, Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { scrollState } from '@/lib/scroll'
import { ATELIER_INVALIDATE, cameraWidth, STATIC_CAMERA_TIME, STATIC_SCENE_TIME, type CameraTrack, type LoadState } from '@/lib/atelier'

type Asset = { gltf: GLTF; track: CameraTrack }
type Props = { still: boolean; onLoad: (state: LoadState) => void }
const READY: LoadState = { phase: 'ready', loaded: 1, total: 1 }
const ERROR: LoadState = { phase: 'error', loaded: 0, total: 0 }

function disposeScene(gltf: GLTF) {
  const textures = new Set<THREE.Texture>()
  const materials = new Set<THREE.Material>()
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  materials.forEach(material => material.dispose())
  textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) texture.source.data.close() })
}

async function download(signal: AbortSignal, onLoad: Props['onLoad']) {
  const response = await fetch('/models/atelier/atelier.glb', { signal })
  if (!response.ok) throw new Error(`Model request failed: ${response.status}`)
  const total = Number(response.headers.get('Content-Length')) || 0
  if (!response.body) return response.arrayBuffer()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0, lastUpdate = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); loaded += value.byteLength
    if (performance.now() - lastUpdate > 80 || loaded === total) {
      onLoad({ phase: 'loading', loaded, total }); lastUpdate = performance.now()
    }
  }
  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes.buffer
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function NoWebGL({ onLoad }: Pick<Props, 'onLoad'>) {
  useEffect(() => onLoad(ERROR), [onLoad])
  return null
}

function RenderBudget() {
  const { size, setDpr, gl } = useThree()
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio, size.width < 640 ? 1.25 : 1.5))
    gl.shadowMap.needsUpdate = true
  }, [size.width, setDpr, gl])
  return null
}

function Studio({ asset, still, onLoad }: Props & { asset: Asset }) {
  const { camera, size, invalidate, gl, scene } = useThree()
  const initialized = useRef(false)
  const mounted = useRef(true)
  const cancelReady = useRef<(() => void) | null>(null)
  const progress = useRef(scrollState.p)
  const quaternion = useMemo(() => new THREE.Quaternion(), [])
  const mixer = useMemo(() => new THREE.AnimationMixer(asset.gltf.scene), [asset])
  const lastTime = useRef(-1)
  const frames = useRef(0)
  const diagnosticObjects = useMemo(() => {
    const objects: Record<string, THREE.Object3D> = {}
    asset.gltf.scene.traverse(object => { if (object.userData.name) objects[object.userData.name] = object })
    return objects
  }, [asset])

  useLayoutEffect(() => {
    mounted.current = true
    initialized.current = false
    asset.gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = !String(object.userData.name ?? object.name).includes('Delivery /')
        object.receiveShadow = !String(object.userData.name ?? object.name).includes('Delivery /')
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          // Thin panes use alpha glass on the web: crisp graphics, one render pass,
          // and no screen-space refraction artifacts on the small delivered page.
          if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) {
            material.transmission = 0
            material.transparent = true
            material.opacity = material.name.includes('clear cyan') ? .7 : material.name.includes('satin') ? .42 : .35
            if (material.name.includes('clear cyan')) material.color.set('#25494f')
            material.depthWrite = false
            material.needsUpdate = true
            object.castShadow = false
          }
        }
      }
    })
    for (const clip of asset.gltf.animations) {
      const action = mixer.clipAction(clip)
      action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play()
    }
    // Animation actions and the rig must exist before the first render can sample them.
    lastTime.current = -1
    invalidate()
    return () => {
      mounted.current = false
      cancelReady.current?.(); cancelReady.current = null
      mixer.stopAllAction(); mixer.uncacheRoot(asset.gltf.scene)
    }
  }, [asset, mixer, invalidate])

  useEffect(() => {
    const wake = () => { if (!document.hidden) invalidate() }
    const lost = (event: Event) => { event.preventDefault(); onLoad(ERROR) }
    window.addEventListener(ATELIER_INVALIDATE, wake)
    document.addEventListener('visibilitychange', wake)
    gl.domElement.addEventListener('webglcontextlost', lost)
    invalidate()
    return () => {
      window.removeEventListener(ATELIER_INVALIDATE, wake)
      document.removeEventListener('visibilitychange', wake)
      gl.domElement.removeEventListener('webglcontextlost', lost)
    }
  }, [gl, invalidate, onLoad, still])

  useFrame((_, delta) => {
    if (document.hidden) return
    const target = THREE.MathUtils.clamp(scrollState.p, 0, 1)
    // Native scroll stays responsive; a short damping tail softens wheel steps.
    progress.current = still || !initialized.current ? target : THREE.MathUtils.damp(progress.current, target, 18, Math.min(delta, .1))
    if (Math.abs(progress.current - target) < .00001) progress.current = target
    const p = progress.current
    const time = still ? STATIC_SCENE_TIME : p * asset.track.duration
    if (time !== lastTime.current) {
      // ClampWhenFinished pauses actions at the end; re-enable to scrub backwards.
      for (const clip of asset.gltf.animations) { const action = mixer.clipAction(clip); action.paused = false; action.enabled = true }
      mixer.setTime(time); lastTime.current = time
    }
    const cameraTime = still ? STATIC_CAMERA_TIME : time
    const sample = Math.min(asset.track.keys.length - 1, cameraTime * asset.track.fps)
    const index = Math.floor(sample), alpha = sample - index
    const a = asset.track.keys[index], b = asset.track.keys[Math.min(index + 1, asset.track.keys.length - 1)]
    camera.position.set(THREE.MathUtils.lerp(a[0], b[0], alpha), THREE.MathUtils.lerp(a[1], b[1], alpha), THREE.MathUtils.lerp(a[2], b[2], alpha))
    camera.quaternion.set(a[3], a[4], a[5], a[6]).slerp(quaternion.set(b[3], b[4], b[5], b[6]), alpha)
    const aspect = size.width / size.height
    const width = cameraWidth(THREE.MathUtils.lerp(a[7], b[7], alpha), aspect, asset.track.referenceAspect, still ? 0 : p)
    const ortho = camera as THREE.OrthographicCamera
    ortho.left = -width / 2; ortho.right = width / 2
    ortho.top = width / aspect / 2; ortho.bottom = -ortho.top
    ortho.updateProjectionMatrix(); ortho.updateMatrixWorld()
    if (!initialized.current) {
      initialized.current = true
      // Compiling is not presenting. Keep the overlay until this canvas has drawn
      // a complete frame with the initialized camera and animation pose.
      void gl.compileAsync(scene, camera).then(() => {
        if (!mounted.current) return
        const previousFrame = gl.info.render.frame
        const stopReady = addAfterEffect(() => {
          if (gl.info.render.frame <= previousFrame) return
          stopReady()
          if (cancelReady.current === stopReady) cancelReady.current = null
          if (mounted.current) onLoad(READY)
        })
        cancelReady.current = stopReady
        invalidate()
      }).catch(() => { if (mounted.current) onLoad(ERROR) })
    }
    if (process.env.NODE_ENV !== 'production') {
      const names = ['Courier / actual OUTPUT parcel', 'OUTPUT / right supplied parcel', 'OUTPUT / left supplied parcel', 'Delivery / completed website', 'Courier • specialist']
      const story = Object.fromEntries(names.map(name => {
        const object = diagnosticObjects[name]
        return [name, object ? { position: object.position.toArray(), scale: object.scale.toArray() } : null]
      }))
      Object.assign(gl.domElement.dataset, { frames: String(++frames.current), story: JSON.stringify(story), progress: p.toFixed(5), time: time.toFixed(3), cameraTime: cameraTime.toFixed(3), calls: String(gl.info.render.calls), triangles: String(gl.info.render.triangles) })
    }
    if (!still && progress.current !== target) invalidate()
  })
  return <primitive object={asset.gltf.scene} dispose={null} />
}

export default function AtelierCanvas({ still, onLoad }: Props) {
  const [asset, setAsset] = useState<Asset | null>(null)
  const camera = useMemo(() => {
    const first = asset?.track.keys[0]
    const width = first?.[7] ?? 1
    const height = width / (asset?.track.referenceAspect ?? 1)
    const opening = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 80)
    // The camera track owns its frustum. R3F must not replace it with pixel-space
    // bounds when the first resize / DPR measurement arrives during scrolling.
    ;(opening as THREE.OrthographicCamera & { manual: boolean }).manual = true
    if (first) {
      opening.position.set(first[0], first[1], first[2])
      opening.quaternion.set(first[3], first[4], first[5], first[6])
      opening.updateMatrixWorld()
    }
    return opening
  }, [asset])
  useEffect(() => {
    const controller = new AbortController()
    const draco = new DRACOLoader().setDecoderPath('/decoders/draco/').setWorkerLimit(2)
    const loader = new GLTFLoader().setDRACOLoader(draco)
    let result: GLTF | undefined
    void (async () => {
      try {
        const [bytes, track] = await Promise.all([
          download(controller.signal, onLoad),
          fetch('/models/atelier/camera.json', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Camera request failed'); return response.json() as Promise<CameraTrack> }),
        ])
        if (controller.signal.aborted) return
        onLoad({ phase: 'preparing', loaded: bytes.byteLength, total: bytes.byteLength })
        result = await loader.parseAsync(bytes, '/models/atelier/')
        if (controller.signal.aborted) { disposeScene(result); return }
        setAsset({ gltf: result, track })
      } catch (error) {
        if (!controller.signal.aborted) { console.error('Atelier could not load', error); onLoad(ERROR) }
      } finally { draco.dispose() }
    })()
    return () => { controller.abort(); if (result) disposeScene(result) }
  }, [onLoad])

  if (!asset) return null
  return (
    <SceneBoundary onError={() => onLoad(ERROR)}>
      <Canvas orthographic camera={camera} frameloop="demand"
        dpr={[1, 1.5]} shadows="percentage" gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        fallback={<NoWebGL onLoad={onLoad} />}
        onCreated={({ gl }) => { gl.setClearColor('#0b0b0d'); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; gl.transmissionResolutionScale = .5 }}>
        <RenderBudget />
        <ambientLight intensity={.35} />
        <hemisphereLight args={['#f4f2ec', '#303847', .65]} />
        <directionalLight position={[-3, 8, 5]} intensity={2} color="#fff2ed" castShadow
          shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-normalBias={.025} />
        <directionalLight position={[4, 5, -3]} intensity={1.2} color="#a8eaf2" />
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={1} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={.7} position={[5, 2, 0]} rotation-y={-Math.PI / 2} scale={[6, 6, 1]} />
        </Environment>
        <Studio asset={asset} still={still} onLoad={onLoad} />
      </Canvas>
    </SceneBoundary>
  )
}
