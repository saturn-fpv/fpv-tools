import java.io.FileInputStream
import java.util.Properties

plugins {
  alias(libs.plugins.android.application)
}

val secretsFile = rootProject.file("secrets.properties")
val secrets = Properties()
if (secretsFile.exists()) {
    secretsFile.inputStream().use { secrets.load(it) }
}

android {
    namespace = "com.saturnfpv.fpvtools"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.saturnfpv.fpvtools"
        minSdk = 24
        targetSdk = 36
        versionCode = 4
        versionName = "1.1.0"
        manifestPlaceholders["appName"] = "FPV Tools"
    }

    flavorDimensions.add("distribution")
    productFlavors {
        create("play") {
            dimension = "distribution"
        }
        create("fdroid") {
            dimension = "distribution"
        }
    }


    signingConfigs {
        create("release") {
            if (secretsFile.exists()) {
                storeFile = file(secrets.getProperty("storeFile"))
                storePassword = secrets.getProperty("storePassword")
                keyAlias = secrets.getProperty("keyAlias")
                keyPassword = secrets.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (secretsFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
            manifestPlaceholders["appName"] = "FPV Tools"
        }
        debug {
            applicationIdSuffix = ".debug"
            manifestPlaceholders["appName"] = "FPV Tools (Debug)"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
      compose = false
      aidl = false
      buildConfig = false
      shaders = false
    }

    packaging {
      resources {
        excludes += "/META-INF/{AL2.0,LGPL2.1}"
      }
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
  // Core Android dependencies
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.activity)

  // Local tests: jUnit, coroutines, Android runner
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)

  // Instrumented tests: jUnit rules and runners
  androidTestImplementation(libs.androidx.test.core)
  androidTestImplementation(libs.androidx.test.ext.junit)
  androidTestImplementation(libs.androidx.test.runner)
  androidTestImplementation(libs.androidx.test.espresso.core)
}
