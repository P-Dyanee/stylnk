package com.stylnk.androidnativeui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.stylnk.androidnativeui.navigation.StyLnkNavHost
import com.stylnk.androidnativeui.ui.theme.StyLnkNativeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StyLnkNativeTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    StyLnkNavHost()
                }
            }
        }
    }
}
