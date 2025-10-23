import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Tooltip } from "bootstrap"; 

function App() {
  const [count, setCount] = useState(0)

   useEffect(() => {
  // delegación global
  const delegated = new Tooltip(document.body, {
    selector: '[data-bs-toggle="tooltip"]',
    trigger: 'hover focus',
    container: 'body',
    boundary: 'window',
    delay: { show: 120, hide: 0 },
  });

  return () => delegated.dispose();
}, []);
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
         <button onClick={() => setCount((count) => count - 1)}>
          restar {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
