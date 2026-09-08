import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface AndroidFile {
  path: string;
  name: string;
  category: 'ui' | 'sensors' | 'fusion' | 'models' | 'root';
  code: string;
}

const ANDROID_SOURCE_FILES: AndroidFile[] = [
  {
    path: 'app/src/main/java/com/example/sensorradar/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'root',
    code: `package com.example.sensorradar

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.sensorradar.ui.RadarScreen
import com.example.sensorradar.ui.SensorScreen
import com.example.sensorradar.ui.SettingsScreen
import com.example.sensorradar.viewmodel.RadarViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: RadarViewModel by viewModels()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        val bleScanGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions[Manifest.permission.BLUETOOTH_SCAN] ?: false
        } else {
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        }
        viewModel.onPermissionsUpdated(recordAudioGranted, bleScanGranted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestAppPermissions()

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val navController = rememberNavController()
                val presenceState by viewModel.presenceState.collectAsState()
                val sensorReadings by viewModel.sensorReadings.collectAsState()
                val fusionConfig by viewModel.fusionConfig.collectAsState()

                // Haptic feedback when alert triggers
                LaunchedEffect(presenceState.alertTriggered) {
                    if (presenceState.alertTriggered && fusionConfig.vibrationAlerts) {
                        triggerVibration()
                    }
                }

                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    NavHost(navController = navController, startDestination = "radar") {
                        composable("radar") {
                            RadarScreen(
                                state = presenceState,
                                onNavigateToSensors = { navController.navigate("sensors") },
                                onNavigateToSettings = { navController.navigate("settings") }
                            )
                        }
                        composable("sensors") {
                            SensorScreen(
                                readings = sensorReadings,
                                onBack = { navController.popBackStack() }
                            )
                        }
                        composable("settings") {
                            SettingsScreen(
                                config = fusionConfig,
                                onConfigChanged = { viewModel.updateConfig(it) },
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf<String>()
        permissions.add(Manifest.permission.RECORD_AUDIO)
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        permissionLauncher.launch(permissions.toTypedArray())
    }

    private fun triggerVibration() {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(150)
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/ui/RadarScreen.kt',
    name: 'RadarScreen.kt',
    category: 'ui',
    code: `package com.example.sensorradar.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sensors
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.sensorradar.models.PresenceState
import kotlin.math.cos
import kotlin.math.sin

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RadarScreen(
    state: PresenceState,
    onNavigateToSensors: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SensorRadar", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onNavigateToSensors) {
                        Icon(Icons.Default.Sensors, contentDescription = "Sensors")
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        },
        containerColor = Color(0xFF020617)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Presence Status Header
            PresenceStatusCard(state)

            // Radar Display
            RadarCanvas(
                confidence = state.confidenceScore,
                modifier = Modifier
                    .size(320.dp)
                    .padding(8.dp)
            )

            // Bottom Metrics Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0F172A))
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                MetricItem("CONFIDENCE", "\${state.confidenceScore}%")
                MetricItem("DOMINANT", state.dominantSensor.uppercase())
                MetricItem("EST. DISTANCE", state.estimatedProximityMeters?.let { "~$it m" } ?: "--")
            }
        }
    }
}

