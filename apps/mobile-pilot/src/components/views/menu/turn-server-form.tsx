import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import type { TurnServer } from "~/providers/connection-provider"

type TurnServerFormProps = {
  defaultValues: TurnServer | null
  onApply: (turnServer: TurnServer) => void
}

export function TurnServerForm({
  defaultValues,
  onApply,
}: TurnServerFormProps) {
  const [urls, setUrls] = useState(defaultValues?.urls ?? "")
  const [username, setUsername] = useState(defaultValues?.username ?? "")
  const [credential, setCredential] = useState(defaultValues?.credential ?? "")

  const ready = !!urls && !!username && !!credential

  return (
    <div className="flex flex-col items-stretch gap-y-2">
      <Input
        placeholder="URLs"
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
      />
      <Input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        placeholder="Credential"
        value={credential}
        onChange={(e) => setCredential(e.target.value)}
      />
      <Button
        onClick={() => onApply({ urls, username, credential })}
        disabled={!ready}
      >
        Apply
      </Button>
    </div>
  )
}
