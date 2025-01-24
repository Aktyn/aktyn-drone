/* eslint-disable @typescript-eslint/naming-convention */
import { MessageType } from "@aktyn-drone/common"
import { CircleCheck, RefreshCcw } from "lucide-react"
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
import { Slider } from "~/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Toggle } from "~/components/ui/toggle"
import { useGlobalState } from "~/hooks/useGlobalState"
import { useStateToRef } from "~/hooks/useStateToRef"
import { AUX_CHANNELS_COUNT } from "~/lib/consts"
import { cn } from "~/lib/utils"
import { useConnection } from "~/providers/connection-provider"

export const AUXPanel = memo(() => {
  const { send, isConnected } = useConnection()

  const [tab, setTab] = useState("basic")
  const [aux, setAux] = useGlobalState("aux", initialAux)

  const setAuxValue = useCallback(
    (index: number, value: number) => {
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
      setTimeout(() => {
        if (!auxRef.current) {
          return
        }
        send({
          type: MessageType.SET_AUX,
          data: { auxIndex: index, value: auxRef.current[index].value },
        })
      }, index * 100),
    )

    return timeouts
  }, [auxRef, send, setAux])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    const timeouts = resetAux()
    return () => timeouts.forEach((timeout) => clearTimeout(timeout))
  }, [isConnected, resetAux])

  return (
    <div className="flex-grow flex flex-col gap-y-2 w-full overflow-hidden -mb-2">
      <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
        <TabsList className="w-full *:flex-1">
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
  )
})

type AuxParams = {
  auxValues: typeof initialAux
  setAux: (index: number, value: number) => void
}

function BasicAUX(props: AuxParams) {
  return (
    <ScrollArea>
      <div className="flex flex-col gap-y-2 p-2 *:grid *:grid-cols-[1fr_auto_1fr] *:whitespace-nowrap">
        <AuxToggle {...props} auxIndex={0}>
          Arm
        </AuxToggle>
        <AuxToggle {...props} auxIndex={1}>
          Angle mode
        </AuxToggle>
        <AuxToggle {...props} auxIndex={3}>
          GPS rescue
        </AuxToggle>
      </div>
    </ScrollArea>
  )
}

type AuxToggleProps = PropsWithChildren<
  AuxParams & {
    auxIndex: number
  }
>

function AuxToggle({ auxIndex, auxValues, setAux, children }: AuxToggleProps) {
  const toggled = Math.abs(auxValues[auxIndex].value - 90.66) < 0.1
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

const CheckIndicator = ({ checked }: { checked: boolean }) => (
  <CircleCheck
    className={cn(
      "transition-[opacity,transform]",
      !checked && "opacity-0 scale-50",
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
    <ScrollArea className="pr-2 pb-2">
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
              onValueChange={([value]) => setAux(index, value)}
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
