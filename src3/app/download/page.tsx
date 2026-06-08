"use client";

export default function DownloadPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem",
    }}>
      {/* Logo area */}
      <div style={{
        fontSize: "2.5rem",
        fontWeight: 800,
        color: "#d4af37",
        letterSpacing: "0.15em",
        marginBottom: "0.5rem",
        textTransform: "uppercase",
      }}>
        3 BOXES LUXURY
      </div>

      <div style={{
        fontSize: "1.2rem",
        color: "#94a3b8",
        marginBottom: "2rem",
        letterSpacing: "0.05em",
      }}>
        Downloads
      </div>

      {/* Cards container */}
      <div style={{
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: "800px",
      }}>
        {/* PDF Card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: "16px",
          padding: "2rem 2.5rem",
          textAlign: "center",
          width: "320px",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.8rem" }}>
            📄
          </div>
          <h1 style={{
            fontSize: "1.3rem",
            color: "#f8fafc",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}>
            Changes Log Document
          </h1>
          <p style={{
            color: "#94a3b8",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}>
            15 changes documented with problem, fix & files. 6 pages | PDF
          </p>

          <a
            href="/3boxes-luxury-changes-log.pdf"
            download="3boxes-luxury-changes-log.pdf"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #d4af37, #b8962e)",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "1rem",
              padding: "12px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              letterSpacing: "0.05em",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            }}
          >
            DOWNLOAD PDF
          </a>
        </div>

        {/* BUGS.md Card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: "16px",
          padding: "2rem 2.5rem",
          textAlign: "center",
          width: "320px",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.8rem" }}>
            🐛
          </div>
          <h1 style={{
            fontSize: "1.3rem",
            color: "#f8fafc",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}>
            BUGS.md Quick Reference
          </h1>
          <p style={{
            color: "#94a3b8",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}>
            All 15 bugs with fixes & code patterns. Say &quot;Fix bugs from BUGS.md&quot;
          </p>

          <a
            href="/BUGS.md"
            download="BUGS.md"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #d4af37, #b8962e)",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "1rem",
              padding: "12px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              letterSpacing: "0.05em",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            }}
          >
            DOWNLOAD BUGS.MD
          </a>
        </div>
      </div>

      <div style={{
        color: "#64748b",
        fontSize: "0.8rem",
        marginTop: "2rem",
      }}>
        3 BOXES LUXURY &middot; June 2025
      </div>
    </div>
  );
}
