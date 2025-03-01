import { ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
//@ts-expect-error importing asset file
import quadcopterStl from "~/assets/quadcopter.stl"

export type DroneOrientationWidgetProps = {
  pitch: number
  roll: number
  yaw: number
}

export function DroneOrientationWidget({
  pitch,
  roll,
  yaw,
}: DroneOrientationWidgetProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const [mesh, setMesh] = useState<THREE.Mesh | null>(null)
  const [size, setSize] = useState(1)

  useEffect(() => {
    if (!mesh) {
      return
    }

    mesh.rotation.set(pitch, roll, yaw)
  }, [mesh, pitch, roll, yaw])

  useEffect(() => {
    if (!canvasContainerRef.current) {
      return
    }
    const container = canvasContainerRef.current

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(0, -25, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const loader = new STLLoader()
    loader
      .loadAsync(quadcopterStl)
      .then((geometry) => {
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          specular: 0xffffff,
          shininess: 20,
        })
        geometry.computeVertexNormals()
        const mesh = new THREE.Mesh(geometry, material)

        geometry.center()
        camera.lookAt(mesh.position)

        const ambientLight = new THREE.AmbientLight(0x070e15, 10)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(0, -5, 20)

        scene.add(ambientLight)
        scene.add(directionalLight)
        scene.add(mesh)

        setMesh(mesh)
      })
      .catch((error) => {
        console.error("Cannot load .stl model:", error)
        loadFallback()
      })

    function loadFallback() {
      const geometry = new THREE.BoxGeometry(10, 20, 2)

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshPhongMaterial({
          color: 0xffffff,
          specular: 0xffffff,
          shininess: 20,
        }),
      )

      geometry.center()
      camera.lookAt(mesh.position)

      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 2),
        12,
        0x22ccff,
        4,
        2,
      )

      const ambientLight = new THREE.AmbientLight(0x070e15, 10)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
      directionalLight.position.set(0, -5, 20)

      scene.add(ambientLight)
      scene.add(directionalLight)
      scene.add(mesh)
      mesh.add(arrow)

      setMesh(mesh)
    }

    function animate() {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return

      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(container)

    return () => {
      observer.disconnect()
      container?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative overflow-hidden [&:hover>:nth-child(2)]:translate-y-0">
      <div
        ref={canvasContainerRef}
        className={cn(
          "aspect-square w-auto max-h-[50dvh] mx-auto overflow-hidden",
          size === 1 && "h-32",
          size === 2 && "h-64",
          size === 3 && "h-96",
        )}
      />
      <div className="absolute bottom-0 w-full flex items-stretch *:flex-1 transition-transform translate-y-full">
        <Button
          variant="ghost"
          size="icon"
          disabled={size >= 3}
          onClick={() => setSize(size + 1)}
        >
          <ZoomIn />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={size <= 1}
          onClick={() => setSize(size - 1)}
        >
          <ZoomOut />
        </Button>
      </div>
    </div>
  )
}
