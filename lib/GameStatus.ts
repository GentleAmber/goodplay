import {
  Clock,
  Trophy,
  Play,
  Bookmark,
} from "lucide-react"

const STATUS_CONFIG = [
  { key: "PLAYING", label: "Playing", icon: Play, color: "text-green-400" },
  { key: "WANT_TO_PLAY", label: "Want to Play", icon: Bookmark, color: "text-blue-400" },
  { key: "COMPLETED", label: "Completed", icon: Trophy, color: "text-yellow-400" },
  { key: "PLAYED", label: "Played", icon: Clock, color: "text-gray-400" },
]

export default STATUS_CONFIG