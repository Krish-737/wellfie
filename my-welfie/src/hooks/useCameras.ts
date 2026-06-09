import { useCallback, useEffect, useState } from 'react';

export type UseCamerasResult = {
  cameras: MediaDeviceInfo[];
  ready: boolean;
  refresh: () => Promise<MediaDeviceInfo[]>;
};

async function enumerateVideoDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
}

const useCameras = (): UseCamerasResult => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const videoDevices = await enumerateVideoDevices();
      setCameras(videoDevices);
      setReady(true);
      return videoDevices;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // Permission denied or unavailable — still enumerate what we can.
    }

    const videoDevices = await enumerateVideoDevices();
    setCameras(videoDevices);
    setReady(true);
    return videoDevices;
  }, []);

  useEffect(() => {
    void refresh();
    const onDeviceChange = () => {
      void refresh();
    };
    navigator.mediaDevices?.addEventListener('devicechange', onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
    };
  }, [refresh]);

  return { cameras, ready, refresh };
};

export default useCameras;
