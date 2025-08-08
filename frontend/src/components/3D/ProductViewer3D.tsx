import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Environment, 
  PerspectiveCamera, 
  Sphere,
  Html,
  useProgress,
  Preload,
  ContactShadows,
  Float,
  Text3D,
  MeshDistortMaterial,
  MeshWobbleMaterial
} from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { 
  EyeIcon, 
  ArrowsPointingOutIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface ProductViewer3DProps {
  product: {
    id: string;
    name: string;
    images: Array<{ url: string; altText: string }>;
    size: string;
    specifications?: {
      dimensions?: { width: number; height: number; depth: number };
      material?: string;
      capacity?: string;
    };
    colors?: string[];
  };
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  enableAR?: boolean;
  enableSounds?: boolean;
}

// Loading component
function Loader() {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg">
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 border-4 border-primary-200 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 border-4 border-primary-500 rounded-full border-t-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900 mb-1">
            Loading 3D Model
          </div>
          <div className="text-xs text-gray-600">
            {Math.round(progress)}% complete
          </div>
        </div>
      </div>
    </Html>
  );
}

// Ice Pack 3D Model Component
function IcePackModel({ 
  product, 
  color = '#0ea5e9',
  autoRotate = true,
  interactive = true 
}: {
  product: ProductViewer3DProps['product'];
  color?: string;
  autoRotate?: boolean;
  interactive?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Get product dimensions or use defaults
  const dimensions = product.specifications?.dimensions || { width: 8, height: 6, depth: 1 };
  const scale = [dimensions.width / 8, dimensions.height / 6, dimensions.depth];

  useFrame((state) => {
    if (autoRotate && meshRef.current && !clicked) {
      meshRef.current.rotation.y += 0.01;
    }
    
    if (hovered && meshRef.current) {
      meshRef.current.scale.setScalar(1.05);
    } else if (meshRef.current) {
      meshRef.current.scale.set(...scale);
    }
  });

  return (
    <group>
      {/* Main Ice Pack Body */}
      <Float
        speed={2}
        rotationIntensity={0.1}
        floatIntensity={0.2}
        floatingRange={[0, 0.1]}
      >
        <mesh
          ref={meshRef}
          scale={scale}
          onClick={() => setClicked(!clicked)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <roundedBoxGeometry args={[1, 1, 0.2, 4, 0.02]} />
          <MeshWobbleMaterial
            color={color}
            transparent
            opacity={0.8}
            factor={0.1}
            speed={2}
            roughness={0.1}
            metalness={0.3}
          />
        </mesh>

        {/* Ice Crystal Effect Inside */}
        <mesh scale={[0.8, 0.8, 0.15]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <MeshDistortMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            distort={0.2}
            speed={3}
            roughness={0}
            metalness={0.8}
          />
        </mesh>

        {/* Alpaca Logo/Emblem */}
        <mesh position={[0, 0, 0.11]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color="#ec4899" transparent opacity={0.9} />
        </mesh>
      </Float>

      {/* Product Name Text */}
      <Text3D
        font="/fonts/helvetiker_regular.typeface.json"
        size={0.08}
        height={0.01}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.01}
        bevelSize={0.01}
        bevelOffset={0}
        bevelSegments={5}
        position={[0, -0.8, 0]}
      >
        {product.name}
        <meshStandardMaterial color="#1e293b" />
      </Text3D>

      {/* Floating Particles Effect */}
      {[...Array(20)].map((_, i) => (
        <Float
          key={i}
          speed={Math.random() * 2 + 1}
          rotationIntensity={Math.random()}
          floatIntensity={Math.random() * 0.5 + 0.1}
          floatingRange={[0, Math.random() * 0.3 + 0.1]}
        >
          <mesh
            position={[
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            ]}
          >
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.6} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

// Camera Controls Component
function CameraControls({ autoRotate }: { autoRotate: boolean }) {
  const { camera } = useThree();
  
  useFrame((state) => {
    if (autoRotate) {
      state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 3;
      state.camera.position.z = Math.cos(state.clock.elapsedTime * 0.3) * 3;
      state.camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

// Lighting Setup
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#0ea5e9" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={0.5}
        intensity={0.5}
        color="#ec4899"
        castShadow
      />
    </>
  );
}

// Main Component
const ProductViewer3D: React.FC<ProductViewer3DProps> = ({
  product,
  className,
  autoRotate = true,
  showControls = true,
  enableAR = false,
  enableSounds = true
}) => {
  const [isPlaying, setIsPlaying] = useState(autoRotate);
  const [soundEnabled, setSoundEnabled] = useState(enableSounds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '#0ea5e9');
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const handleFullscreen = () => {
    if (!isFullscreen) {
      canvasRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Ambient sound effect (for demo - would use actual audio files)
  useEffect(() => {
    if (soundEnabled && isPlaying) {
      // Play subtle ambient cooling sounds
      console.log('Playing ambient cooling sounds...');
    }
  }, [soundEnabled, isPlaying]);

  return (
    <div className={cn("relative w-full aspect-square bg-gradient-to-br from-ice-50 to-primary-50 rounded-2xl overflow-hidden", className)}>
      {/* 3D Canvas */}
      <Canvas
        ref={canvasRef}
        shadows
        camera={{ position: [2, 2, 2], fov: 50 }}
        className="w-full h-full"
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* Environment */}
          <Environment preset="studio" />
          
          {/* Lighting */}
          <Lighting />
          
          {/* 3D Model */}
          <IcePackModel 
            product={product}
            color={selectedColor}
            autoRotate={isPlaying}
          />
          
          {/* Ground Reflection */}
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.3}
            scale={10}
            blur={2}
            far={1}
            color="#0ea5e9"
          />
          
          {/* Camera Controls */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            autoRotate={isPlaying}
            autoRotateSpeed={2}
            minDistance={1.5}
            maxDistance={5}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
          />
          
          <CameraControls autoRotate={isPlaying} />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* Play/Pause */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg hover:bg-white transition-all duration-200"
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </motion.button>

          {/* Sound Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg hover:bg-white transition-all duration-200"
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="h-5 w-5" />
            ) : (
              <SpeakerXMarkIcon className="h-5 w-5" />
            )}
          </motion.button>

          {/* Fullscreen */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleFullscreen}
            className="p-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg hover:bg-white transition-all duration-200"
          >
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </motion.button>

          {/* AR Button (if supported) */}
          {enableAR && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => console.log('AR View activated')}
              className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl shadow-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-200"
            >
              <EyeIcon className="h-5 w-5" />
            </motion.button>
          )}
        </div>
      )}

      {/* Color Picker */}
      {product.colors && product.colors.length > 1 && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {product.colors.map((color, index) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              onClick={() => setSelectedColor(color)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all duration-200",
                selectedColor === color 
                  ? "border-white shadow-lg scale-110" 
                  : "border-gray-300 hover:border-white"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Product Info Overlay */}
      <div className="absolute bottom-4 right-4 max-w-xs">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <h3 className="font-display font-bold text-gray-900 mb-2">
            {product.name}
          </h3>
          
          {product.specifications && (
            <div className="space-y-1 text-sm text-gray-600">
              {product.specifications.capacity && (
                <div>Capacity: {product.specifications.capacity}</div>
              )}
              {product.specifications.material && (
                <div>Material: {product.specifications.material}</div>
              )}
              {product.specifications.dimensions && (
                <div>
                  Dimensions: {product.specifications.dimensions.width}" × {product.specifications.dimensions.height}" × {product.specifications.dimensions.depth}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ice-50 to-primary-50">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <motion.div
                className="absolute inset-0 border-4 border-primary-200 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-1 border-4 border-primary-500 rounded-full border-t-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Loading 3D Model...
            </div>
          </div>
        </div>
      }>
        {/* Canvas content loaded above */}
      </Suspense>
    </div>
  );
};

export { ProductViewer3D };