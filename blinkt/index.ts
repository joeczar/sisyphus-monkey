import { Blinkt } from 'blinkt-kit';
const blinkt = new Blinkt();

// Clears all LEDs
export function clearLEDs() {
  blinkt.clear();
  blinkt.show();
}

// Sets LED color based on connection status
export function setConnectionStatus(isConnected: boolean) {
  clearLEDs();
  if (isConnected) {
    // Green for connected
    blinkt.setAll({ r: 0, g: 255, b: 0, brightness: 0.1 });
  } else {
    // Red for disconnected
    blinkt.setAll({ r: 255, g: 0, b: 0, brightness: 0.1 });
  }
  blinkt.show();
}

// Displays progress on LEDs (0 to 100%)
export function showProgress(progress: number) {
  const totalLEDs = 8;
  const ledsToLight = Math.round((progress / 100) * totalLEDs);
  clearLEDs();

  for (let i = 0; i < ledsToLight; i++) {
    // Blue for progress indication
    blinkt.setPixel({ pixel: i, r: 0, g: 0, b: 255, brightness: 0.1 });
  }

  blinkt.show();
}

// Simulate changing connection status and progress
export function simulateOperation() {
  setConnectionStatus(false); // Disconnected
  setTimeout(() => {
    setConnectionStatus(true); // Connected
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress > 100) {
        clearInterval(progressInterval);
        setTimeout(clearLEDs, 2000); // Clear after completion
        return;
      }
      showProgress(progress);
      progress += 10;
    }, 1000);
  }, 3000);
}

