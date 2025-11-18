import "./App.css";
import { Editor } from "./Editor";

function App() {
  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Rust-powered editor</p>
        <h1>Editor with Ropey + Cursor + Selection</h1>
        <p className="intro">
          Text buffer, cursor position, and selection state all live in Rust.
          The frontend uses contentEditable and intercepts keyboard events to send commands to Rust.
        </p>
      </header>

      <Editor />
    </main>
  );
}

export default App;
