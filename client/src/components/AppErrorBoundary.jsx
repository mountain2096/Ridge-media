import { Component } from "react";

class AppErrorBoundary extends Component {
  state = { error: null, componentStack: "" };

  componentDidMount() {
    window.addEventListener("error", this.handleRuntimeError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleRuntimeError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Ridge render failed:", error, info.componentStack);
    this.setState({ componentStack: info.componentStack || "" });
  }

  handleRuntimeError = (event) => {
    this.setState((state) => state.error ? null : {
      error: event.error || new Error(event.message || "Lỗi JavaScript khi chạy ứng dụng."),
    });
  };

  handleUnhandledRejection = (event) => {
    this.setState((state) => state.error ? null : {
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Promise bị từ chối.")),
    });
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f4f5f9",
          color: "#0f172a",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <section style={{ width: "min(620px, 100%)", padding: "28px", border: "1px solid #e6e8ef", borderRadius: "16px", background: "#fff", boxShadow: "0 8px 28px rgb(15 23 42 / 8%)" }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "22px" }}>Ridge không thể hiển thị trang này</h1>
          <p style={{ margin: "0 0 16px", color: "#5b6478", lineHeight: 1.5 }}>
            Đã xảy ra lỗi khi dựng giao diện. Tải lại trang để thử lại; nếu lỗi tiếp tục, gửi nội dung bên dưới cho nhóm phát triển.
          </p>
          <pre style={{ overflowX: "auto", margin: "0 0 18px", padding: "12px", borderRadius: "8px", background: "#f8f9fc", color: "#b42318", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {error.message || String(error)}
          </pre>
          {componentStack && (
            <details style={{ marginBottom: "18px", color: "#5b6478" }}>
              <summary>Chi tiết kỹ thuật</summary>
              <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{componentStack}</pre>
            </details>
          )}
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: "44px", padding: "0 18px", border: 0, borderRadius: "10px", background: "#2f4be0", color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" }}>
            Tải lại trang
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
