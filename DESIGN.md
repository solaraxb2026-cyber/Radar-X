# SensorRadar Architecture Design

## 1. High-Level Architecture Summary
**SensorRadar** is built using **Clean Architecture** and **MVVM** (Model-View-ViewModel) patterns to ensure testability and separation of concerns.

- **UI Layer (Jetpack Compose):** A reactive UI that observes states from the ViewModel. It uses `motion` concepts for the radar pulse animations.
- **ViewModel Layer:** Bridges the fusion engine and the UI. It handles state persistence and coordinates sensor lifecycle based on user settings.
- **Domain Layer (Fusion Engine):** The core logic. It processes raw sensor data through a rule-based weighted system to produce a "Confidence Score."
- **Data Layer (Sensors):** Wrappers around Android Hardware APIs (SensorManager, BluetoothLeScanner, AudioRecord).

---

## 2. Proposed File Tree
```text
app/src/main/java/com/example/sensorradar/
├── MainActivity.kt               # Entry point, Permission handling, NavHost
├── ui/
│   ├── RadarScreen.kt            # High-fidelity radar UI with confidence gauge
│   ├── SensorScreen.kt           # Real-time raw data dashboard
│   ├── SettingsScreen.kt         # Sensitivity & Mode configuration
│   └── components/
│       ├── RadarCircle.kt        # Animated pulse component
│       └── SensorIndicator.kt    # Small status icons for active sensors
├── sensors/
│   ├── SensorManagerHelper.kt    # HW Sensor framework wrapper (Accel, Light, Prox)
│   ├── BleScannerHelper.kt       # Bluetooth LE scanning engine
│   └── AcousticDetector.kt       # Microphone-based acoustic/ultrasonic sensing
├── fusion/
│   └── PresenceFusionEngine.kt   # Rule-based scoring engine
├── models/
│   ├── SensorReading.kt          # Data class for individual sensor events
│   └── PresenceState.kt          # Immutable state for the UI (0-100 score)
├── viewmodel/
│   └── RadarViewModel.kt         # Business logic & State holder
└── utils/
    ├── FilterUtils.kt            # Signal smoothing (Low-pass filters)
    └── PermissionsHelper.kt      # Boilerplate for Android runtime permissions
```

---

## 3. Responsibilities of Each Component

### Core Logic
- **MainActivity.kt:** Orchestrates the app startup, initializes the Navigation graph, and handles the "Big 3" permission requests (Location, Bluetooth, Audio).
- **PresenceFusionEngine.kt:**
    - Aggregates inputs from all sensors.
    - Applies **decay logic**: confidence drops if no change occurs over time.
    - Implements **Thresholding**: ignores noise and low-amplitude signals.
    - Calculates the final 0–100 score based on proximity priority.

### Sensor Management
- **SensorManagerHelper.kt:** Listens to built-in hardware. specifically monitors:
    - `Proximity`: Triggered when an object is within ~5cm.
    - `Light`: Monitors sudden drops (occlusion).
    - `Accelerometer/Gyro`: Monitors "Desk Vibrations" caused by nearby movement.
- **BleScannerHelper.kt:** Performs non-connectable scans to count unique device IDs (`RSSI` strength helps estimate distance).
- **AcousticDetector.kt:** Optional high-frequency analysis. Analyzes the noise floor for anomalies consistent with human movement (e.g., shuffling, breathing patterns at close range).

### User Interface
- **RadarViewModel.kt:** Exposes a `StateFlow<PresenceState>` to the Compose layer. It manages the update frequency (e.g., 10Hz for radar feel).
- **RadarScreen.kt:** Uses `Canvas` to draw the 360-degree radar sweep and `Animatable` for the "blips" corresponding to recent detection events.

---

## 4. Permission List (AndroidManifest.xml)
```xml
<!-- Hardware Access -->
<uses-permission android:name="android.permission.BODY_SENSORS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Bluetooth BLE (Nearby detection) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> <!-- Required for BLE results -->

<!-- Acoustic Sensing -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 5. Important Device Compatibility Notes
1. **Sensor Availability:** Not all phones have a Magnetometer or Proximity sensor. The `FusionEngine` must gracefully degrade (e.g., re-weighting BLE higher if Proximity is missing).
2. **Background Limitations:** Android's "Power Management" (Doze Mode) may kill BLE scanning. The app should ideally use a `Foreground Service` if the user wants continuous monitoring.
3. **Ultrasonic Limits:** Speaker/Mic frequency response varies. Ultrasonic mode should be marked as "Experimental" and calibrated for the specific device's hardware limits.
4. **BLE Privacy:** MAC address randomization on modern Android/iOS prevents tracking but still allows "Presence Counting."
