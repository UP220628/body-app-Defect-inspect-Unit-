'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button } from './Button';
import { Modal } from './Modal';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const BarcodeScanner = ({ isOpen, onClose, onScan, title = 'Escanear Código de Barras' }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen && !codeReader) {
      const reader = new BrowserMultiFormatReader();
      setCodeReader(reader);
    }
  }, [isOpen, codeReader]);

  useEffect(() => {
    if (isOpen && codeReader && videoRef.current && !isScanning) {
      startScanning();
    }

    return () => {
      if (codeReader) {
        codeReader.reset();
      }
    };
  }, [isOpen, codeReader]);

  const startScanning = async () => {
    if (!codeReader || !videoRef.current || isScanning) return;

    setIsScanning(true);
    setError(null);

    try {
      // Obtener dispositivos de video disponibles
      const videoInputDevices = await codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setError('No se encontró ninguna cámara');
        setIsScanning(false);
        return;
      }

      // Buscar preferentemente la cámara trasera
      // En dispositivos móviles, buscar labels que contengan "back", "rear" o "environment"
      let selectedDeviceId = videoInputDevices[0].deviceId;
      
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('trasera')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      } else if (videoInputDevices.length > 1) {
        // Si no encontramos por etiqueta, usar la última cámara
        // En móviles, la última suele ser la trasera
        selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
      }

      // Iniciar escaneo continuo
      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            onScan(code);
            handleClose();
          }
          
          if (error && !(error instanceof NotFoundException)) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Error scanning');
            }
          }
        }
      );
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error al iniciar el escáner');
      }
      setError(err.message || 'Error al acceder a la cámara');
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    if (codeReader) {
      codeReader.reset();
    }
    setIsScanning(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <Button onClick={handleClose} variant="secondary">
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay con guía de escaneo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-green-500 rounded-lg w-64 h-32 opacity-50">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
            </div>
          </div>

          {/* Estado de carga */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Iniciando cámara...</p>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div className="text-white text-center p-4">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-semibold mb-2">Error al acceder a la cámara</p>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">Instrucciones:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Coloca el código de barras frente a la cámara</li>
            <li>• Mantén el código dentro del marco verde</li>
            <li>• Asegúrate de tener buena iluminación</li>
            <li>• El escaneo es automático al detectar el código</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
