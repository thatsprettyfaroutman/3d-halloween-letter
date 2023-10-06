import { useRef } from 'react'
import {
  type Vector3,
  SpotLight as TSpotLight,
  MathUtils,
  Vector2,
} from 'three'
import { useFrame } from '@react-three/fiber'
import { SpotLight } from '@react-three/drei'
import { useControls } from 'leva'

const { lerp } = MathUtils
const TRAVEL_DISTANCE = new Vector2(4, 2)

export default function Light({ lookAt, ...restProps }: { lookAt: Vector3 }) {
  const ref = useRef<TSpotLight>(null)

  const levaProps = useControls('Light', {
    'position-x': {
      min: -10,
      max: 10,
      value: 2,
    },
    'position-y': {
      min: -10,
      max: 10,
      value: -1,
    },
    'position-z': {
      min: -10,
      max: 10,
      value: 3,
    },
    intensity: {
      min: 0,
      max: 1000,
      value: 110,
    },
    angle: {
      min: 0,
      max: Math.PI,
      value: 0.29,
    },
    penumbra: {
      min: 0,
      max: 2,
      value: 0.5,
    },
    attenuation: {
      min: 0,
      max: 20,
      value: 5,
    },
    distance: {
      min: 0,
      max: 20,
      value: 10,
    },
    anglePower: {
      min: 0,
      max: 100,
      value: 6,
    },
  })

  useFrame(({ mouse }) => {
    const light = ref.current
    if (!light) {
      return
    }
    const { position } = ref.current
    position.y = lerp(
      position.y,
      -mouse.y * TRAVEL_DISTANCE.y + levaProps['position-y'],
      0.1
    )

    light.target.position.copy(lookAt)
  })

  return (
    <SpotLight
      ref={ref}
      castShadow
      shadow-bias={-0.0001}
      {...restProps}
      {...levaProps}
    />
  )
}
