"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Fingerprint } from "lucide-react"
import { toast } from "sonner"

export default function SecuritySettingsPage() {
  const handleRegisterPasskey = async () => {
    toast.info("Passkey registration will be implemented here.")
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Biometric Authentication</CardTitle>
          <CardDescription>
            Add a Passkey to your account for faster and more secure logins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Passkeys</p>
                <p className="text-sm text-muted-foreground">Use FaceID, TouchID or hardware keys</p>
              </div>
            </div>
            <Button onClick={handleRegisterPasskey}>Register</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
