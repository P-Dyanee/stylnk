package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.stylnk.androidnativeui.ui.theme.Primary

private enum class MainTab(
    val label: String,
    val icon: ImageVector,
) {
    Chats("Chats", Icons.Outlined.ChatBubbleOutline),
    Calls("Calls", Icons.Outlined.Call),
    Groups("Groups", Icons.Outlined.Groups),
    Profile("Profile", Icons.Outlined.PersonOutline),
}

@Composable
fun HomeScreen(
    onOpenChat: (Long) -> Unit,
    onLogout: () -> Unit,
) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    val tabs = MainTab.entries

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        selected = selected == index,
                        onClick = { selected = index },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Primary,
                            selectedTextColor = Primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        when (tabs[selected]) {
            MainTab.Chats -> ChatsTabScreen(
                modifier = Modifier.padding(padding),
                onOpenChat = onOpenChat,
            )
            MainTab.Calls -> CallsTabScreen(Modifier.padding(padding))
            MainTab.Groups -> GroupsTabScreen(Modifier.padding(padding))
            MainTab.Profile -> ProfileTabScreen(
                modifier = Modifier.padding(padding),
                onLogout = onLogout,
            )
        }
    }
}