@Composable
fun RadarCanvas(confidence: Int, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "radar")
    
    // Sweep line animation
    val sweepAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2800, easing = LinearEasing)
        ),
        label = "sweep"
    )

    // Pulse ripple duration modulated by confidence score (0-100)
    val pulseDuration = (3200 - (confidence * 20)).coerceIn(1000, 3200)
    val pulseRadiusProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = pulseDuration, easing = FastOutSlowInEasing)
        ),
        label = "pulse"
    )

    val primaryColor = when {
        confidence >= 70 -> Color(0xFFF59E0B) // Amber
        confidence >= 40 -> Color(0xFF10B981) // Emerald
        else -> Color(0xFF06B6D4)             // Cyan
    }

    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2, size.height / 2)
        val maxRadius = size.width / 2 - 16.dp.toPx()

        // Background
        drawCircle(
            color = Color(0xFF0B132B),
            radius = maxRadius,
            center = center
        )

        // Concentric Rings
        val rings = listOf(0.25f, 0.5f, 0.75f, 1.0f)
        rings.forEach { ratio ->
            drawCircle(
                color = Color(0xFF334155),
                radius = maxRadius * ratio,
                center = center,
                style = Stroke(width = 1.5.dp.toPx())
            )
        }

        // Crosshairs
        drawLine(
            color = Color(0xFF475569),
            start = Offset(center.x, center.y - maxRadius),
            end = Offset(center.x, center.y + maxRadius),
            strokeWidth = 1.dp.toPx()
        )
        drawLine(
            color = Color(0xFF475569),
            start = Offset(center.x - maxRadius, center.y),
            end = Offset(center.x + maxRadius, center.y),
            strokeWidth = 1.dp.toPx()
        )

        // Dynamic Expanding Confidence Pulse
        val pulseAlpha = (1f - pulseRadiusProgress) * (0.2f + (confidence / 100f) * 0.7f)
        drawCircle(
            color = primaryColor.copy(alpha = pulseAlpha),
            radius = maxRadius * pulseRadiusProgress,
            center = center,
            style = Stroke(width = 2.5.dp.toPx())
        )

        // Rotating Sweep Line
        val rad = Math.toRadians(sweepAngle.toDouble())
        val sweepEnd = Offset(
            x = (center.x + maxRadius * cos(rad)).toFloat(),
            y = (center.y + maxRadius * sin(rad)).toFloat()
        )
        drawLine(
            color = primaryColor.copy(alpha = 0.85f),
            start = center,
            end = sweepEnd,
            strokeWidth = 2.dp.toPx()
        )

        // Center Point Beacon
        drawCircle(
            color = primaryColor,
            radius = 6.dp.toPx(),
            center = center
        )
        drawCircle(
            color = Color.White,
            radius = 2.5.dp.toPx(),
            center = center
        )
    }
}

@Composable
fun PresenceStatusCard(state: PresenceState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("PRESENCE ESTIMATOR", fontSize = 12.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = state.presenceLevel.name.replace("_", " "),
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = when (state.presenceLevel.name) {
                    "IMMEDIATE" -> Color(0xFFF43F5E)
                    "ELEVATED" -> Color(0xFFF59E0B)
                    "POSSIBLE" -> Color(0xFF06B6D4)
                    else -> Color(0xFF10B981)
                }
            )
        }
    }
}

