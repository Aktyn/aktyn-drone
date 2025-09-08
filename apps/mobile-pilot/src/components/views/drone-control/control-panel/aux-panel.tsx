/* eslint-disable @typescript-eslint/naming-convention */
import { type AuxIndex, MessageType } from "@aktyn-drone/common"
import {
  Check,
  Drone,
  FlipVertical2,
  LifeBuoy,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react"
import {
  memo,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { Slider } from "~/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Toggle } from "~/components/ui/toggle"
import { useGlobalState } from "~/hooks/useGlobalState"
import { useSizer } from "~/hooks/useSizer"
import { useStateToRef } from "~/hooks/useStateToRef"
import { AUX_CHANNELS_COUNT } from "~/lib/consts"
import { cn } from "~/lib/utils"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"

export const AUXPanel = memo(() => {
  const { send, selfPeerId, isConnected } = useConnection()

  const [tab, setTab] = useState("basic")
  const [aux, setAux] = useGlobalState(`aux-values-${selfPeerId}`, initialAux)

  const { ref, height: containerHeight } = useSizer()
  const compact = containerHeight < 256

  const setAuxValue = useCallback(
    (index: AuxIndex, value: number) => {
      setAux((prev) => {
        const newAux = [...prev]
        newAux[index] = { value }

        send({ type: MessageType.SET_AUX, data: { auxIndex: index, value } })

        return newAux
      })
    },
    [send, setAux],
  )

  const auxRef = useStateToRef(aux)
  const resetAux = useCallback(() => {
    setAux(initialAux)

    const timeouts = Array.from({ length: AUX_CHANNELS_COUNT }, (_, index) =>
      setTimeout(
        () => {
          if (!auxRef.current) {
            return
          }
          send({
            type: MessageType.SET_AUX,
            data: {
              auxIndex: index as AuxIndex,
              value: auxRef.current[index].value,
            },
          })
        },
        ((index + 1) * 1000) / 60,
      ),
    )

    return timeouts
  }, [auxRef, send, setAux])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    const timeout = setTimeout(() => {
      send({
        type: MessageType.REQUEST_AUX,
        data: {},
      })
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [isConnected, send])

  useConnectionMessageHandler((message) => {
    switch (message.type) {
      case MessageType.AUX_VALUE:
        setAux((prev) => {
          if (message.data.auxIndex >= AUX_CHANNELS_COUNT) {
            return prev
          }

          const newAux = [...prev]
          newAux[message.data.auxIndex] = { value: message.data.value }
          return newAux
        })
        break
    }
  })

  return (
    <div
      ref={ref}
      className="flex flex-col justify-stretch size-full overflow-hidden"
    >
      {compact ? (
        <div className="flex flex-col items-stretch gap-y-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal />
                Manage AUX
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 max-w-[61.8dvw]"
              aria-describedby={undefined}
            >
              <Tabs
                value={tab}
                onValueChange={setTab}
                className="flex flex-col h-full"
              >
                <SheetHeader>
                  <SheetTitle>AUX settings</SheetTitle>
                  <TabsList className="w-full *:grow">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                </SheetHeader>
                <TabsContent asChild value="basic">
                  <BasicAUX auxValues={aux ?? []} setAux={setAuxValue} />
                </TabsContent>
                <TabsContent asChild value="advanced">
                  <AdvancedAUX
                    auxValues={aux ?? []}
                    setAux={setAuxValue}
                    onReset={resetAux}
                  />
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
          <div className="mx-auto inline-flex flex-row flex-wrap items-center gap-2 *:size-4">
            {AuxToggle.isToggled(aux?.[0].value ?? 0) && (
              <Drone className="text-green-300" />
            )}
            {AuxToggle.isToggled(aux?.[1].value ?? 0) && (
              <FlipVertical2 className="text-blue-300" />
            )}
            {AuxToggle.isToggled(aux?.[3].value ?? 0) && (
              <LifeBuoy className="text-orange-400" />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-y-2 w-full max-h-full bg-background/50 backdrop-blur-md rounded-lg p-2 mb-auto border overflow-hidden">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex flex-col h-full"
          >
            <TabsList className="w-full *:grow">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent asChild value="basic">
              <BasicAUX auxValues={aux ?? []} setAux={setAuxValue} />
            </TabsContent>
            <TabsContent asChild value="advanced">
              <AdvancedAUX
                auxValues={aux ?? []}
                setAux={setAuxValue}
                onReset={resetAux}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
})

type AuxParams = {
  auxValues: typeof initialAux
  setAux: (index: AuxIndex, value: number) => void
}

function BasicAUX(props: AuxParams) {
  return (
    <ScrollArea className="-m-2 mt-0">
      <div className="flex flex-col gap-y-2 p-2 *:grid *:grid-cols-[1fr_auto_1fr] *:whitespace-nowrap">
        <AuxToggle {...props} auxIndex={0}>
          <div className="flex gap-2 items-center">
            <Drone />
            Arm
          </div>
        </AuxToggle>
        <AuxToggle {...props} auxIndex={1}>
          <div className="flex gap-2 items-center">
            <FlipVertical2 />
            Angle mode
          </div>
        </AuxToggle>
        <AuxToggle {...props} auxIndex={3}>
          <div className="flex gap-2 items-center">
            <LifeBuoy className="inline" />
            GPS rescue
          </div>
        </AuxToggle>
      </div>
    </ScrollArea>
  )
}

type AuxToggleProps = PropsWithChildren<
  AuxParams & {
    auxIndex: AuxIndex
  }
>

function AuxToggle({ auxIndex, auxValues, setAux, children }: AuxToggleProps) {
  const toggled = AuxToggle.isToggled(auxValues[auxIndex].value)
  return (
    <Toggle
      variant="outline"
      size="default"
      pressed={toggled}
      onPressedChange={(pressed) => {
        setAux(auxIndex, pressed ? 90.66 : 9.349593495934959)
      }}
    >
      <CheckIndicator checked={toggled} />
      {children}
    </Toggle>
  )
}

AuxToggle.isToggled = (value: number) => Math.abs(value - 90.66) < 0.1

const CheckIndicator = ({ checked }: { checked: boolean }) => (
  <Check
    className={cn(
      "transition-[opacity,scale]",
      checked ? "opacity-200 scale-100" : "opacity-0 scale-50",
    )}
  />
)

function AdvancedAUX({
  auxValues,
  setAux,
  onReset,
}: AuxParams & { onReset: () => NodeJS.Timeout[] }) {
  const canReset = auxValues.some(
    (aux, index) => aux.value !== initialAux[index].value,
  )

  return (
    <ScrollArea className="pr-2 pb-2 -m-2 mt-0 overflow-hidden">
      <div className="p-2 flex flex-col gap-y-4">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          disabled={!canReset}
        >
          <RefreshCcw />
          Reset
        </Button>
        {Array.from({ length: AUX_CHANNELS_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex flex-col items-start gap-y-2 pointer-events-auto mt-auto"
          >
            <Label>
              <span className="text-muted-foreground align-middle">
                AUX&nbsp;{index + 1}:
              </span>
              &nbsp;
              <strong className="align-middle">
                {new Intl.NumberFormat("en-US", {
                  maximumFractionDigits: 2,
                }).format(auxValues[index].value)}
              </strong>
            </Label>
            <Slider
              className="w-full"
              value={[auxValues[index].value]}
              onValueChange={([value]) => setAux(index as AuxIndex, value)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

const initialAux = Array.from({ length: AUX_CHANNELS_COUNT }, () => ({
  value: 50,
}))
