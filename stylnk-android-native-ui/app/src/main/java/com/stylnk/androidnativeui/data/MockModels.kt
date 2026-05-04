package com.stylnk.androidnativeui.data

data class ConversationUi(
    val id: Long,
    val title: String,
    val initials: String,
    val lastMessage: String,
    val timeLabel: String,
    val unread: Int,
    val isOnline: Boolean,
    val isGroup: Boolean,
)

data class ChatMessageUi(
    val id: Long,
    val text: String,
    val isMine: Boolean,
    val timeLabel: String,
)

object MockChats {
    val conversations: List<ConversationUi> = listOf(
        ConversationUi(1, "Alex Rivera", "AR", "Sounds good — see you at 6!", "10:42", 2, true, false),
        ConversationUi(2, "Design Team", "DT", "Sam: uploaded the new mocks", "Yesterday", 0, false, true),
        ConversationUi(3, "Jordan Lee", "JL", "You: 👍", "Mon", 0, false, false),
        ConversationUi(4, "Weekend Trip", "WT", "Who’s bringing the speaker?", "Sun", 5, true, true),
    )

    fun messagesFor(chatId: Long): List<ChatMessageUi> = when (chatId) {
        1L -> listOf(
            ChatMessageUi(101, "Hey! Are we still on for tonight?", false, "9:12"),
            ChatMessageUi(102, "Yes — I’ll grab us a table.", true, "9:18"),
            ChatMessageUi(103, "Sounds good — see you at 6!", false, "10:42"),
        )
        2L -> listOf(
            ChatMessageUi(201, "New mocks are in the shared folder.", false, "Yesterday"),
            ChatMessageUi(202, "Sam: uploaded the new mocks", false, "Yesterday"),
        )
        else -> listOf(
            ChatMessageUi(301, "Sample message (UI preview only).", false, "Now"),
            ChatMessageUi(302, "This native project is not wired to your backend.", true, "Now"),
        )
    }

    fun titleFor(chatId: Long): String =
        conversations.find { it.id == chatId }?.title ?: "Chat"
}
