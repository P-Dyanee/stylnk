package com.stylnk.androidnativeui.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = PrimarySurface,
    onPrimaryContainer = PrimaryDark,
    secondary = Primary,
    onSecondary = Color.White,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = Surface,
    onSurfaceVariant = TextSecondary,
    outline = Border,
    error = Danger,
    onError = Color.White,
)

private val DarkScheme = darkColorScheme(
    primary = Color(0xFFECEDEE),
    onPrimary = Color(0xFF151718),
    primaryContainer = Color(0xFF2C2F31),
    onPrimaryContainer = Color(0xFFECEDEE),
    secondary = Color(0xFFECEDEE),
    onSecondary = Color(0xFF151718),
    background = Color(0xFF151718),
    onBackground = Color(0xFFECEDEE),
    surface = Color(0xFF1E2022),
    onSurface = Color(0xFFECEDEE),
    surfaceVariant = Color(0xFF2C2F31),
    onSurfaceVariant = Color(0xFF9BA1A6),
    outline = Color(0xFF2C2F31),
    error = Danger,
    onError = Color.White,
)

@Composable
fun StyLnkNativeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val scheme = if (darkTheme) DarkScheme else LightScheme
    MaterialTheme(
        colorScheme = scheme,
        content = content,
    )
}
