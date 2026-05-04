package com.stylnk.androidnativeui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.stylnk.androidnativeui.ui.screens.ChatDetailScreen
import com.stylnk.androidnativeui.ui.screens.HomeScreen
import com.stylnk.androidnativeui.ui.screens.LoginScreen
import com.stylnk.androidnativeui.ui.screens.RegisterScreen

object Routes {
    const val Login = "login"
    const val Register = "register"
    const val Main = "main"
    const val Chat = "chat/{chatId}"

    fun chat(chatId: Long) = "chat/$chatId"
}

@Composable
fun StyLnkNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(
        navController = navController,
        startDestination = Routes.Login,
    ) {
        composable(Routes.Login) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(Routes.Main) {
                        popUpTo(Routes.Login) { inclusive = true }
                    }
                },
                onRegister = { navController.navigate(Routes.Register) },
            )
        }
        composable(Routes.Register) {
            RegisterScreen(
                onBack = { navController.popBackStack() },
                onAccountCreated = {
                    navController.navigate(Routes.Main) {
                        popUpTo(Routes.Login) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.Main) {
            HomeScreen(
                onOpenChat = { id ->
                    navController.navigate(Routes.chat(id))
                },
                onLogout = {
                    navController.navigate(Routes.Login) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(
            route = Routes.Chat,
            arguments = listOf(
                navArgument("chatId") { type = NavType.LongType },
            ),
        ) { entry ->
            val chatId = entry.arguments!!.getLong("chatId")
            ChatDetailScreen(
                chatId = chatId,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
