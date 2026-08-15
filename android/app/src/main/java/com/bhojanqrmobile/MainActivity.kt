package com.bhojanqrmobile

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

 
  override fun onCreate(savedInstanceState: Bundle?) {
    // RNBootSplash.init() used to run here. The native splash is gone
    // entirely: the app's only splash is src/components/SplashScreen.tsx.
    // What Android still shows before JS is ready is the launch window, which
    // is just AppTheme's windowBackground - a flat #fff7ed field matching
    // SplashScreen's own background, so there is no white flash and no second
    // splash image, only the cream that SplashScreen then draws onto.
    super.onCreate(null) // Using null is safer for React Navigation
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "BhojanQRMobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}