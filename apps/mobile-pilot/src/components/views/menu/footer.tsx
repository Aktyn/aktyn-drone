import { Separator } from "~/components/ui/separator"

export function Footer() {
  return (
    <footer className="self-end px-1 w-full text-xs text-muted-foreground flex items-center justify-end gap-x-2 animate-in slide-in-from-bottom">
      <div className="mr-auto">v{import.meta.env.PACKAGE_VERSION}</div>
      <div>
        Created by <span className="font-bold">Aktyn</span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <div>
        <a
          className="hover:text-primary"
          href="https://github.com/Aktyn"
          target="_blank"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}
