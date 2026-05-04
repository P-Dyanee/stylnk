package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stylnk.androidnativeui.ui.theme.Primary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onBack: () -> Unit,
    onAccountCreated: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val paletteBg = MaterialTheme.colorScheme.background
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline
    val paletteElevated = MaterialTheme.colorScheme.surface

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = paletteBg),
            )
        },
        containerColor = paletteBg,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Top,
        ) {
            Text(
                text = "Create Account",
                style = MaterialTheme.typography.headlineSmall,
                color = paletteText,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Join STYLNK today",
                style = MaterialTheme.typography.bodyMedium,
                color = paletteMuted,
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp),
            )

            FieldLabel("Full Name", paletteText)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter your full name", color = paletteMuted) },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                colors = fieldColors(paletteElevated, paletteBorder),
            )

            Spacer(Modifier.height(16.dp))
            FieldLabel("Email", paletteText)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter your email", color = paletteMuted) },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = fieldColors(paletteElevated, paletteBorder),
            )

            Spacer(Modifier.height(16.dp))
            FieldLabel("Password", paletteText)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Create a password", color = paletteMuted) },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                colors = fieldColors(paletteElevated, paletteBorder),
            )

            Spacer(Modifier.height(16.dp))
            FieldLabel("Confirm Password", paletteText)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = confirm,
                onValueChange = { confirm = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Confirm your password", color = paletteMuted) },
                shape = RoundedCornerShape(12.dp),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                colors = fieldColors(paletteElevated, paletteBorder),
            )

            Spacer(Modifier.height(28.dp))

            Button(
                onClick = {
                    if (name.isBlank() || email.isBlank() || password.isBlank() || confirm.isBlank()) return@Button
                    if (password != confirm) return@Button
                    loading = true
                    scope.launch {
                        delay(500)
                        loading = false
                        onAccountCreated()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !loading,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        strokeWidth = 2.dp,
                        modifier = Modifier.height(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text("Create Account", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Already have an account? Log In", color = Primary, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FieldLabel(text: String, color: androidx.compose.ui.graphics.Color) {
    Text(text, color = color, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
}

@Composable
private fun fieldColors(
    elevated: androidx.compose.ui.graphics.Color,
    border: androidx.compose.ui.graphics.Color,
) = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Primary,
    unfocusedBorderColor = border,
    focusedContainerColor = elevated,
    unfocusedContainerColor = elevated,
)
