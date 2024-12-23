import { Separator } from '~/components/ui/separator.tsx'
import { Button } from '~/components/ui/button.tsx'
import { Fullscreen } from 'lucide-react'

export function Menu() {
  return (
    <div className='flex-grow grid grid-rows-[1fr_auto_1fr] items-between justify-stretch w-full h-full'>
      <div className='animate-in slide-in-from-top grid grid-cols-[1fr_auto_1fr] items-start justify-between'>
        <span className='col-start-2 text-3xl font-bold p-4 text-center'>
          Aktyn Drone Pilot
        </span>
        <Button variant='ghost' size='icon' className='justify-self-end m-2 [&_svg]:size-6'>
          <Fullscreen />
        </Button>
      </div>
      <div className='flex-grow flex flex-col items-center justify-center animate-in zoom-in-50 fade-in'>
        content
      </div>
      <footer className='self-end px-1 w-full text-xs text-muted-foreground flex items-center justify-end gap-x-2 animate-in slide-in-from-bottom'>
        <div>
          Created by <span className='font-bold'>Aktyn</span>
        </div>
        <Separator orientation='vertical' className='h-6' />
        <div>
          <a className='hover:text-primary' href='https://github.com/Aktyn' target='_blank'>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
