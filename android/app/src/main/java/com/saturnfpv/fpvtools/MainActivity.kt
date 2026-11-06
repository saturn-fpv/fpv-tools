package com.saturnfpv.fpvtools

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.lang.ref.WeakReference

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var container: FrameLayout
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var assetLoader: WebViewAssetLoader

    companion object {
        /**
         * Reserved host that WebViewAssetLoader maps to the app's own assets.
         * Serving the UI from https://... instead of file:// gives the WebView a
         * real web origin, so it sends a Referer header. OpenStreetMap's tile
         * servers answer requests without one with a 403 "Access blocked" tile,
         * which is why the map previously had to fall back to another provider
         * inside the app. It also gives all tool pages ONE shared localStorage
         * origin, which file:// does not guarantee.
         */
        private const val ASSET_HOST = "appassets.androidplatform.net"
        private const val ASSET_BASE_URL = "https://$ASSET_HOST/assets/"

        /**
         * OpenStreetMap's tile usage policy requires a distinct, stable
         * User-Agent that identifies the app; generic defaults are blocked.
         */
        private const val UA_TAG = "FPVTools/1.2.3 (+https://saturnfpv.com)"
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val intent = result.data
        val resultCode = result.resultCode
        var results: Array<Uri>? = null
        if (resultCode == RESULT_OK && intent != null) {
            val dataString = intent.dataString
            val clipData = intent.clipData
            if (clipData != null) {
                results = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
            } else if (dataString != null) {
                results = arrayOf(Uri.parse(dataString))
            }
        }
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)

        // Serves src/main/assets under https://appassets.androidplatform.net/assets/
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(ASSET_HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Assets are now served over https by the loader, so the WebView
            // never needs to read file:// URLs itself.
            allowFileAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            databaseEnabled = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString $UA_TAG"
        }

        // Add Java-to-JS bridge interface
        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")

        // Create a FrameLayout container to safely apply system bar insets (safe area padding)
        container = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            addView(webView, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ))
        }

        // Bind safe areas (window insets) to container FrameLayout to prevent status/navigation bars from cutting off the UI
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        webView.webViewClient = object : WebViewClient() {
            // Resolves https://appassets.androidplatform.net/assets/... from the
            // APK. Anything else returns null and goes to the network as usual.
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                return assetLoader.shouldInterceptRequest(url)
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val url = uri.toString()
                // Restrict in-app navigation strictly to the bundled assets.
                if (uri.scheme == "https" && uri.host == ASSET_HOST) {
                    return false
                }
                // Open every other http/https link in the user's browser
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        this@MainActivity.startActivity(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = (fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT)).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(
                        Intent.EXTRA_MIME_TYPES,
                        arrayOf("text/csv", "text/comma-separated-values", "text/plain", "*/*")
                    )
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })

        setContentView(container)

        // Set system bar colors based on system theme now that content view is set.
        // We post it to ensure the decorView is fully attached and laid out before changing theme.
        val isSystemDark = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        window.decorView.post {
            setSystemBarsTheme(!isSystemDark)
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            // Served from the APK's assets by assetLoader, over an https origin
            webView.loadUrl(ASSET_BASE_URL + "index.html")
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        webView.removeJavascriptInterface("AndroidBridge")
        webView.stopLoading()
        webView.loadUrl("about:blank")
        if (::container.isInitialized) {
            container.removeView(webView)
        }
        webView.destroy()
        super.onDestroy()
    }

    private fun setSystemBarsTheme(isLight: Boolean) {
        val barColor = if (isLight) {
            android.graphics.Color.parseColor("#f3f4f6")
        } else {
            android.graphics.Color.parseColor("#111827")
        }
        
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
        
        window.statusBarColor = barColor
        window.navigationBarColor = barColor

        if (::container.isInitialized) {
            container.setBackgroundColor(barColor)
        }

        val windowInsetsController = androidx.core.view.WindowInsetsControllerCompat(window, window.decorView)
        windowInsetsController.isAppearanceLightStatusBars = isLight
        windowInsetsController.isAppearanceLightNavigationBars = isLight
    }

    // JS interface class to trigger native share sheet for Web KML/KMZ/GPX downloads
    class AndroidBridge(context: Context) {
        private val contextRef = WeakReference(context)

        @JavascriptInterface
        fun updateTheme(theme: String) {
            val context = contextRef.get() ?: return
            (context as? MainActivity)?.runOnUiThread {
                context.setSystemBarsTheme(theme == "light")
            }
        }

        @JavascriptInterface
        fun shareFile(base64Data: String, filename: String) {
            val context = contextRef.get() ?: return
            val mainActivity = context as? MainActivity ?: return
            
            // 1. Sanitize the filename to prevent directory traversal
            val safeFilename = filename.split('/', '\\').lastOrNull()?.takeIf { it.isNotBlank() } ?: "export.txt"
            
            // 2. Validate file extension (.gpx, .kml, .kmz, .txt only)
            val allowedExtensions = listOf("gpx", "kml", "kmz", "txt")
            val extension = safeFilename.substringAfterLast('.', "").lowercase()
            if (extension !in allowedExtensions) {
                mainActivity.runOnUiThread {
                    Toast.makeText(context, "Invalid export format: .$extension", Toast.LENGTH_LONG).show()
                }
                return
            }

            // 3. Limit maximum file size (50MB base64 encoded check)
            val maxBase64Length = 50 * 1024 * 1024 * 4 / 3 
            if (base64Data.length > maxBase64Length) {
                mainActivity.runOnUiThread {
                    Toast.makeText(context, "File size exceeds limit", Toast.LENGTH_LONG).show()
                }
                return
            }

            // Run I/O operations asynchronously on a background dispatcher
            mainActivity.lifecycleScope.launch(Dispatchers.IO) {
                try {
                    val fileBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    
                    // Isolate temporary exports in a dedicated "shared_files" subfolder
                    val sharedDir = File(context.cacheDir, "shared_files")
                    if (!sharedDir.exists()) {
                        sharedDir.mkdirs()
                    }
                    
                    // Clean up older shared files to prevent local cache accumulation
                    sharedDir.listFiles()?.forEach { it.delete() }
                    
                    val file = File(sharedDir, safeFilename)
                    FileOutputStream(file).use { fos ->
                        fos.write(fileBytes)
                    }
                    
                    val uri = FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file
                    )
                    
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "*/*"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    
                    withContext(Dispatchers.Main) {
                        context.startActivity(Intent.createChooser(intent, "Export Telemetry Track"))
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Export failed: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}
