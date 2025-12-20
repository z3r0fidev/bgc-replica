"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface RatingStarsProps {
  userId: string
  initialRating?: number
  onRate?: (newAverage: number) => void
}

export function RatingStars({ userId, initialRating = 0, onRate }: RatingStarsProps) {
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRate = async (score: number) => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("access_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/api/profiles/${userId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ score }),
      })

      if (!response.ok) throw new Error("Rating failed")

      const data = await response.json()
      setRating(data.average_rating)
      if (onRate) onRate(data.average_rating)
      toast.success("Rating submitted!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[...Array(10)].map((_, i) => {
          const starValue = i + 1
          return (
            <button
              key={starValue}
              className={cn(
                "p-0.5 transition-colors disabled:cursor-not-allowed",
                isSubmitting ? "opacity-50" : "opacity-100"
              )}
              onMouseEnter={() => setHover(starValue)}
              onMouseLeave={() => setHover(0)}
              onClick={() => handleRate(starValue)}
              disabled={isSubmitting}
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  (hover || rating) >= starValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )}
              />
            </button>
          )
        })}
      </div>
      <span className="text-sm font-medium">Average: {rating.toFixed(1)} / 10</span>
    </div>
  )
}
