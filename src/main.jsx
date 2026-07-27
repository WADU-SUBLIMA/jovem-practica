import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("JOVEM Práctica — error no capturado:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "40px auto", padding: 24, color: "#16241C" }}>
          <h1 style={{ color: "#D64550", fontSize: 20 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#4B5D53" }}>
            La aplicación no pudo cargar. Este es el detalle técnico para reportarlo:
          </p>
          <pre style={{ background: "#FBE4E6", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
