import { useState, Suspense } from 'react'
import { Vector3 } from 'three'
import styled from 'styled-components'
import { useSpringValue } from 'react-spring'
import { PresentationControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import chroma from 'chroma-js'
import Poster from '@/components/Poster'
import Light from '@/components/Light'
import { Glow } from '@/components/Glow'
import { Leva } from 'leva'

const DEG = Math.PI / 180
const BACKGROUND = chroma('#04000a')
const AMBIENT = chroma('#fff')

const Wrapper = styled.main`
  height: 100vh;
`

const Spinner = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  width: 32px;
  height: 32px;
  border: 2px solid #fff;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation-name: Spin;
  animation-duration: 1s;
  animation-iteration-count: infinite;
`

export default function App() {
  const guideVisible = useSpringValue(0)
  const [lightTarget, setLightTarget] = useState(new Vector3())

  return (
    <Wrapper onClick={() => guideVisible.start(0)}>
      <Suspense fallback={<Spinner />}>
        <Canvas
          linear
          flat
          shadows
          camera={{ position: [0, 0, 10], fov: 25 }}
          dpr={2}
        >
          <color attach="background" args={[BACKGROUND.hex()]} />
          <fog attach="fog" args={[BACKGROUND.hex(), 10, 15]} />
          <ambientLight color={AMBIENT.brighten(-2).hex()} />

          <Light lookAt={lightTarget} />
          <PresentationControls
            cursor={false}
            snap
            speed={2}
            polar={[-45 * DEG, 45 * DEG]}
            azimuth={[-45 * DEG, 45 * DEG]}
            config={{ mass: 1, tension: 170, friction: 26, precision: 0.001 }}
          >
            <Poster
              onReady={(mousePoint) => {
                setLightTarget(mousePoint)
                guideVisible.start(1, { delay: 3000 })
              }}
              diffuseSrc="/diffuse-front.jpg"
              diffuseBackSrc="/diffuse-back.jpg"
            />
          </PresentationControls>

          <Glow color={BACKGROUND.brighten(1).hex()} />
        </Canvas>
      </Suspense>

      <Leva collapsed flat />
    </Wrapper>
  )
}
