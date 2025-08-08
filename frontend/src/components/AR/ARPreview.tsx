import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CameraIcon,
  PhotoIcon,
  ArrowPathIcon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface Product {
  _id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  image: string;
  price: number;
}

interface ARPreviewProps {
  product: Product;
  onClose: () => void;
  isOpen: boolean;
}

interface ARMeasurement {
  width: number;
  height: number;
  depth: number;
  confidence: number;
}

interface FitAnalysis {
  fits: boolean;
  confidence: number;
  recommendations: string[];
  measurements: {
    coolerSpace: ARMeasurement;
    productSize: {
      length: number;
      width: number;
      height: number;
    };
    fitPercentage: number;
  };
}

const ARPreview: React.FC<ARPreviewProps> = ({ product, onClose, isOpen }) => {
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'upload' | 'measuring' | 'analysis' | 'result'>('intro');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [arMeasurement, setArMeasurement] = useState<ARMeasurement | null>(null);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check AR support on mount
  useEffect(() => {
    checkARSupport();
  }, []);

  const checkARSupport = async () => {
    try {
      // Check for WebXR support
      if ('xr' in navigator) {
        const xr = (navigator as any).xr;
        if (xr && typeof xr.isSessionSupported === 'function') {
          const supported = await xr.isSessionSupported('immersive-ar');
          setArSupported(supported);
          return;
        }
      }

      // Fallback to check for MediaDevices (camera access)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setArSupported(true);
      } else {
        setArSupported(false);
      }
    } catch (error) {
      console.error('Error checking AR support:', error);
      setArSupported(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!privacyConsent) {
      setError('Please accept the privacy policy before uploading images');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      setCurrentStep('measuring');
      processImageForMeasurement(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const startCameraCapture = async () => {
    if (!privacyConsent) {
      setError('Please accept the privacy policy before using the camera');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use rear camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCurrentStep('measuring');
      }
    } catch (error) {
      setError('Could not access camera. Please upload an image instead.');
      console.error('Camera access error:', error);
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageUrl = canvas.toDataURL('image/jpeg');
      setUploadedImage(imageUrl);
      
      // Stop video stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      
      processImageForMeasurement(imageUrl);
    }
  };

  const processImageForMeasurement = async (imageUrl: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Simulate AI-powered measurement analysis
      // In production, this would call a computer vision API
      await simulateImageProcessing();
      
      const mockMeasurement: ARMeasurement = {
        width: 25 + Math.random() * 10, // Simulate cooler width in cm
        height: 20 + Math.random() * 10, // Simulate cooler height in cm
        depth: 15 + Math.random() * 8, // Simulate cooler depth in cm
        confidence: 0.85 + Math.random() * 0.1 // Confidence score
      };

      setArMeasurement(mockMeasurement);
      setCurrentStep('analysis');
      
      // Perform fit analysis
      performFitAnalysis(mockMeasurement);
      
    } catch (error) {
      setError('Failed to process image. Please try again.');
      console.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateImageProcessing = () => {
    return new Promise(resolve => setTimeout(resolve, 2000));
  };

  const performFitAnalysis = (coolerMeasurement: ARMeasurement) => {
    const productDims = product.dimensions;
    
    // Convert product dimensions from inches to cm (assuming product dims are in inches)
    const productCm = {
      length: productDims.length * 2.54,
      width: productDims.width * 2.54,
      height: productDims.height * 2.54
    };

    // Check if product fits in cooler
    const fitsWidth = productCm.width <= coolerMeasurement.width;
    const fitsHeight = productCm.height <= coolerMeasurement.height;
    const fitsDepth = productCm.length <= coolerMeasurement.depth;
    const fits = fitsWidth && fitsHeight && fitsDepth;

    // Calculate fit percentage
    const widthFit = (productCm.width / coolerMeasurement.width) * 100;
    const heightFit = (productCm.height / coolerMeasurement.height) * 100;
    const depthFit = (productCm.length / coolerMeasurement.depth) * 100;
    const fitPercentage = Math.max(widthFit, heightFit, depthFit);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (fits) {
      recommendations.push('✅ Perfect fit! This ice pack will fit comfortably in your cooler.');
      if (fitPercentage < 70) {
        recommendations.push('💡 You have extra space - consider getting multiple packs or a larger size.');
      }
    } else {
      if (!fitsWidth) recommendations.push('❌ Width too large - consider a smaller size.');
      if (!fitsHeight) recommendations.push('❌ Height too large - consider a thinner pack.');
      if (!fitsDepth) recommendations.push('❌ Length too large - consider a shorter pack.');
      recommendations.push('🔄 Try our smaller sizes or check out our flexible packs that conform to space.');
    }

    const analysis: FitAnalysis = {
      fits,
      confidence: coolerMeasurement.confidence,
      recommendations,
      measurements: {
        coolerSpace: coolerMeasurement,
        productSize: productCm,
        fitPercentage: Math.min(fitPercentage, 100)
      }
    };

    setFitAnalysis(analysis);
    setCurrentStep('result');
  };

  const resetAR = () => {
    setCurrentStep('intro');
    setUploadedImage(null);
    setArMeasurement(null);
    setFitAnalysis(null);
    setError(null);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">AR Fit Preview</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* AR Support Check */}
            {arSupported === false && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      AR features may be limited on your device. You can still upload photos for size analysis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Consent */}
            {currentStep === 'intro' && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">How AR Fit Preview Works:</p>
                      <ul className="space-y-1">
                        <li>• Upload a photo of your cooler or use your camera</li>
                        <li>• Our AI measures the internal dimensions</li>
                        <li>• We calculate if your ICEPACA pack will fit perfectly</li>
                        <li>• Get personalized size recommendations</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="privacy-consent"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="privacy-consent" className="text-sm text-gray-700">
                    I consent to ICEPACA processing my uploaded images for size analysis. Images are processed locally when possible and deleted after analysis. 
                    <a href="/privacy" className="text-blue-600 hover:text-blue-800 ml-1">View Privacy Policy</a>
                  </label>
                </div>
              </div>
            )}

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {currentStep === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <div className="mb-6">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                    />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Dimensions: {product.dimensions.length}" × {product.dimensions.width}" × {product.dimensions.height}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!privacyConsent}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PhotoIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Upload Photo</span>
                      <span className="text-xs text-gray-500 mt-1">Choose from gallery</span>
                    </button>

                    <button
                      onClick={startCameraCapture}
                      disabled={!privacyConsent || !arSupported}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CameraIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Use Camera</span>
                      <span className="text-xs text-gray-500 mt-1">Take photo now</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </motion.div>
              )}

              {currentStep === 'measuring' && (
                <motion.div
                  key="measuring"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  {uploadedImage ? (
                    <div>
                      <img
                        src={uploadedImage}
                        alt="Uploaded cooler"
                        className="max-w-full h-64 object-cover rounded-lg mx-auto mb-4"
                      />
                    </div>
                  ) : (
                    <div>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="max-w-full h-64 rounded-lg mx-auto mb-4"
                      />
                      <button
                        onClick={captureFromVideo}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Capture Photo
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="mt-6">
                      <div className="flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Analyzing image and measuring dimensions...
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 'analysis' && arMeasurement && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Detected Measurements</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{arMeasurement.width.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Width (cm)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{arMeasurement.height.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Height (cm)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{arMeasurement.depth.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Depth (cm)</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        Confidence: {Math.round(arMeasurement.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-sm text-gray-600">Calculating fit compatibility...</p>
                  </div>
                </motion.div>
              )}

              {currentStep === 'result' && fitAnalysis && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="text-center mb-6">
                    {fitAnalysis.fits ? (
                      <div className="flex items-center justify-center text-green-600 mb-2">
                        <CheckCircleIcon className="h-8 w-8 mr-2" />
                        <span className="text-xl font-bold">Perfect Fit!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-red-600 mb-2">
                        <XMarkIcon className="h-8 w-8 mr-2" />
                        <span className="text-xl font-bold">Won't Fit</span>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 mb-2">Space Usage</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            fitAnalysis.fits ? "bg-green-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(fitAnalysis.measurements.fitPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {fitAnalysis.measurements.fitPercentage.toFixed(1)}% of available space
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {fitAnalysis.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          rec.startsWith('✅') ? "bg-green-50 text-green-800" :
                          rec.startsWith('❌') ? "bg-red-50 text-red-800" :
                          rec.startsWith('💡') ? "bg-blue-50 text-blue-800" :
                          "bg-gray-50 text-gray-800"
                        )}
                      >
                        {rec}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <p className="font-medium">Your Cooler</p>
                        <p>{fitAnalysis.measurements.coolerSpace.width.toFixed(1)} × {fitAnalysis.measurements.coolerSpace.height.toFixed(1)} × {fitAnalysis.measurements.coolerSpace.depth.toFixed(1)} cm</p>
                      </div>
                      <div>
                        <p className="font-medium">ICEPACA Pack</p>
                        <p>{fitAnalysis.measurements.productSize.width.toFixed(1)} × {fitAnalysis.measurements.productSize.height.toFixed(1)} × {fitAnalysis.measurements.productSize.length.toFixed(1)} cm</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={resetAR}
                      className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Try Another Photo
                    </button>
                    {fitAnalysis.fits && (
                      <button
                        onClick={onClose}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ARPreview;