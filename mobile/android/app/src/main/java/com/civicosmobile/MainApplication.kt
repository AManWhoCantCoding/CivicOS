package com.civicosmobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
        override fun getPackages(): List<ReactPackage> = PackageList(this).packages + ApiConfigPackage()
        override fun getJSMainModuleName(): String = "index"
        override val isNewArchEnabled: Boolean get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean get() = BuildConfig.IS_HERMES_ENABLED
    }

    override fun onCreate() { super.onCreate(); if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) load() }
}
