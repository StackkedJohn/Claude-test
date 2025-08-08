class ARService {
  private isWebXRSupported: boolean | null = null;

  // Check if WebXR is supported
  async checkWebXRSupport(): Promise<boolean> {
    if (this.isWebXRSupported !== null) {
      return this.isWebXRSupported;
    }

    try {
      if ('xr' in navigator) {
        const xr = (navigator as any).xr;
        if (xr && typeof xr.isSessionSupported === 'function') {
          this.isWebXRSupported = await xr.isSessionSupported('immersive-ar');
          return this.isWebXRSupported;
        }
      }
    } catch (error) {
      console.warn('WebXR not supported:', error);
    }

    this.isWebXRSupported = false;
    return false;
  }

  // Initialize AR session
  async initializeARSession(): Promise<any> {
    if (!('xr' in navigator)) {
      throw new Error('WebXR not supported');
    }

    const xr = (navigator as any).xr;
    
    try {
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay', 'light-estimation', 'hit-test']
      });

      return session;
    } catch (error) {
      throw new Error(`Failed to initialize AR session: ${error}`);
    }
  }

  // Process image for dimension detection
  async processImageForDimensions(imageData: string): Promise<{
    width: number;
    height: number;
    depth: number;
    confidence: number;
  }> {
    // In production, this would call a computer vision API
    // For now, we'll simulate the processing
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate AI processing with realistic measurements
        const measurements = {
          width: 20 + Math.random() * 30, // 20-50 cm
          height: 15 + Math.random() * 25, // 15-40 cm
          depth: 10 + Math.random() * 20,  // 10-30 cm
          confidence: 0.75 + Math.random() * 0.2 // 75-95% confidence
        };
        
        resolve(measurements);
      }, 1500 + Math.random() * 1000); // 1.5-2.5 second processing time
    });
  }

  // Calculate fit analysis
  calculateFitAnalysis(
    coolerDimensions: { width: number; height: number; depth: number },
    productDimensions: { length: number; width: number; height: number }
  ) {
    // Convert product dimensions from inches to cm
    const productCm = {
      length: productDimensions.length * 2.54,
      width: productDimensions.width * 2.54,
      height: productDimensions.height * 2.54
    };

    // Check each dimension
    const fitsWidth = productCm.width <= coolerDimensions.width;
    const fitsHeight = productCm.height <= coolerDimensions.height;
    const fitsDepth = productCm.length <= coolerDimensions.depth;
    const fits = fitsWidth && fitsHeight && fitsDepth;

    // Calculate space utilization
    const widthUtil = (productCm.width / coolerDimensions.width) * 100;
    const heightUtil = (productCm.height / coolerDimensions.height) * 100;
    const depthUtil = (productCm.length / coolerDimensions.depth) * 100;
    const maxUtilization = Math.max(widthUtil, heightUtil, depthUtil);

    // Generate recommendations
    const recommendations = [];
    
    if (fits) {
      recommendations.push('✅ This ICEPACA pack will fit perfectly in your cooler!');
      
      if (maxUtilization < 60) {
        recommendations.push('💡 You have plenty of extra space. Consider getting multiple packs for extended cooling.');
      } else if (maxUtilization < 80) {
        recommendations.push('💡 Good fit with some room to spare for other items.');
      } else {
        recommendations.push('💡 Snug fit - perfect for maximizing your cooling efficiency.');
      }

      // Suggest other products
      if (maxUtilization < 50) {
        recommendations.push('🛍️ Check out our larger sizes for better space utilization.');
      }
    } else {
      if (!fitsWidth) {
        recommendations.push('❌ Too wide for your cooler. Try our slim-profile packs.');
      }
      if (!fitsHeight) {
        recommendations.push('❌ Too tall for your cooler. Consider our low-profile options.');
      }
      if (!fitsDepth) {
        recommendations.push('❌ Too long for your cooler. Our compact series might work better.');
      }
      
      recommendations.push('🔄 Browse our size guide to find the perfect fit for your cooler.');
    }

    return {
      fits,
      utilization: maxUtilization,
      recommendations,
      dimensionChecks: {
        width: { fits: fitsWidth, utilization: widthUtil },
        height: { fits: fitsHeight, utilization: heightUtil },
        depth: { fits: fitsDepth, utilization: depthUtil }
      }
    };
  }

  // Get camera permissions
  async requestCameraPermissions(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      return stream;
    } catch (error) {
      throw new Error(`Camera access denied: ${error}`);
    }
  }

  // Capture image from video stream
  captureImageFromVideo(video: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  // Validate uploaded image
  validateImage(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('File too large. Please select an image under 10MB.'));
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.'));
        return;
      }

      // Check image dimensions
      const img = new Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          reject(new Error('Image too small. Please select a higher resolution image.'));
          return;
        }
        
        if (img.width > 4000 || img.height > 4000) {
          reject(new Error('Image too large. Please select a smaller image.'));
          return;
        }
        
        resolve(true);
      };
      
      img.onerror = () => {
        reject(new Error('Invalid image file.'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Get device capabilities
  getDeviceCapabilities() {
    const capabilities = {
      hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasWebXR: 'xr' in navigator,
      hasAccelerometer: 'DeviceMotionEvent' in window,
      hasGyroscope: 'DeviceOrientationEvent' in window,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      supportsWebGL: this.checkWebGLSupport()
    };

    return capabilities;
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(gl && gl instanceof WebGLRenderingContext);
    } catch {
      return false;
    }
  }

  // Clean up resources
  cleanup(stream?: MediaStream, session?: any) {
    // Stop video stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // End AR session
    if (session && session.end) {
      session.end();
    }
  }
}

export default new ARService();