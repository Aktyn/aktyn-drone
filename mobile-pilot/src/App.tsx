import "./App.css";
// @deno-types="@types/react"
import { useEffect, useState } from "react";
// @ts-expect-error Unable to infer type at the moment
import reactLogo from "./assets/react.svg";
import { clamp } from "@aktyn-drone/common";

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("TEST", clamp(5, 7, 9)); //TODO
  }, []);

  return (
    <>
      <img src="/vite-deno.svg" alt="Vite with Deno" />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
