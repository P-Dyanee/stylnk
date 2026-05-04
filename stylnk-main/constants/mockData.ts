export type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
  avatar?: string;
};

export type Call = {
  id: string;
  name: string;
  type: "incoming" | "outgoing" | "missed";
  callType: "voice" | "video";
  time: string;
  duration?: string;
  isOnline: boolean;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  time: string;
  unreadCount: number;
};

export const MOCK_CHATS: Chat[] = [
  {
    id: "1",
    name: "Alice Reyes",
    lastMessage: "Hey! Are you free later?",
    time: "10:42 AM",
    unreadCount: 3,
    isOnline: true,
    isGroup: false,
  },
  {
    id: "2",
    name: "Juan dela Cruz",
    lastMessage: "Got it, thanks!",
    time: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isGroup: false,
  },
  {
    id: "3",
    name: "Dev Team 🚀",
    lastMessage: "Carlo: Push na ba?",
    time: "Yesterday",
    unreadCount: 5,
    isOnline: false,
    isGroup: true,
  },
  {
    id: "4",
    name: "Maria Santos",
    lastMessage: "Sige see you tomorrow!",
    time: "Mon",
    unreadCount: 0,
    isOnline: true,
    isGroup: false,
  },
  {
    id: "5",
    name: "Jose Rizal",
    lastMessage: "Noli me tangere 📖",
    time: "Sun",
    unreadCount: 1,
    isOnline: false,
    isGroup: false,
  },
  {
    id: "6",
    name: "Gabriela Silang",
    lastMessage: "Laban tayo!",
    time: "Sat",
    unreadCount: 0,
    isOnline: false,
    isGroup: false,
  },
  {
    id: "7",
    name: "StyLnk Team 💜",
    lastMessage: "Ana: Bagong update na!",
    time: "Fri",
    unreadCount: 2,
    isOnline: false,
    isGroup: true,
  },
];

export const MOCK_CALLS: Call[] = [
  {
    id: "1",
    name: "Alice Reyes",
    type: "incoming",
    callType: "video",
    time: "Today, 10:30 AM",
    duration: "5:23",
    isOnline: true,
  },
  {
    id: "2",
    name: "Juan dela Cruz",
    type: "outgoing",
    callType: "voice",
    time: "Yesterday, 3:15 PM",
    duration: "12:08",
    isOnline: false,
  },
  {
    id: "3",
    name: "Maria Santos",
    type: "missed",
    callType: "voice",
    time: "Yesterday, 11:00 AM",
    isOnline: true,
  },
  {
    id: "4",
    name: "Dev Team 🚀",
    type: "incoming",
    callType: "video",
    time: "Mon, 2:00 PM",
    duration: "45:12",
    isOnline: false,
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: "1",
    name: "Dev Team 🚀",
    description: "Building the future, one push at a time",
    memberCount: 8,
    lastMessage: "Carlo: Push na ba?",
    time: "Yesterday",
    unreadCount: 5,
  },
  {
    id: "2",
    name: "StyLnk Team 💜",
    description: "Official StyLnk development team",
    memberCount: 12,
    lastMessage: "Ana: Bagong update na!",
    time: "Fri",
    unreadCount: 2,
  },
  {
    id: "3",
    name: "Barkada 🎉",
    description: "Tropa forever",
    memberCount: 6,
    lastMessage: "Outing tayo this weekend!",
    time: "Wed",
    unreadCount: 0,
  },
  {
    id: "4",
    name: "CS 401 Class",
    description: "Finals na kaya natin ito",
    memberCount: 35,
    lastMessage: "Prof: Submit by Friday",
    time: "Tue",
    unreadCount: 8,
  },
];
