import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { type TurnServer } from "~/lib/consts"
type TurnServerFormProps = {
  server: TurnServer
  onApply: (turnServer: TurnServer) => void
}

export function TurnServerForm({ server, onApply }: TurnServerFormProps) {
  const [urls, setUrls] = useState(server?.urls ?? "")
  const [username, setUsername] = useState(server?.username ?? "")
  const [credential, setCredential] = useState(server?.credential ?? "")

  const ready =
    !!urls &&
    !!username &&
    !!credential &&
    (urls !== server?.urls ||
      username !== server?.username ||
      credential !== server?.credential)

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
