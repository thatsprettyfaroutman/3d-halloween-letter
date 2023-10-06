import { useRef, useEffect } from 'react'
import {
  useTexture,
  useGLTF,
  useAnimations,
  MeshDiscardMaterial,
} from '@react-three/drei'
import { GroupProps, useThree } from '@react-three/fiber'
import { useSpringValue } from 'react-spring'
import { a, to } from '@react-spring/three'
import { MathUtils } from 'three'
import { GLTF } from 'three-stdlib'
import { type SkinnedMesh, type Bone, type Group, Vector3 } from 'three'
import { useControls } from 'leva'

const { lerp, smoothstep } = MathUtils

const DEG = Math.PI / 180
const MODEL_PATH = '/poster.glb'
const ANIMATION_NAME = 'ArmatureAction.001'
const DURATION = 25 / 24
const NORMAL_PATH = '/normalbake.jpg'

type GLTFResult = GLTF & {
  nodes: {
    Plane: SkinnedMesh
    r: Bone
    l: Bone
    neutral_bone: Bone
  }
}

type TPosterProps = GroupProps & {
  diffuseSrc: string
  diffuseBackSrc: string
  onReady?: (mousePoint: Vector3) => void
}

useGLTF.preload(MODEL_PATH)
useTexture.preload(NORMAL_PATH)

export default function Poster({
  diffuseSrc,
  diffuseBackSrc,
  onReady,
  ...restProps
}: TPosterProps) {
  const levaProps = useControls('Poster', {
    'scale-y': {
      min: 0.0001,
      max: 10,
      value: 1,
    },
  })
  const levaMaterialProps = useControls('Poster Material', {
    'normalScale-x': {
      min: -2,
      max: 2,
      value: 0.12,
    },
    'normalScale-y': {
      min: -2,
      max: 2,
      value: 0.14,
    },
    roughness: {
      min: 0,
      max: 1,
      value: 0.93,
      step: 0.0001,
    },
    metalness: {
      min: 0,
      max: 1,
      value: 0,
      step: 0.0001,
    },
    bumpScale: {
      min: 0,
      max: 1,
      value: 0,
      step: 0.0001,
    },
    specularIntensity: {
      min: 0,
      max: 10,
      value: 1,
    },
  })

  const group = useRef<Group>(null)
  const mesh = useRef<SkinnedMesh>(null)
  const { nodes, animations } = useGLTF(MODEL_PATH) as unknown as GLTFResult
  const { actions } = useAnimations(animations, group)
  const { viewport } = useThree()
  const mousePoint = useRef(new Vector3(0, 0, 0))

  // Textures

  const diffuse = useTexture(diffuseSrc)
  diffuse.flipY = false
  diffuse.rotation = -90 * DEG
  diffuse.center.x = 0.5
  diffuse.center.y = 0.5

  const diffuseBack = useTexture(diffuseBackSrc)
  diffuse.flipY = false
  diffuse.rotation = -90 * DEG
  diffuse.center.x = 0.5
  diffuse.center.y = 0.5
  const normal = useTexture(NORMAL_PATH)
  normal.flipY = false

  // Springs

  const ready = useSpringValue(0, { config: { precision: 0.001 } })
  const open = useSpringValue(0, {
    config: { tension: 10, friction: 5, mass: 2, precision: 0.00001 },
    onChange: (progress) => {
      // Set animation time based on spring progress
      const action = actions?.[ANIMATION_NAME]
      if (action) {
        action.time = Number(progress) * DURATION
      }
    },
  })

  const onReadyRef = useRef<typeof onReady>(onReady)
  onReadyRef.current = onReady
  useEffect(() => {
    // Setup animation for spring
    if (actions?.[ANIMATION_NAME]) {
      actions[ANIMATION_NAME].play()
      actions[ANIMATION_NAME].paused = true
      ready.start(1)

      if (onReadyRef.current) {
        onReadyRef.current(mousePoint.current)
      }
    }
  }, [ready, actions])

  return (
    <a.group
      ref={group}
      {...restProps}
      dispose={null}
      position-y={to([ready, open], (rp, op) => {
        const readyY = lerp(viewport.height, 0, Number(rp))
        const openY = lerp(-0.5, 0, smoothstep(Number(op) * 1.5, 0, 1))
        return readyY + openY
      })}
      // @ts-ignore value is valid
      scale={ready.to((p) => lerp(0.5, 1, p))}
    >
      {/* Plane for capturing mouse events. Listening to them on skinnedMesh is buggy for some reason. */}
      <a.mesh
        // @ts-ignore
        scale={open.to((p) => lerp(0.5, 1, p))}
        position-y={open.to((p) => lerp(0.5, 0, p))}
        onClick={() => {
          open.start(!open.goal ? 1 : 0)
        }}
        onPointerEnter={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerLeave={() => {
          document.body.style.cursor = ''
        }}
        onPointerMove={(e) => {
          mousePoint.current.lerp(e.point, 0.1)
        }}
      >
        <planeGeometry args={[3, 2]} />
        <MeshDiscardMaterial />
      </a.mesh>

      <a.group
        name="Scene"
        rotation-x={75 * DEG}
        rotation-y={-90 * DEG}
        {...levaProps}
      >
        <group name="Armature">
          <skinnedMesh
            ref={mesh}
            name="Plane"
            geometry={nodes.Plane.geometry}
            skeleton={nodes.Plane.skeleton}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              flatShading
              map={diffuse}
              side={2}
              normalMap={levaMaterialProps.bumpScale > 0 ? null : normal}
              {...levaMaterialProps}
              onBeforeCompile={(shaderObject) => {
                shaderObject.uniforms.uDiffuseBack = { value: diffuseBack }
                shaderObject.fragmentShader =
                  shaderObject.fragmentShader.replace(
                    'void main() {',
                    `
                      uniform sampler2D uDiffuseBack;
                      void main() {
                    `
                  )

                shaderObject.fragmentShader =
                  shaderObject.fragmentShader.replace(
                    '#include <map_fragment>',
                    `
                      #include <map_fragment>
                    
                      // Use uDiffuseBack as the back facing color
                      if (gl_FrontFacing != true) {
                        diffuseColor = texture2D(uDiffuseBack, vMapUv);

                        // Back facing color from the map
                        // diffuseColor = texture2D(map, vec2(0.125));
                      }
                  `
                  )
              }}
            />
          </skinnedMesh>
          <primitive object={nodes.r} />
          <primitive object={nodes.l} />
          <primitive object={nodes.neutral_bone} />
        </group>
      </a.group>
    </a.group>
  )
}
