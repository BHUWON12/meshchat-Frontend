package com.yourcompany.meshchat

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pDeviceList
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.*
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors

class WifiDirectModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val TAG = "WifiDirectModule"
    private lateinit var manager: WifiP2pManager
    private lateinit var channel: WifiP2pManager.Channel
    private var isHost = false
    private var serverSocket: ServerSocket? = null
    private var clientSocket: Socket? = null
    private var outputStream: PrintWriter? = null
    private var inputStream: BufferedReader? = null
    private val executor = Executors.newCachedThreadPool()
    
    // Permission and status tracking
    private var hasLocationPermission = false
    private var isWifiEnabled = false
    private var isLocationEnabled = false
    private var isWifiDirectSupported = false
    
    // Callback interfaces
    private val peerListListener = WifiP2pManager.PeerListListener { peerList ->
        val devices = peerList.deviceList
        val deviceList = Arguments.createArray()
        
        for (device in devices) {
            val deviceInfo = Arguments.createMap().apply {
                putString("deviceName", device.deviceName)
                putString("deviceAddress", device.deviceAddress)
                putString("status", getDeviceStatus(device.status))
            }
            deviceList.pushMap(deviceInfo)
        }
        
        sendEvent("onPeersDiscovered", deviceList)
    }
    
    private val connectionInfoListener = WifiP2pManager.ConnectionInfoListener { info ->
        if (info.groupFormed) {
            if (info.isGroupOwner) {
                // This device is the host (server)
                isHost = true
                startServer()
            } else {
                // This device is the client
                isHost = false
                connectToHost(info.groupOwnerAddress.hostAddress)
            }
        }
    }
    
    private val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let { safeIntent ->
                when (safeIntent.action ?: "") {
                    WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
                        val state = safeIntent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1)
                        if (state == WifiP2pManager.WIFI_P2P_STATE_ENABLED) {
                            isWifiDirectSupported = true
                            sendEvent("onWifiDirectEnabled", null)
                        } else {
                            isWifiDirectSupported = false
                            sendEvent("onWifiDirectDisabled", null)
                        }
                    }
                    WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                        manager.requestPeers(channel, peerListListener)
                    }
                    "android.net.wifi.p2p.CONNECTION_STATE_CHANGE" -> {
                        val networkInfo = safeIntent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO, android.net.NetworkInfo::class.java)
                        if (networkInfo?.isConnected == true) {
                            manager.requestConnectionInfo(channel, connectionInfoListener)
                        } else {
                            sendEvent("onConnectionLost", null)
                        }
                    }
                    WifiManager.WIFI_STATE_CHANGED_ACTION -> {
                        checkWifiStatus()
                    }
                    LocationManager.PROVIDERS_CHANGED_ACTION -> {
                        checkLocationStatus()
                    }
                }
            }
        }
    }
    
    override fun getName(): String = "WifiDirectModule"
    
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            manager = reactApplicationContext.getSystemService(Context.WIFI_P2P_SERVICE) as WifiP2pManager
            channel = manager.initialize(reactApplicationContext, reactApplicationContext.mainLooper, null)
            
            val intentFilter = IntentFilter().apply {
                addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
                addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
                addAction("android.net.wifi.p2p.CONNECTION_STATE_CHANGE")
                addAction(WifiManager.WIFI_STATE_CHANGED_ACTION)
                addAction(LocationManager.PROVIDERS_CHANGED_ACTION)
            }
            reactApplicationContext.registerReceiver(broadcastReceiver, intentFilter)
            
            // Check initial status
            checkWifiStatus()
            checkLocationStatus()
            checkLocationPermission()
            checkWifiDirectSupport()
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Failed to initialize Wi-Fi Direct", e)
        }
    }
    
    @ReactMethod
    fun checkWifiStatus(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            isWifiEnabled = wifiManager.isWifiEnabled
            
            val result = Arguments.createMap().apply {
                putBoolean("isEnabled", isWifiEnabled)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("WIFI_CHECK_ERROR", "Failed to check Wi-Fi status", e)
        }
    }
    
    @ReactMethod
    fun enableWifi(promise: Promise) {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiManager.isWifiEnabled = true
            isWifiEnabled = true
            sendEvent("onWifiEnabled", null)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIFI_ENABLE_ERROR", "Failed to enable Wi-Fi", e)
        }
    }
    
    @ReactMethod
    fun openWifiSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIFI_SETTINGS_ERROR", "Failed to open Wi-Fi settings", e)
        }
    }
    
    @ReactMethod
    fun checkLocationPermission(promise: Promise) {
        try {
            val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Manifest.permission.ACCESS_FINE_LOCATION
            } else {
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
            
            hasLocationPermission = ContextCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED
            
            val result = Arguments.createMap().apply {
                putBoolean("hasPermission", hasLocationPermission)
                putString("permission", permission)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check location permission", e)
        }
    }
    
    @ReactMethod
    fun checkLocationStatus(promise: Promise) {
        try {
            val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            isLocationEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) || 
                               locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            
            val result = Arguments.createMap().apply {
                putBoolean("isEnabled", isLocationEnabled)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LOCATION_CHECK_ERROR", "Failed to check location status", e)
        }
    }
    
    @ReactMethod
    fun openLocationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LOCATION_SETTINGS_ERROR", "Failed to open location settings", e)
        }
    }
    
    @ReactMethod
    fun checkWifiDirectSupport(promise: Promise) {
        try {
            isWifiDirectSupported = reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)
            
            val result = Arguments.createMap().apply {
                putBoolean("isSupported", isWifiDirectSupported)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("WIFI_DIRECT_CHECK_ERROR", "Failed to check Wi-Fi Direct support", e)
        }
    }
    
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val status = Arguments.createMap().apply {
                putBoolean("hasLocationPermission", hasLocationPermission)
                putBoolean("isWifiEnabled", isWifiEnabled)
                putBoolean("isLocationEnabled", isLocationEnabled)
                putBoolean("isWifiDirectSupported", isWifiDirectSupported)
            }
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get status", e)
        }
    }
    
    @ReactMethod
    fun startDiscovery(promise: Promise) {
        // Check all requirements before starting discovery
        if (!hasLocationPermission) {
            promise.reject("NO_PERMISSION", "Location permission required")
            return
        }
        
        if (!isWifiEnabled) {
            promise.reject("WIFI_DISABLED", "Wi-Fi must be enabled")
            return
        }
        
        if (!isLocationEnabled) {
            promise.reject("LOCATION_DISABLED", "Location services must be enabled")
            return
        }
        
        if (!isWifiDirectSupported) {
            promise.reject("WIFI_DIRECT_UNSUPPORTED", "Wi-Fi Direct not supported on this device")
            return
        }
        
        manager.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                sendEvent("onDiscoveryStarted", null)
                promise.resolve(true)
            }
            
            override fun onFailure(reasonCode: Int) {
                promise.reject("DISCOVERY_ERROR", "Failed to start discovery")
            }
        })
    }
    
    @ReactMethod
    fun connectToDevice(deviceAddress: String, promise: Promise) {
        val config = WifiP2pConfig().apply {
            this.deviceAddress = deviceAddress
        }
        
        manager.connect(channel, config, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                sendEvent("onConnectionRequested", null)
                promise.resolve(true)
            }
            
            override fun onFailure(reasonCode: Int) {
                promise.reject("CONNECTION_ERROR", "Failed to connect to device")
            }
        })
    }
    
    @ReactMethod
    fun disconnect(promise: Promise) {
        manager.removeGroup(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                cleanup()
                sendEvent("onDisconnected", null)
                promise.resolve(true)
            }
            
            override fun onFailure(reasonCode: Int) {
                promise.reject("DISCONNECT_ERROR", "Failed to disconnect")
            }
        })
    }
    
    @ReactMethod
    fun sendMessage(message: String, promise: Promise) {
        if (outputStream != null) {
            try {
                outputStream?.println(message)
                outputStream?.flush()
                sendEvent("onMessageSent", message)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SEND_ERROR", "Failed to send message", e)
            }
        } else {
            promise.reject("NOT_CONNECTED", "Not connected to any device")
        }
    }
    
    private fun startServer() {
        executor.execute {
            try {
                serverSocket = ServerSocket(8888)
                sendEvent("onServerStarted", "Server started on port 8888")
                
                while (true) {
                    val client = serverSocket?.accept() ?: break
                    handleClientConnection(client)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server error: ${e.message}")
                sendEvent("onServerError", e.message)
            }
        }
    }
    
    private fun connectToHost(hostAddress: String) {
        executor.execute {
            try {
                clientSocket = Socket()
                clientSocket?.connect(InetSocketAddress(hostAddress, 8888), 5000)
                setupStreams()
                sendEvent("onConnectedToHost", hostAddress)
            } catch (e: Exception) {
                Log.e(TAG, "Client connection error: ${e.message}")
                sendEvent("onConnectionError", e.message)
            }
        }
    }
    
    private fun handleClientConnection(client: Socket) {
        executor.execute {
            try {
                setupStreams(client)
                sendEvent("onClientConnected", client.inetAddress.hostAddress)
                
                // Listen for messages from client
                var message: String?
                while (inputStream?.readLine().also { message = it } != null) {
                    sendEvent("onMessageReceived", message)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Client handling error: ${e.message}")
            } finally {
                client.close()
            }
        }
    }
    
    private fun setupStreams(socket: Socket = clientSocket ?: throw IllegalStateException("Client socket is null")) {
        outputStream = PrintWriter(socket.getOutputStream(), true)
        inputStream = BufferedReader(InputStreamReader(socket.getInputStream()))
        
        // Start listening for messages
        executor.execute {
            try {
                var message: String?
                while (inputStream?.readLine().also { message = it } != null) {
                    sendEvent("onMessageReceived", message)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Message listening error: ${e.message}")
            }
        }
    }
    
    private fun cleanup() {
        try {
            outputStream?.close()
            inputStream?.close()
            clientSocket?.close()
            serverSocket?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Cleanup error: ${e.message}")
        }
        
        outputStream = null
        inputStream = null
        clientSocket = null
        serverSocket = null
    }
    
    private fun checkWifiStatus() {
        try {
            val wifiManager = reactApplicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wasEnabled = isWifiEnabled
            isWifiEnabled = wifiManager.isWifiEnabled
            
            if (wasEnabled != isWifiEnabled) {
                if (isWifiEnabled) {
                    sendEvent("onWifiEnabled", null)
                } else {
                    sendEvent("onWifiDisabled", null)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Wi-Fi status: ${e.message}")
        }
    }
    
    private fun checkLocationStatus() {
        try {
            val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val wasEnabled = isLocationEnabled
            isLocationEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) || 
                               locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            
            if (wasEnabled != isLocationEnabled) {
                if (isLocationEnabled) {
                    sendEvent("onLocationEnabled", null)
                } else {
                    sendEvent("onLocationDisabled", null)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking location status: ${e.message}")
        }
    }
    
    private fun checkLocationPermission() {
        try {
            val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Manifest.permission.ACCESS_FINE_LOCATION
            } else {
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
            
            val wasGranted = hasLocationPermission
            hasLocationPermission = ContextCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED
            
            if (wasGranted != hasLocationPermission) {
                if (hasLocationPermission) {
                    sendEvent("onLocationPermissionGranted", null)
                } else {
                    sendEvent("onLocationPermissionDenied", null)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking location permission: ${e.message}")
        }
    }
    
    private fun checkWifiDirectSupport() {
        try {
            val wasSupported = isWifiDirectSupported
            isWifiDirectSupported = reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)
            
            if (wasSupported != isWifiDirectSupported) {
                if (isWifiDirectSupported) {
                    sendEvent("onWifiDirectSupported", null)
                } else {
                    sendEvent("onWifiDirectUnsupported", null)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Wi-Fi Direct support: ${e.message}")
        }
    }
    
    private fun getDeviceStatus(status: Int): String {
        return when (status) {
            WifiP2pDevice.AVAILABLE -> "AVAILABLE"
            WifiP2pDevice.INVITED -> "INVITED"
            WifiP2pDevice.CONNECTED -> "CONNECTED"
            WifiP2pDevice.FAILED -> "FAILED"
            WifiP2pDevice.UNAVAILABLE -> "UNAVAILABLE"
            else -> "UNKNOWN"
        }
    }
    
    private fun sendEvent(eventName: String, data: Any?) {
        val params = Arguments.createMap().apply {
            putString("type", eventName)
            when (data) {
                is String -> putString("data", data)
                is ReadableArray -> putArray("data", data)
                else -> putNull("data")
            }
        }
        
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("WifiDirectEvent", params)
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        cleanup()
        try {
            reactApplicationContext.unregisterReceiver(broadcastReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver: ${e.message}")
        }
    }
} 