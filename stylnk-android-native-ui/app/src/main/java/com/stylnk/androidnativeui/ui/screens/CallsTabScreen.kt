package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private data class CallRow(val title: String, val subtitle: String)

private val mockCalls = listOf(
    CallRow("Alex Rivera", "Outgoing · 2m ago"),
    CallRow("Design Team", "Missed group call · Yesterday"),
    CallRow("Jordan Lee", "Incoming · 32m"),
)

@Composable
fun CallsTabScreen(modifier: Modifier = Modifier) {
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline

    Column(
        modifier
            .fillMaxSize()
            .padding(top = 8.dp),
    ) {
        Text(
            "Calls",
            style = MaterialTheme.typography.headlineSmall,
            color = paletteText,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
        HorizontalDivider(color = paletteBorder)
        LazyColumn {
            items(mockCalls) { row ->
                ListItem(
                    headlineContent = { Text(row.title, color = paletteText) },
                    supportingContent = { Text(row.subtitle, color = paletteMuted) },
                    colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.background),
                )
                HorizontalDivider(color = paletteBorder, modifier = Modifier.padding(start = 16.dp))
            }
        }
    }
}
