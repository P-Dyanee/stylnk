package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Create
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stylnk.androidnativeui.data.MockChats
import com.stylnk.androidnativeui.ui.theme.Online
import com.stylnk.androidnativeui.ui.theme.Primary
import com.stylnk.androidnativeui.ui.theme.PrimarySurface

@Composable
fun ChatsTabScreen(
    modifier: Modifier = Modifier,
    onOpenChat: (Long) -> Unit,
) {
    var search by remember { mutableStateOf("") }
    val paletteBg = MaterialTheme.colorScheme.background
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline
    val paletteCard = MaterialTheme.colorScheme.surface

    val filtered = remember(search) {
        MockChats.conversations.filter {
            it.title.contains(search, ignoreCase = true)
        }
    }

    Box(modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Chats", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = paletteText)
                    Text("Live", fontSize = 12.sp, color = paletteMuted)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    IconButton(
                        onClick = { /* UI-only */ },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(PrimarySurface),
                    ) {
                        Icon(Icons.Outlined.Groups, contentDescription = "New group", tint = Primary)
                    }
                    IconButton(
                        onClick = { /* UI-only */ },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(PrimarySurface),
                    ) {
                        Icon(Icons.Outlined.Create, contentDescription = "New message", tint = Primary)
                    }
                }
            }
            HorizontalDivider(color = paletteBorder)

            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                placeholder = { Text("Search conversations or people", color = paletteMuted) },
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = paletteMuted) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = paletteBorder,
                    unfocusedBorderColor = paletteBorder,
                    focusedContainerColor = paletteCard,
                    unfocusedContainerColor = paletteCard,
                ),
            )

            LazyColumn(Modifier.fillMaxSize()) {
                items(filtered, key = { it.id }) { item ->
                    ConversationRow(
                        title = item.title,
                        initials = item.initials,
                        subtitle = item.lastMessage,
                        time = item.timeLabel,
                        unread = item.unread,
                        isOnline = item.isOnline,
                        onClick = { onOpenChat(item.id) },
                    )
                    HorizontalDivider(color = paletteBorder, modifier = Modifier.padding(start = 80.dp))
                }
            }
        }

        FloatingActionButton(
            onClick = { /* UI-only */ },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp, 24.dp),
            containerColor = Primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ) {
            Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = "Compose")
        }
    }
}

@Composable
private fun ConversationRow(
    title: String,
    initials: String,
    subtitle: String,
    time: String,
    unread: Int,
    isOnline: Boolean,
    onClick: () -> Unit,
) {
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(52.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(Primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(initials, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
            if (isOnline) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(2.dp)
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(Online),
                )
            }
        }
        Column(Modifier.padding(start = 12.dp).weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = paletteText)
            Spacer(Modifier.height(4.dp))
            Text(
                subtitle,
                fontSize = 14.sp,
                color = paletteMuted,
                maxLines = 1,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(time, fontSize = 12.sp, color = paletteMuted)
            if (unread > 0) {
                Spacer(Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Primary)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        unread.coerceAtMost(99).toString(),
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}
