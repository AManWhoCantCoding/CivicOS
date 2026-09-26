package com.civicosmobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ApiConfigModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "CivicOSApiConfig"

    override fun getConstants(): MutableMap<String, Any> = mutableMapOf("CIVICOS_API_BASE_URL" to BuildConfig.CIVICOS_API_BASE_URL)

    @ReactMethod
    fun getBaseUrl(promise: Promise) = promise.resolve(BuildConfig.CIVICOS_API_BASE_URL)
}
