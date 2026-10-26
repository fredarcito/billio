import { ImageResponse } from "next/og";

// Icono de Apple (iOS no admite SVG): la "B" sobre el azul primario
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b6ae0",
          color: "#ffffff",
          fontSize: 120,
          fontWeight: 700,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        B
      </div>
    ),
    size
  );
}