@Composable
fun MetricItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
        Text(value, fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/fusion/PresenceFusionEngine.kt',
    name: 'PresenceFusionEngine.kt',
    category: 'fusion',
    code: `package com.example.sensorradar.fusion

import com.example.sensorradar.models.PresenceState
import com.example.sensorradar.models.SensorReading
import kotlin.math.max
import kotlin.math.min

class PresenceFusionEngine {

    private var currentConfidence: Float = 0f
    private var lastUpdateTime: Long = System.currentTimeMillis()

    // Configurable Sensor Weights
    var proximityWeight = 0.40f
    var motionWeight = 0.20f
    var bleWeight = 0.15f
    var acousticWeight = 0.15f
    var lightWeight = 0.05f
    var magWeight = 0.05f

    var sensitivity = 1.0f
    var decayRatePerSec = 18f
    var alertThreshold = 70

    fun calculate(readings: Map<String, SensorReading>): PresenceState {
        val now = System.currentTimeMillis()
        val dtSec = max(0.01f, (now - lastUpdateTime) / 1000f)
        lastUpdateTime = now

        var instantaneousSignal = 0f
        val breakdown = mutableMapOf<String, Float>()

        // 1. Proximity Sensor (Strongest immediate near signal)
        readings["proximity"]?.let { prox ->
            if (prox.isAvailable && prox.isNear) {
                val score = 100f * proximityWeight * sensitivity
                breakdown["proximity"] = score
                instantaneousSignal += score
            }
        }

        // 2. Accelerometer & Gyroscope Motion Delta
        readings["accelerometer"]?.let { accel ->
            if (accel.isAvailable) {
                val motionFactor = min(100f, (accel.motionDelta / 2.5f) * 100f)
                val score = motionFactor * motionWeight * sensitivity
                breakdown["accelerometer"] = score
                instantaneousSignal += score
            }
        }

        // 3. BLE Proximity (Device count + RSSI signal)
        readings["ble"]?.let { ble ->
            if (ble.isAvailable && ble.bleCount > 0) {
                val rssiFactor = max(0f, min(100f, (ble.strongestRssi + 95f) * 1.8f))
                val score = rssiFactor * bleWeight * sensitivity
                breakdown["ble"] = score
                instantaneousSignal += score
            }
        }

        // 4. Acoustic / Noise Floor Anomaly
        readings["acoustic"]?.let { acoustic ->
            if (acoustic.isAvailable) {
                val score = acoustic.anomalyScore * acousticWeight * sensitivity
                breakdown["acoustic"] = score
                instantaneousSignal += score
            }
        }

        // 5. Light Sensor Sudden Occlusion
        readings["light"]?.let { light ->
            if (light.isAvailable && light.isOccluded) {
                val score = 75f * lightWeight * sensitivity
                breakdown["light"] = score
                instantaneousSignal += score
            }
        }

        // Temporal Attack and Decay Smoothing
        if (instantaneousSignal > currentConfidence) {
            currentConfidence += (instantaneousSignal - currentConfidence) * min(1f, dtSec * 8f)
        } else {
            currentConfidence = max(0f, currentConfidence - (decayRatePerSec * dtSec))
        }

        val finalScore = currentConfidence.toInt().coerceIn(0, 100)

        val dominant = breakdown.maxByOrNull { it.value }?.key ?: "none"
        val alert = finalScore >= alertThreshold

        val estimatedMeters = if (finalScore > 10) {
            max(0.1f, 4.0f - (finalScore / 100f) * 3.7f)
        } else null

        return PresenceState(
            confidenceScore = finalScore,
            presenceLevel = when {
                finalScore >= 80 -> PresenceState.Level.IMMEDIATE
                finalScore >= 55 -> PresenceState.Level.ELEVATED
                finalScore >= 25 -> PresenceState.Level.POSSIBLE
                else -> PresenceState.Level.CLEAR
            },
            dominantSensor = dominant,
            alertTriggered = alert,
            estimatedProximityMeters = estimatedMeters
        )
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/sensors/SensorManagerHelper.kt',
    name: 'SensorManagerHelper.kt',
    category: 'sensors',
    code: `package com.example.sensorradar.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.example.sensorradar.models.SensorReading
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.abs
import kotlin.math.sqrt

class SensorManagerHelper(context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager

    private val _proximityReading = MutableStateFlow(SensorReading(type = "proximity", isAvailable = false))
    val proximityReading: StateFlow<SensorReading> = _proximityReading

    private val _accelReading = MutableStateFlow(SensorReading(type = "accelerometer", isAvailable = false))
    val accelReading: StateFlow<SensorReading> = _accelReading

    private val _lightReading = MutableStateFlow(SensorReading(type = "light", isAvailable = false))
    val lightReading: StateFlow<SensorReading> = _lightReading

    private var lastAccelMagnitude = 9.8f
    private var lastLux = 300f

    fun startListening() {
        sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            _proximityReading.value = _proximityReading.value.copy(isAvailable = true)
        }
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            _accelReading.value = _accelReading.value.copy(isAvailable = true)
        }
        sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            _lightReading.value = _lightReading.value.copy(isAvailable = true)
        }
    }

    fun stopListening() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_PROXIMITY -> {
                val distance = event.values[0]
                val maxRange = event.sensor.maximumRange
                val isNear = distance < maxRange && distance < 5f
                _proximityReading.value = SensorReading(
                    type = "proximity",
                    isAvailable = true,
                    isNear = isNear,
                    proximityDistanceCm = distance
                )
            }
            Sensor.TYPE_ACCELEROMETER -> {
                val x = event.values[0]
                val y = event.values[1]
                val z = event.values[2]
                val mag = sqrt(x * x + y * y + z * z)
                val delta = abs(mag - lastAccelMagnitude)
                lastAccelMagnitude = mag

                _accelReading.value = SensorReading(
                    type = "accelerometer",
                    isAvailable = true,
                    motionDelta = delta,
                    accelX = x, accelY = y, accelZ = z
                )
            }
            Sensor.TYPE_LIGHT -> {
                val lux = event.values[0]
                val delta = lastLux - lux
                val occluded = lux < 10f && delta > 50f
                lastLux = lux

                _lightReading.value = SensorReading(
                    type = "light",
                    isAvailable = true,
                    lux = lux,
                    isOccluded = occluded
                )
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/sensors/BleScannerHelper.kt',
    name: 'BleScannerHelper.kt',
    category: 'sensors',
    code: `package com.example.sensorradar.sensors

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import com.example.sensorradar.models.SensorReading
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class BleScannerHelper(private val context: Context) {

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val adapter: BluetoothAdapter? = bluetoothManager?.adapter
    private val scanner get() = adapter?.bluetoothLeScanner

    private val _bleReading = MutableStateFlow(SensorReading(type = "ble", isAvailable = false))
    val bleReading: StateFlow<SensorReading> = _bleReading

    private val detectedDevices = mutableMapOf<String, Int>()

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val address = result.device.address
            val rssi = result.rssi
            detectedDevices[address] = rssi

            val maxRssi = detectedDevices.values.maxOrNull() ?: -95
            _bleReading.value = SensorReading(
                type = "ble",
                isAvailable = true,
                bleCount = detectedDevices.size,
                strongestRssi = maxRssi
            )
        }
    }

    @SuppressLint("MissingPermission")
    fun startScan() {
        if (adapter == null || !adapter.isEnabled || scanner == null) {
            _bleReading.value = SensorReading(type = "ble", isAvailable = false)
            return
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        try {
            scanner?.startScan(null, settings, scanCallback)
            _bleReading.value = _bleReading.value.copy(isAvailable = true)
        } catch (e: SecurityException) {
            _bleReading.value = SensorReading(type = "ble", isAvailable = false)
        }
    }

    @SuppressLint("MissingPermission")
    fun stopScan() {
        try {
            scanner?.stopScan(scanCallback)
        } catch (e: Exception) {}
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/sensors/AcousticDetector.kt',
    name: 'AcousticDetector.kt',
    category: 'sensors',
    code: `package com.example.sensorradar.sensors

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import com.example.sensorradar.models.SensorReading
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.abs
import kotlin.math.log10

class AcousticDetector {

    private val _acousticReading = MutableStateFlow(SensorReading(type = "acoustic", isAvailable = false))
    val acousticReading: StateFlow<SensorReading> = _acousticReading

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    @SuppressLint("MissingPermission")
    fun start() {
        val sampleRate = 44100
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                _acousticReading.value = SensorReading(type = "acoustic", isAvailable = false)
                return
            }

            audioRecord?.startRecording()
            _acousticReading.value = _acousticReading.value.copy(isAvailable = true)

            recordingJob = scope.launch {
                val buffer = ShortArray(bufferSize)
                var ambientBaselineDb = -60f

                while (isActive) {
                    val readCount = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (readCount > 0) {
                        var sum = 0.0
                        for (i in 0 until readCount) {
                            sum += abs(buffer[i].toInt())
                        }
                        val avg = sum / readCount
                        val db = (20 * log10(avg / 32767.0)).toFloat().coerceIn(-90f, 0f)

                        // Anomaly score based on rise over background ambient
                        val diff = (db - ambientBaselineDb).coerceAtLeast(0f)
                        val anomaly = (diff * 4f).coerceIn(0f, 100f)

                        // Slow baseline tracking
                        ambientBaselineDb += (db - ambientBaselineDb) * 0.05f

                        _acousticReading.value = SensorReading(
                            type = "acoustic",
                            isAvailable = true,
                            soundLevelDb = db,
                            anomalyScore = anomaly
                        )
                    }
                    delay(100)
                }
            }
        } catch (e: Exception) {
            _acousticReading.value = SensorReading(type = "acoustic", isAvailable = false)
        }
    }

    fun stop() {
        recordingJob?.cancel()
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {}
        audioRecord = null
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/models/PresenceState.kt',
    name: 'PresenceState.kt',
    category: 'models',
    code: `package com.example.sensorradar.models

data class PresenceState(
    val confidenceScore: Int = 0,
    val presenceLevel: Level = Level.CLEAR,
    val dominantSensor: String = "none",
    val alertTriggered: Boolean = false,
    val estimatedProximityMeters: Float? = null,
    val timestamp: Long = System.currentTimeMillis()
) {
    enum class Level {
        CLEAR,
        POSSIBLE,
        ELEVATED,
        IMMEDIATE
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/sensorradar/models/SensorReading.kt',
    name: 'SensorReading.kt',
    category: 'models',
    code: `package com.example.sensorradar.models

data class SensorReading(
    val type: String,
    val isAvailable: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    
    // Proximity
    val isNear: Boolean = false,
    val proximityDistanceCm: Float = 5.0f,
    
    // Motion / Accelerometer
    val motionDelta: Float = 0f,
    val accelX: Float = 0f,
    val accelY: Float = 0f,
    val accelZ: Float = 9.8f,
    
    // Light
    val lux: Float = 300f,
    val isOccluded: Boolean = false,
    
    // BLE
    val bleCount: Int = 0,
    val strongestRssi: Int = -95,
    
    // Acoustic
    val soundLevelDb: Float = -65f,
    val anomalyScore: Float = 0f
)`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'root',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.sensorradar">

    <!-- Non-camera hardware sensor and alert permissions -->
    <uses-permission android:name="android.permission.BODY_SENSORS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- Bluetooth LE Scanning for presence estimation -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
        android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <!-- Optional Hardware Features -->
    <uses-feature android:name="android.hardware.sensor.proximity" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.accelerometer" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.light" android:required="false" />
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="SensorRadar"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@android:style/Theme.Material.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  }
];

export const AndroidCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_SOURCE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Android Studio Production Codebase (Kotlin + Jetpack Compose)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full modular Kotlin implementation of SensorRadar with zero camera access.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied File!' : 'Copy Code'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Sidebar File Explorer */}
        <div className="md:col-span-4 border-r border-slate-800/80 bg-slate-950/80 p-3 space-y-1">
          <div className="text-[11px] font-mono font-bold text-slate-400 px-2 py-1 tracking-wider uppercase">
            Project Tree
          </div>

          {ANDROID_SOURCE_FILES.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between gap-2 ${
                selectedFile.path === file.path
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <span className="truncate">{file.name}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans">{file.category}</span>
            </button>
          ))}

          {/* Quick Android Studio instructions */}
          <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Running in Android Studio</span>
            </div>
            <p className="text-[11px]">
              1. Create a "Empty Activity (Compose)" project in Android Studio.
            </p>
            <p className="text-[11px]">
              2. Add these files to <code className="text-cyan-300">com.example.sensorradar</code>.
            </p>
            <p className="text-[11px]">
              3. Run on physical device for real sensor fusion.
            </p>
          </div>
        </div>

        {/* Code Content View */}
        <div className="md:col-span-8 bg-slate-950 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[600px] overflow-y-auto">
          <div className="text-[11px] text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
            <span>{selectedFile.path}</span>
            <span className="text-emerald-400">Kotlin / XML</span>
          </div>
          <pre className="text-slate-200">
            <code>{selectedFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
