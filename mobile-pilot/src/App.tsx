// @deno-types="@types/react"
import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Mobile Pilot</h1>
        <div className="space-y-4">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Count is {count}
          </button>
          <p className="text-muted-foreground">
            Edit{" "}
            <code className="font-mono bg-muted px-1 rounded">src/App.tsx</code>{" "}
            and save to test HMR
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
