package com.stylnk.androidnativeui.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stylnk.androidnativeui.ui.theme.Primary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onRegister: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val paletteBg = MaterialTheme.colorScheme.background
    val paletteText = MaterialTheme.colorScheme.onBackground
    val paletteMuted = MaterialTheme.colorScheme.onSurfaceVariant
    val paletteBorder = MaterialTheme.colorScheme.outline
    val paletteElevated = MaterialTheme.colorScheme.surface

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(paletteBg)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .background(Primary, CircleShape)
                    .padding(horizontal = 28.dp, vertical = 20.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "S",
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "STYLNK",
                style = MaterialTheme.typography.headlineMedium,
                color = paletteText,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            )
            Text(
                text = "Connect with anyone, anywhere",
                style = MaterialTheme.typography.bodyMedium,
                color = paletteMuted,
                modifier = Modifier.padding(top = 4.dp),
            )
            Text(
                text = "Native UI preview (not connected to API)",
                style = MaterialTheme.typography.labelSmall,
                color = paletteMuted,
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        Spacer(modifier = Modifier.height(40.dp))

        Text("Email", color = paletteText, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(6.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Enter your email", color = paletteMuted) },
            shape = RoundedCornerShape(12.dp),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Primary,
                unfocusedBorderColor = paletteBorder,
                focusedContainerColor = paletteElevated,
                unfocusedContainerColor = paletteElevated,
            ),
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text("Password", color = paletteText, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(6.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Enter your password", color = paletteMuted) },
            shape = RoundedCornerShape(12.dp),
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                TextButton(onClick = { showPassword = !showPassword }) {
                    Text(if (showPassword) "Hide" else "Show", color = Primary, fontWeight = FontWeight.SemiBold)
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Primary,
                unfocusedBorderColor = paletteBorder,
                focusedContainerColor = paletteElevated,
                unfocusedContainerColor = paletteElevated,
            ),
        )

        TextButton(
            onClick = { /* UI-only */ },
            modifier = Modifier.align(Alignment.End),
        ) {
            Text("Forgot Password?", color = Primary, fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = {
                if (email.isBlank() || password.isBlank()) return@Button
                loading = true
                scope.launch {
                    delay(450)
                    loading = false
                    onLoggedIn()
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
                Text("Log In", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HorizontalDivider(modifier = Modifier.weight(1f), color = paletteBorder)
            Text("or", modifier = Modifier.padding(horizontal = 12.dp), color = paletteMuted, fontSize = 13.sp)
            HorizontalDivider(modifier = Modifier.weight(1f), color = paletteBorder)
        }

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) {
            Row(horizontalArrangement = Arrangement.Center) {
                Text(
                    text = "Don't have an account? ",
                    color = paletteMuted,
                    fontSize = 14.sp,
                )
                Text(
                    text = "Sign Up",
                    color = Primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                )
            }
        }
    }
}
