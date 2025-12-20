"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function MediaGallery() {
  const [media, setMedia] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const token = localStorage.getItem("access_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${apiUrl}/api/profiles/me/media`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const newMedia = await response.json()
      setMedia([...media, newMedia])
      toast.success("Media uploaded!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">My Gallery</h3>
        <div className="relative">
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={isUploading}
            accept="image/*,video/*"
          />
          <Button disabled={isUploading}>
            {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <CardContent className="p-0 aspect-square">
              <img src={item.url} alt="Gallery item" className="object-cover w-full h-full transition-transform group-hover:scale-105" />
              <button className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
        {media.length === 0 && !isUploading && (
          <div className="col-span-full py-10 text-center border-2 border-dashed rounded-lg text-muted-foreground">
            No media uploaded yet.
          </div>
        )}
      </div>
    </div>
  )
}
