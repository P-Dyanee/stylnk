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

private data class GroupRow(val name: String, val members: String)

private val mockGroups = listOf(
    GroupRow("Design Team", "12 members"),
    GroupRow("Weekend Trip", "6 members"),
    GroupRow("Family", "9 members"),
)

@Composable
fun GroupsTabScreen(modifier: Modifier = Modifier) {
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline

    Column(
        modifier
            .fillMaxSize()
            .padding(top = 8.dp),
    ) {
        Text(
            "Groups",
            style = MaterialTheme.typography.headlineSmall,
            color = paletteText,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
        HorizontalDivider(color = paletteBorder)
        LazyColumn {
            items(mockGroups) { row ->
                ListItem(
                    headlineContent = { Text(row.name, color = paletteText) },
                    supportingContent = { Text(row.members, color = paletteMuted) },
                    colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.background),
                )
                HorizontalDivider(color = paletteBorder, modifier = Modifier.padding(start = 16.dp))
            }
        }
    }
}
