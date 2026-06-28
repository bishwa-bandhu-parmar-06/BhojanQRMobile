# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Razorpay Checkout - reflection-based, breaks silently without these
# (see https://razorpay.com/docs/payments/payment-gateway/android-integration/standard/integration-steps/)
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/*
-keep class proguard.annotation.Keep
-keep class proguard.annotation.KeepClassMembers
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.apps.nexuslauncher.GoogleBuiltInBubbleWindowHints
-keep class com.google.android.gms.common.api.** {*;}

# react-native-html-to-pdf bundles PdfBox-Android, which optionally supports
# JPEG2000 images via this class - we never include that optional dependency
# (and never need JPX decoding), so R8 just needs to be told it's fine missing.
-dontwarn com.gemalto.jp2.JP2Decoder
