package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.ColorLens
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stylnk.androidnativeui.ui.theme.Danger
import com.stylnk.androidnativeui.ui.theme.Primary

private data class SettingItem(val label: String, val icon: ImageVector, val danger: Boolean = false)

private val sections: List<Pair<String, List<SettingItem>>> = listOf(
    "Account" to listOf(
        SettingItem("Edit Profile", Icons.Outlined.Person),
        SettingItem("Privacy", Icons.Outlined.Lock),
        SettingItem("Notifications", Icons.Outlined.Notifications),
        SettingItem("Security", Icons.Outlined.Security),
    ),
    "Preferences" to listOf(
        SettingItem("Appearance", Icons.Outlined.ColorLens),
        SettingItem("Language", Icons.Outlined.Language),
        SettingItem("Chat Settings", Icons.Outlined.ChatBubbleOutline),
    ),
    "Support" to listOf(
        SettingItem("Help & FAQ", Icons.Outlined.HelpOutline),
        SettingItem("About StyLnk", Icons.Outlined.Info),
        SettingItem("Log Out", Icons.Outlined.Logout, danger = true),
    ),
)

@Composable
fun ProfileTabScreen(
    modifier: Modifier = Modifier,
    onLogout: () -> Unit,
) {
    val paletteBg = MaterialTheme.colorScheme.background
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline

    Column(
        modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(Primary),
                contentAlignment = Alignment.Center,
            ) {
                Text("SJ", color = MaterialTheme.colorScheme.onPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(12.dp))
            Text("Sam Jordan", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = paletteText)
            Text("sam@example.com", fontSize = 14.sp, color = paletteMuted)
        }

        sections.forEach { (title, items) ->
            Text(
                title.uppercase(),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = paletteMuted,
                letterSpacing = 0.5.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            items.forEach { item ->
                val color = if (item.danger) Danger else paletteText
                ListItem(
                    headlineContent = { Text(item.label, color = color) },
                    leadingContent = {
                        Icon(item.icon, contentDescription = null, tint = if (item.danger) Danger else paletteMuted)
                    },
                    colors = ListItemDefaults.colors(containerColor = paletteBg),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = item.danger) {
                            if (item.danger) onLogout()
                        },
                )
                HorizontalDivider(color = paletteBorder, modifier = Modifier.padding(start = 56.dp))
            }
        }
    }
}
