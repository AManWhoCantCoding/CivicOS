package com.civicosmobile

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ApiConfigModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "CivicOSApiConfig"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf("CIVICOS_API_BASE_URL" to BuildConfig.CIVICOS_API_BASE_URL)

    @ReactMethod
    fun getBaseUrl(promise: Promise) = promise.resolve(BuildConfig.CIVICOS_API_BASE_URL)

    // Offline sync hook: while the app is running, emits exactly one JS
    // DeviceEvent "civicos:restored-online" per genuine offline ->
    // validated-online transition of the default network so mounted screens can
    // retry their pending offline commands without navigating away. The event
    // carries no payload (keep the name in sync with
    // mobile/src/features/task/connectivity.ts) and nothing is logged.
    private val connectivityManager: ConnectivityManager? =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    // Snapshot at module creation so registering while already online never
    // emits: the first callback just confirms the current state.
    private var wasValidatedOnline: Boolean = isConnectedToValidatedInternet()

    private var callbackRegistered: Boolean = false

    private val networkCallback =
        object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities,
            ) {
                if (network != connectivityManager?.activeNetwork) return
                updateValidatedOnlineState(isValidatedOnline(networkCapabilities))
            }

            override fun onLost(network: Network) {
                updateValidatedOnlineState(isConnectedToValidatedInternet())
            }
        }

    override fun initialize() {
        super.initialize()
        val manager = connectivityManager ?: return
        try {
            manager.registerDefaultNetworkCallback(networkCallback)
            callbackRegistered = true
        } catch (error: Exception) {
            // Without ACCESS_NETWORK_STATE (or during teardown) connectivity
            // monitoring is unavailable; queued commands stay retryable through
            // TaskScreen's mount/session retry.
            callbackRegistered = false
        }
    }

    override fun invalidate() {
        if (callbackRegistered) {
            callbackRegistered = false
            try {
                connectivityManager?.unregisterNetworkCallback(networkCallback)
            } catch (error: Exception) {
            }
        }
        super.invalidate()
    }

    private fun isValidatedOnline(capabilities: NetworkCapabilities?): Boolean =
        capabilities != null &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

    private fun isConnectedToValidatedInternet(): Boolean =
        connectivityManager.let { manager ->
            if (manager == null) false
            else isValidatedOnline(manager.getNetworkCapabilities(manager.activeNetwork))
        }

    // NetworkCallback fires on a system handler thread; the capability check
    // plus state mutation must be atomic so only real transitions emit.
    private fun updateValidatedOnlineState(online: Boolean) {
        val restored: Boolean
        synchronized(this) {
            restored = online && !wasValidatedOnline
            wasValidatedOnline = online
        }
        if (restored) emitRestoredOnline()
    }

    private fun emitRestoredOnline() {
        try {
            getReactApplicationContextIfActiveOrWarn()?.emitDeviceEvent("civicos:restored-online")
        } catch (error: Exception) {
            // The bridge may be closing; nothing is lost because TaskScreen
            // retries the queue on every session change and screen mount.
        }
    }
}
